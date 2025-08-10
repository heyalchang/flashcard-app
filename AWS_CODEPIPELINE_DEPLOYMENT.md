# AWS CodePipeline Deployment Guide

This guide covers deploying the flashcard app using AWS CodePipeline, CodeBuild, and CodeDeploy - a fully AWS-native CI/CD solution.

## Overview

This approach uses:
- **AWS CodePipeline**: Orchestrates the CI/CD workflow
- **AWS CodeBuild**: Builds your application
- **AWS CodeDeploy**: Deploys to EC2 instances
- **GitHub**: Source repository (connected via webhook)
- **EC2 + ALB**: Hosts the application with load balancing

## Architecture

```
GitHub Repo → CodePipeline → CodeBuild → CodeDeploy → EC2 Instance(s)
                                                           ↓
                                                    Application Load Balancer
                                                           ↓
                                                         Users
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** with your code
3. **GitHub Personal Access Token** (Settings → Developer settings → Personal access tokens)
   - Required scope: `repo` (full control of private repositories)
4. **AWS CLI** installed and configured

## Step 1: Prepare Your Repository

Ensure these files exist in your repository root:

✅ **buildspec.yml** - Defines build process for CodeBuild
✅ **appspec.yml** - Defines deployment process for CodeDeploy  
✅ **scripts/** folder - Contains deployment scripts:
  - `stop_application.sh`
  - `install_dependencies.sh`
  - `start_application.sh`
  - `validate_service.sh`

These files have already been created in your repository.

## Step 2: Run the Setup Script

Execute the provided setup script to create all AWS resources:

```bash
chmod +x aws-codepipeline-setup.sh
./aws-codepipeline-setup.sh
```

The script will:
1. Prompt for your GitHub details
2. Create S3 bucket for build artifacts
3. Set up IAM roles for services
4. Create or configure EC2 instance with CodeDeploy agent
5. Create CodeBuild project
6. Create CodeDeploy application
7. Create CodePipeline to orchestrate everything

## Step 3: Configure Environment Variables

### Option A: In CodeBuild (Recommended)

1. Go to AWS CodeBuild Console
2. Select your project (`flashcard-app-build`)
3. Click "Edit" → "Environment"
4. Add environment variables:
   ```
   REACT_APP_WS_URL = wss://your-alb-dns
   REACT_APP_API_URL = https://your-alb-dns
   REACT_APP_PIPECAT_ROOM_URL = your-pipecat-room-url
   REACT_APP_PIPECAT_AGENT_URL = https://api.pipecat.cloud
   REACT_APP_PIPECAT_API_KEY = your-pipecat-api-key
   ```

### Option B: In buildspec.yml

Update the buildspec.yml file:

```yaml
phases:
  build:
    commands:
      - echo Building React app with environment variables...
      - export REACT_APP_WS_URL=wss://your-alb-dns
      - export REACT_APP_API_URL=https://your-alb-dns
      - npm run build
```

## Step 4: Create Application Load Balancer

Run the ALB setup from the original script:

```bash
# Extract relevant parts from aws-setup.sh
./aws-setup.sh  # Run steps 5-7 only (ALB creation)
```

Or manually create through AWS Console:
1. EC2 → Load Balancers → Create Load Balancer
2. Choose Application Load Balancer
3. Configure:
   - Scheme: Internet-facing
   - Listeners: HTTP (80), HTTPS (443)
   - Target Group: HTTP on port 8080
   - Register your EC2 instance(s)

## Step 5: Configure WebSocket Support

Update ALB for WebSocket compatibility:

```bash
# Enable sticky sessions
aws elbv2 modify-target-group-attributes \
  --target-group-arn <your-target-group-arn> \
  --attributes \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=lb_cookie
```

## Step 6: PipeCat Integration

Update your PipeCat configuration to use the ALB endpoint:

```python
# In your PipeCat bot configuration
webhook_url = "https://<your-alb-dns>/webhook"
```

## How It Works

1. **Push to GitHub** - Developer pushes code to master branch
2. **CodePipeline Triggered** - GitHub webhook notifies CodePipeline
3. **Source Stage** - CodePipeline pulls latest code from GitHub
4. **Build Stage** - CodeBuild runs `buildspec.yml`:
   - Installs dependencies
   - Builds server (TypeScript)
   - Builds React app
   - Creates deployment artifact
5. **Deploy Stage** - CodeDeploy runs `appspec.yml`:
   - Stops current application
   - Copies new files
   - Installs dependencies
   - Starts application
   - Validates deployment

## Monitoring

### CodePipeline Dashboard
```
https://console.aws.amazon.com/codesuite/codepipeline/pipelines
```

View pipeline status, history, and logs.

### CloudWatch Logs
- CodeBuild logs: `/aws/codebuild/flashcard-app-build`
- CodeDeploy logs: `/aws/codedeploy/flashcard-app`
- Application logs: SSH to EC2 and check `/var/log/flashcard-app.log`

### Application Health
```bash
# Check application status
curl http://<ec2-ip>:8080/health

# View application logs
ssh -i flashcard-app-key.pem ec2-user@<ec2-ip>
sudo tail -f /var/log/flashcard-app.log
```

## Troubleshooting

### Pipeline Failed at Build Stage
- Check CodeBuild logs in CloudWatch
- Verify buildspec.yml syntax
- Ensure all dependencies are in package.json

### Pipeline Failed at Deploy Stage
- Check CodeDeploy logs
- Verify EC2 instance has CodeDeploy agent running:
  ```bash
  sudo service codedeploy-agent status
  ```
- Check deployment scripts have execute permissions

### WebSocket Connection Issues
- Verify ALB listener rules
- Check security groups allow WebSocket traffic
- Ensure sticky sessions are enabled

### Application Not Starting
- SSH to EC2 instance
- Check systemd service status:
  ```bash
  sudo systemctl status flashcard-app
  sudo journalctl -u flashcard-app -n 50
  ```

## Cost Breakdown

### Monthly Estimates:
- **CodePipeline**: $1 per active pipeline
- **CodeBuild**: ~$1-5 (depends on build frequency)
- **CodeDeploy**: Free for EC2 deployments
- **S3 (artifacts)**: ~$1-2
- **EC2 t3.small**: ~$15-20
- **ALB**: ~$20-25
- **Total**: ~$40-55/month

## Advantages Over GitHub Actions

1. **Native AWS Integration**: No need for AWS credentials in GitHub
2. **Better Security**: IAM roles instead of access keys
3. **Unified Console**: All CI/CD in AWS Console
4. **Cost Visibility**: See all costs in AWS billing
5. **VPC Integration**: Can deploy to private subnets
6. **AWS Support**: Get help from AWS support team

## Rollback Strategy

If deployment fails:

1. **Automatic Rollback**: CodeDeploy can auto-rollback on failures
2. **Manual Rollback**: 
   ```bash
   aws deploy stop-deployment --deployment-id <deployment-id> --auto-rollback-enabled
   ```
3. **Previous Version**: CodePipeline keeps previous artifacts in S3

## Scaling

To add more EC2 instances:

1. Launch new EC2 instances with same configuration
2. Install CodeDeploy agent
3. Tag instances with same tags
4. Register with target group:
   ```bash
   aws elbv2 register-targets \
     --target-group-arn <arn> \
     --targets Id=<new-instance-id>
   ```

## Summary

AWS CodePipeline provides a robust, fully-managed CI/CD solution that:
- ✅ Automatically deploys on GitHub push
- ✅ No GitHub Actions or external CI needed
- ✅ Native AWS integration
- ✅ Built-in monitoring and logging
- ✅ Supports WebSocket and PipeCat
- ✅ Easy rollback capabilities
- ✅ Scales with your needs

The pipeline is now ready to automatically deploy your application whenever you push to the master branch!
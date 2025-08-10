# Deployment Guide for Flashcard App

This guide covers deploying the flashcard app to AWS EC2 with GitHub Actions CI/CD, Application Load Balancer, and PipeCat integration.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** with your flashcard app code
3. **AWS CLI** installed and configured
4. **Domain name** (optional, for SSL/HTTPS)
5. **PipeCat API credentials** (for voice mode integration)

## RECOMMENDED: AWS EC2 + ALB + GitHub Actions

This deployment strategy provides:
- ✅ Full WebSocket support for real-time communication
- ✅ Automatic deployments on GitHub push
- ✅ Load balancing and high availability
- ✅ Seamless PipeCat cloud function integration
- ✅ SSL/HTTPS support
- ✅ Health monitoring and auto-recovery

### Architecture Overview

```
GitHub Repo → GitHub Actions → EC2 Instance(s) → Application Load Balancer → Users
                                       ↓
                              PipeCat Cloud Functions
```

## Step 1: Setup AWS Infrastructure

Run the provided setup script to create all necessary AWS resources:

```bash
chmod +x aws-setup.sh
./aws-setup.sh
```

This script will:
- Create an EC2 key pair for SSH access
- Setup security groups with proper rules
- Create an Application Load Balancer (ALB)
- Launch an EC2 instance with Node.js pre-installed
- Configure target groups and health checks
- Output all necessary configuration values

### Manual Setup Alternative

If you prefer manual setup through AWS Console:

1. **Create EC2 Instance:**
   - AMI: Amazon Linux 2
   - Instance Type: t3.small (or larger for production)
   - Security Group: Allow ports 22, 80, 443, 8080
   - Install Node.js 18 and Git

2. **Create Application Load Balancer:**
   - Type: Application
   - Scheme: Internet-facing
   - Listeners: HTTP (80), HTTPS (443)
   - Target Group: HTTP on port 8080
   - Health Check: /health endpoint

3. **Configure Security Groups:**
   ```
   Inbound Rules:
   - SSH (22) from your IP
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
   - Custom TCP (8080) from ALB security group
   ```

## Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

```
EC2_HOST: <your-ec2-public-ip>
EC2_USER: ec2-user
EC2_SSH_KEY: <contents-of-your-pem-file>
REACT_APP_WS_URL: wss://<your-alb-dns>
REACT_APP_API_URL: https://<your-alb-dns>
REACT_APP_PIPECAT_ROOM_URL: <your-pipecat-room-url>
REACT_APP_PIPECAT_AGENT_URL: https://api.pipecat.cloud
REACT_APP_PIPECAT_API_KEY: <your-pipecat-api-key>
```

## Step 3: Initial EC2 Setup

SSH into your EC2 instance and set up the application:

```bash
# SSH into the instance
ssh -i flashcard-app-key.pem ec2-user@<your-ec2-ip>

# Clone your repository
cd /home/ec2-user
git clone https://github.com/<your-username>/flashcard-app.git
cd flashcard-app

# Install dependencies
npm install
cd server && npm install && cd ..

# Build the application
cd server && npm run build && cd ..
npm run build

# Create systemd service
sudo tee /etc/systemd/system/flashcard-app.service << EOF
[Unit]
Description=Flashcard App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/flashcard-app
ExecStart=/usr/bin/node server/dist/server.production.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080
StandardOutput=append:/var/log/flashcard-app.log
StandardError=append:/var/log/flashcard-app.error.log

[Install]
WantedBy=multi-user.target
EOF

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable flashcard-app
sudo systemctl start flashcard-app

# Check status
sudo systemctl status flashcard-app
```

## Step 4: Configure ALB for WebSocket Support

The ALB needs special configuration to support WebSocket connections:

1. **Modify Target Group Attributes:**
```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn <your-target-group-arn> \
  --attributes \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=lb_cookie \
    Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

2. **Update ALB Listener Rules** (for WebSocket upgrade):
```bash
aws elbv2 create-rule \
  --listener-arn <your-listener-arn> \
  --conditions Field=http-header,HttpHeaderConfig={HeaderName=Upgrade,Values=[websocket]} \
  --priority 1 \
  --actions Type=forward,TargetGroupArn=<your-target-group-arn>
```

## Step 5: PipeCat Integration

PipeCat provides the voice AI capabilities. Configure it to work with your ALB:

### Update PipeCat Webhook URL

In your PipeCat bot configuration (bot.py or PipeCat dashboard):

```python
# Update the webhook URL to point to your ALB
webhook_url = "https://<your-alb-dns>/webhook"

# For local testing, you can use ngrok:
# webhook_url = "https://<ngrok-id>.ngrok.io/webhook"
```

### Configure Environment Variables

Update your frontend environment variables to use the ALB endpoints:

```bash
# .env.production
REACT_APP_WS_URL=wss://<your-alb-dns>
REACT_APP_API_URL=https://<your-alb-dns>
REACT_APP_PIPECAT_ROOM_URL=https://your-pipecat.daily.co/room
REACT_APP_PIPECAT_AGENT_URL=https://api.pipecat.cloud
REACT_APP_PIPECAT_API_KEY=<your-api-key>
```

### WebSocket Connection Flow

```
1. User connects to ALB (wss://your-domain.com)
2. ALB forwards WebSocket upgrade to EC2 instance
3. EC2 maintains persistent WebSocket connection
4. PipeCat sends webhooks to https://your-domain.com/webhook
5. Server broadcasts updates to all connected WebSocket clients
```

## Step 6: Enable Continuous Deployment

Once your infrastructure is set up, GitHub Actions will automatically deploy on push:

1. **Push to master/main branch** triggers deployment
2. **GitHub Actions** builds the application
3. **SSH deployment** to EC2 instance
4. **Automatic restart** of the application
5. **Health check** verification

### Manual Deployment

You can also trigger deployment manually:

```bash
# From GitHub Actions tab
Actions → Deploy to AWS EC2 → Run workflow
```

## Step 7: SSL/HTTPS Configuration

For production, you'll need SSL certificates for secure WebSocket (wss://) and HTTPS:

### Using AWS Certificate Manager (ACM)

1. **Request a certificate:**
```bash
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS \
  --subject-alternative-names "*.your-domain.com"
```

2. **Add certificate to ALB listener:**
```bash
aws elbv2 create-listener \
  --load-balancer-arn <your-alb-arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<your-certificate-arn> \
  --default-actions Type=forward,TargetGroupArn=<your-target-group-arn>
```

3. **Update security groups** to allow HTTPS (443)

### Using Let's Encrypt (Alternative)

If you don't have a domain or prefer free certificates:

```bash
# On EC2 instance
sudo yum install -y certbot
sudo certbot certonly --standalone -d your-domain.com
```

## Step 8: Monitoring and Maintenance

### CloudWatch Monitoring

Set up CloudWatch for monitoring:

```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu-usage \
  --alarm-description "Alarm when CPU exceeds 70%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=<your-instance-id>
```

### Application Logs

View application logs:

```bash
# SSH into EC2
ssh -i flashcard-app-key.pem ec2-user@<your-ec2-ip>

# View logs
sudo journalctl -u flashcard-app -f
sudo tail -f /var/log/flashcard-app.log
sudo tail -f /var/log/flashcard-app.error.log
```

### Health Monitoring

The ALB continuously monitors instance health via the `/health` endpoint:

```bash
# Check health status
curl https://<your-alb-dns>/health
```

## Post-Deployment Testing

1. **Test WebSocket connection:**
```bash
wscat -c wss://your-domain.com
```

2. **Test webhook endpoint:**
```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 42, "transcription": "forty-two"}'
```

3. **Test health endpoint:**
```bash
curl https://your-domain.com/health
```

4. **Test PipeCat integration:**
   - Open the app in browser
   - Start voice mode
   - Verify webhooks are received
   - Check WebSocket messages are broadcast

## Troubleshooting

### Common Issues and Solutions

**WebSocket Connection Failed:**
- Verify ALB listener rules for WebSocket upgrade
- Check security group allows traffic between ALB and EC2
- Ensure sticky sessions are enabled on target group
- Verify nginx/proxy passes upgrade headers

**GitHub Actions Deployment Failed:**
- Check SSH key is correctly added to GitHub secrets
- Verify EC2 instance security group allows SSH from GitHub Actions
- Ensure git repository is accessible from EC2

**PipeCat Webhooks Not Received:**
- Verify webhook URL in PipeCat configuration
- Check ALB DNS is accessible from internet
- Review server logs for webhook errors
- Test webhook endpoint manually with curl

**High Latency Issues:**
- Consider using CloudFront for static assets
- Enable ALB access logs to analyze traffic
- Scale EC2 instance type if needed
- Add more instances to target group for load distribution

## Cost Optimization

### Estimated Monthly Costs:
- **EC2 t3.small**: ~$15-20/month
- **Application Load Balancer**: ~$20-25/month
- **Data transfer**: ~$5-10/month (varies)
- **Total**: ~$40-55/month

### Cost Saving Tips:
1. Use Reserved Instances for 30-70% savings
2. Stop development instances when not in use
3. Use Spot Instances for non-critical environments
4. Enable S3 lifecycle policies for logs
5. Set up billing alerts in AWS

## Scaling Considerations

### Horizontal Scaling:
```bash
# Add more EC2 instances to target group
aws elbv2 register-targets \
  --target-group-arn <your-target-group-arn> \
  --targets Id=<new-instance-id>
```

### Auto Scaling Setup:
```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name flashcard-app-template \
  --version-description "Flashcard app auto-scaling template" \
  --launch-template-data file://launch-template.json

# Create auto-scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name flashcard-app-asg \
  --launch-template LaunchTemplateName=flashcard-app-template \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --target-group-arns <your-target-group-arn>
```

## Summary

This deployment strategy provides a robust, scalable solution with:
- ✅ Full WebSocket support for real-time features
- ✅ Automatic CI/CD via GitHub Actions
- ✅ Load balancing and high availability
- ✅ PipeCat integration for voice AI
- ✅ SSL/HTTPS support
- ✅ Monitoring and health checks
- ✅ Cost-effective at ~$40-55/month

The architecture ensures your flashcard app can handle production traffic while maintaining real-time capabilities and voice interactions through PipeCat.
#!/bin/bash

# AWS CodePipeline Setup Script for Flashcard App
# This script sets up CodePipeline, CodeBuild, and CodeDeploy for CI/CD

set -e

echo "🚀 Setting up AWS CodePipeline for Flashcard App"

# Configuration variables
REGION="us-east-1"
APP_NAME="flashcard-app"
GITHUB_OWNER="" # Will be prompted
GITHUB_REPO="" # Will be prompted
GITHUB_BRANCH="master"
GITHUB_TOKEN="" # Will be prompted
EC2_INSTANCE_ID="" # Will be prompted or created

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Prompt for GitHub details
echo -e "${YELLOW}Enter your GitHub username/organization:${NC}"
read GITHUB_OWNER
echo -e "${YELLOW}Enter your GitHub repository name:${NC}"
read GITHUB_REPO
echo -e "${YELLOW}Enter your GitHub personal access token (with repo scope):${NC}"
read -s GITHUB_TOKEN
echo -e "${YELLOW}Enter your EC2 instance ID (or press Enter to create new):${NC}"
read EC2_INSTANCE_ID

# Step 1: Create S3 bucket for artifacts
echo -e "${YELLOW}Creating S3 bucket for artifacts...${NC}"
BUCKET_NAME="${APP_NAME}-codepipeline-artifacts-$(date +%s)"
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
echo -e "${GREEN}✓ S3 bucket created: ${BUCKET_NAME}${NC}"

# Step 2: Create IAM roles
echo -e "${YELLOW}Creating IAM roles...${NC}"

# CodeBuild role
cat > codebuild-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

CODEBUILD_ROLE_ARN=$(aws iam create-role \
    --role-name ${APP_NAME}-codebuild-role \
    --assume-role-policy-document file://codebuild-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

aws iam attach-role-policy \
    --role-name ${APP_NAME}-codebuild-role \
    --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess

# CodeDeploy role
cat > codedeploy-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

CODEDEPLOY_ROLE_ARN=$(aws iam create-role \
    --role-name ${APP_NAME}-codedeploy-role \
    --assume-role-policy-document file://codedeploy-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

aws iam attach-role-policy \
    --role-name ${APP_NAME}-codedeploy-role \
    --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployRole

# CodePipeline role
cat > codepipeline-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

CODEPIPELINE_ROLE_ARN=$(aws iam create-role \
    --role-name ${APP_NAME}-codepipeline-role \
    --assume-role-policy-document file://codepipeline-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Create and attach CodePipeline policy
cat > codepipeline-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "codebuild:*",
        "codedeploy:*",
        "ec2:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name ${APP_NAME}-codepipeline-role \
    --policy-name ${APP_NAME}-codepipeline-policy \
    --policy-document file://codepipeline-policy.json

echo -e "${GREEN}✓ IAM roles created${NC}"

# Step 3: Create or setup EC2 instance
if [ -z "$EC2_INSTANCE_ID" ]; then
    echo -e "${YELLOW}Creating EC2 instance...${NC}"
    
    # Create key pair
    aws ec2 create-key-pair \
        --key-name ${APP_NAME}-key \
        --query 'KeyMaterial' \
        --output text > ${APP_NAME}-key.pem
    chmod 400 ${APP_NAME}-key.pem
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=is-default,Values=true" \
        --query "Vpcs[0].VpcId" \
        --output text)
    
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name ${APP_NAME}-sg \
        --description "Security group for ${APP_NAME}" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 8080 \
        --cidr 0.0.0.0/0
    
    # Create IAM role for EC2
    cat > ec2-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    aws iam create-role \
        --role-name ${APP_NAME}-ec2-role \
        --assume-role-policy-document file://ec2-trust-policy.json
    
    aws iam attach-role-policy \
        --role-name ${APP_NAME}-ec2-role \
        --policy-arn arn:aws:iam::aws:policy/AmazonEC2RoleforAWSCodeDeploy
    
    aws iam attach-role-policy \
        --role-name ${APP_NAME}-ec2-role \
        --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
    
    aws iam create-instance-profile \
        --instance-profile-name ${APP_NAME}-ec2-profile
    
    aws iam add-role-to-instance-profile \
        --instance-profile-name ${APP_NAME}-ec2-profile \
        --role-name ${APP_NAME}-ec2-role
    
    # Create user data script
    cat > user-data.sh << 'USERDATA'
#!/bin/bash
yum update -y
yum install -y ruby wget
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto
service codedeploy-agent start

# Install Node.js 18
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git
USERDATA
    
    # Launch EC2 instance
    EC2_INSTANCE_ID=$(aws ec2 run-instances \
        --image-id ami-0c02fb55731490381 \
        --instance-type t3.small \
        --key-name ${APP_NAME}-key \
        --security-group-ids $SG_ID \
        --iam-instance-profile Name=${APP_NAME}-ec2-profile \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${APP_NAME}-server}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo -e "${GREEN}✓ EC2 instance created: ${EC2_INSTANCE_ID}${NC}"
    
    # Wait for instance to be running
    aws ec2 wait instance-running --instance-ids $EC2_INSTANCE_ID
fi

# Step 4: Create CodeBuild project
echo -e "${YELLOW}Creating CodeBuild project...${NC}"

cat > codebuild-project.json << EOF
{
  "name": "${APP_NAME}-build",
  "source": {
    "type": "GITHUB",
    "location": "https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git",
    "auth": {
      "type": "OAUTH",
      "resource": "${GITHUB_TOKEN}"
    }
  },
  "artifacts": {
    "type": "S3",
    "location": "${BUCKET_NAME}"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:5.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "environmentVariables": [
      {
        "name": "NODE_ENV",
        "value": "production"
      }
    ]
  },
  "serviceRole": "${CODEBUILD_ROLE_ARN}"
}
EOF

aws codebuild create-project --cli-input-json file://codebuild-project.json
echo -e "${GREEN}✓ CodeBuild project created${NC}"

# Step 5: Create CodeDeploy application
echo -e "${YELLOW}Creating CodeDeploy application...${NC}"

aws deploy create-application \
    --application-name ${APP_NAME} \
    --compute-platform Server

aws deploy create-deployment-group \
    --application-name ${APP_NAME} \
    --deployment-group-name ${APP_NAME}-deployment-group \
    --deployment-config-name CodeDeployDefault.OneAtATime \
    --ec2-tag-filters Type=KEY_AND_VALUE,Key=Name,Value=${APP_NAME}-server \
    --service-role-arn ${CODEDEPLOY_ROLE_ARN}

echo -e "${GREEN}✓ CodeDeploy application created${NC}"

# Step 6: Store GitHub token in Secrets Manager
echo -e "${YELLOW}Storing GitHub token in Secrets Manager...${NC}"

SECRET_ARN=$(aws secretsmanager create-secret \
    --name ${APP_NAME}-github-token \
    --secret-string "{\"token\":\"${GITHUB_TOKEN}\"}" \
    --query 'ARN' \
    --output text)

echo -e "${GREEN}✓ GitHub token stored${NC}"

# Step 7: Create CodePipeline
echo -e "${YELLOW}Creating CodePipeline...${NC}"

cat > codepipeline.json << EOF
{
  "pipeline": {
    "name": "${APP_NAME}-pipeline",
    "roleArn": "${CODEPIPELINE_ROLE_ARN}",
    "artifactStore": {
      "type": "S3",
      "location": "${BUCKET_NAME}"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "Source",
            "actionTypeId": {
              "category": "Source",
              "owner": "ThirdParty",
              "provider": "GitHub",
              "version": "1"
            },
            "configuration": {
              "Owner": "${GITHUB_OWNER}",
              "Repo": "${GITHUB_REPO}",
              "Branch": "${GITHUB_BRANCH}",
              "OAuthToken": "${GITHUB_TOKEN}"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "Build",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "configuration": {
              "ProjectName": "${APP_NAME}-build"
            },
            "inputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Deploy",
        "actions": [
          {
            "name": "Deploy",
            "actionTypeId": {
              "category": "Deploy",
              "owner": "AWS",
              "provider": "CodeDeploy",
              "version": "1"
            },
            "configuration": {
              "ApplicationName": "${APP_NAME}",
              "DeploymentGroupName": "${APP_NAME}-deployment-group"
            },
            "inputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
EOF

aws codepipeline create-pipeline --cli-input-json file://codepipeline.json
echo -e "${GREEN}✓ CodePipeline created${NC}"

# Clean up temporary files
rm -f *.json user-data.sh

# Get EC2 public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $EC2_INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

# Output summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}AWS CodePipeline Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Pipeline Details:${NC}"
echo -e "Pipeline Name: ${APP_NAME}-pipeline"
echo -e "CodeBuild Project: ${APP_NAME}-build"
echo -e "CodeDeploy Application: ${APP_NAME}"
echo -e "S3 Artifacts Bucket: ${BUCKET_NAME}"
echo -e "\n${YELLOW}EC2 Instance:${NC}"
echo -e "Instance ID: ${EC2_INSTANCE_ID}"
echo -e "Public IP: ${PUBLIC_IP}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Push code to GitHub to trigger the pipeline"
echo -e "2. Monitor pipeline at: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${APP_NAME}-pipeline"
echo -e "3. Access your app at: http://${PUBLIC_IP}:8080"
echo -e "\n${YELLOW}Important:${NC}"
echo -e "- Make sure buildspec.yml, appspec.yml, and scripts/ folder are in your repository"
echo -e "- The pipeline will automatically trigger on pushes to ${GITHUB_BRANCH} branch"
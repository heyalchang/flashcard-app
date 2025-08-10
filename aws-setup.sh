#!/bin/bash

# AWS EC2 and ALB Setup Script for Flashcard App
# This script sets up the AWS infrastructure needed for deployment

set -e

echo "🚀 Setting up AWS infrastructure for Flashcard App"

# Configuration variables
REGION="us-east-1"
INSTANCE_TYPE="t3.small"
KEY_NAME="flashcard-app-key"
SECURITY_GROUP_NAME="flashcard-app-sg"
ALB_NAME="flashcard-app-alb"
TARGET_GROUP_NAME="flashcard-app-tg"
VPC_ID=""  # Will be set by script
SUBNET_IDS=""  # Will be set by script

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

# Step 1: Create Key Pair
echo -e "${YELLOW}Creating EC2 Key Pair...${NC}"
aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --query 'KeyMaterial' \
    --output text > ${KEY_NAME}.pem
chmod 400 ${KEY_NAME}.pem
echo -e "${GREEN}✓ Key pair created and saved to ${KEY_NAME}.pem${NC}"

# Step 2: Get Default VPC
echo -e "${YELLOW}Getting default VPC...${NC}"
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=true" \
    --query "Vpcs[0].VpcId" \
    --output text)
echo -e "${GREEN}✓ Using VPC: $VPC_ID${NC}"

# Step 3: Get Subnets
echo -e "${YELLOW}Getting subnets...${NC}"
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[*].SubnetId" \
    --output text | tr '\t' ',')
echo -e "${GREEN}✓ Using subnets: $SUBNET_IDS${NC}"

# Step 4: Create Security Group
echo -e "${YELLOW}Creating security group...${NC}"
SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for Flashcard App" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Add security group rules
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
    --port 443 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8080 \
    --source-group $SG_ID

echo -e "${GREEN}✓ Security group created: $SG_ID${NC}"

# Step 5: Create Target Group
echo -e "${YELLOW}Creating target group...${NC}"
TG_ARN=$(aws elbv2 create-target-group \
    --name $TARGET_GROUP_NAME \
    --protocol HTTP \
    --port 8080 \
    --vpc-id $VPC_ID \
    --target-type instance \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
echo -e "${GREEN}✓ Target group created: $TG_ARN${NC}"

# Step 6: Create Application Load Balancer
echo -e "${YELLOW}Creating Application Load Balancer...${NC}"
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $(echo $SUBNET_IDS | tr ',' ' ') \
    --security-groups $SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo -e "${GREEN}✓ ALB created: $ALB_DNS${NC}"

# Step 7: Create ALB Listener
echo -e "${YELLOW}Creating ALB listener...${NC}"
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo -e "${GREEN}✓ Listener created${NC}"

# Step 8: Create EC2 User Data Script
cat > user-data.sh << 'EOF'
#!/bin/bash
# Update system
yum update -y

# Install Node.js 18
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
yum install -y nodejs git

# Install PM2 globally
npm install -g pm2

# Create app directory
mkdir -p /home/ec2-user/flashcard-app
cd /home/ec2-user/flashcard-app

# Clone repository (will be replaced with your repo)
# git clone https://github.com/YOUR_USERNAME/flashcard-app.git .

# Create systemd service
cat > /etc/systemd/system/flashcard-app.service << 'SERVICEEOF'
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
SERVICEEOF

systemctl daemon-reload
systemctl enable flashcard-app

# Setup CloudWatch agent (optional)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm
EOF

# Step 9: Launch EC2 Instance
echo -e "${YELLOW}Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55731490381 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --user-data file://user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=flashcard-app-server}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}✓ Instance launched: $INSTANCE_ID${NC}"

# Wait for instance to be running
echo -e "${YELLOW}Waiting for instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✓ Instance is running at: $PUBLIC_IP${NC}"

# Step 10: Register instance with target group
echo -e "${YELLOW}Registering instance with target group...${NC}"
aws elbv2 register-targets \
    --target-group-arn $TG_ARN \
    --targets Id=$INSTANCE_ID

echo -e "${GREEN}✓ Instance registered with target group${NC}"

# Step 11: Output configuration for GitHub Secrets
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}AWS Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Add these secrets to your GitHub repository:${NC}"
echo -e "EC2_HOST: ${PUBLIC_IP}"
echo -e "EC2_USER: ec2-user"
echo -e "EC2_SSH_KEY: (contents of ${KEY_NAME}.pem)"
echo -e "EC2_INSTANCE_ID: ${INSTANCE_ID}"
echo -e "REACT_APP_WS_URL: wss://${ALB_DNS}"
echo -e "REACT_APP_API_URL: https://${ALB_DNS}"
echo -e "\n${YELLOW}ALB DNS Name:${NC} ${ALB_DNS}"
echo -e "${YELLOW}EC2 Instance ID:${NC} ${INSTANCE_ID}"
echo -e "${YELLOW}Security Group ID:${NC} ${SG_ID}"
echo -e "${YELLOW}Target Group ARN:${NC} ${TG_ARN}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. SSH into the instance: ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo -e "2. Clone your repository on the EC2 instance"
echo -e "3. Configure SSL certificate for HTTPS (use AWS Certificate Manager)"
echo -e "4. Update PipeCat webhook URL to: https://${ALB_DNS}/webhook"

# Clean up
rm -f user-data.sh
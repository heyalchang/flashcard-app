#!/bin/bash

# Fix EC2 instance for CodeDeploy
INSTANCE_ID="i-08e0e722ad84e4895"

echo "Installing CodeDeploy agent on EC2 instance..."

# Create a script to install CodeDeploy agent
cat > /tmp/install-codedeploy.sh << 'EOF'
#!/bin/bash
sudo yum update -y
sudo yum install -y ruby wget

cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto

# Start the CodeDeploy agent
sudo service codedeploy-agent start
sudo service codedeploy-agent status
EOF

# Send the command to EC2 instance
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=$(cat /tmp/install-codedeploy.sh)" \
    --output json

echo "CodeDeploy agent installation initiated"
echo "Wait 30 seconds then trigger pipeline again"
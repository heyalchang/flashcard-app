#!/bin/bash

# Start the Node.js application with production configuration
cd /home/ec2-user/flashcard-app

# Set environment to production
export NODE_ENV=production

# Set port for AWS deployment
export PORT=8080

# Get ALB URL if available (can be set via user data or EC2 tags)
export ALB_URL=$(aws ec2 describe-tags --filters "Name=resource-id,Values=$(ec2-metadata --instance-id | cut -d " " -f 2)" "Name=key,Values=ALB_URL" --query 'Tags[0].Value' --output text 2>/dev/null || echo "")

# Load secrets from AWS Secrets Manager
# The application will handle this internally, but we can also export them here
export AWS_REGION=us-east-1

# Create systemd service file with configuration
sudo cat > /etc/systemd/system/flashcard-app.service << EOF
[Unit]
Description=Flashcard App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/flashcard-app
Environment="NODE_ENV=production"
Environment="PORT=8080"
Environment="AWS_REGION=us-east-1"
Environment="ALB_URL=${ALB_URL}"
ExecStart=/home/ec2-user/.nvm/versions/node/v16.20.2/bin/node server/dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/flashcard-app/app.log
StandardError=append:/var/log/flashcard-app/error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/flashcard-app
sudo chown ec2-user:ec2-user /var/log/flashcard-app

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable flashcard-app
sudo systemctl restart flashcard-app

# Wait for service to start
sleep 5

# Check service status
sudo systemctl status flashcard-app --no-pager

# Check if the application is running on port 8080
if sudo lsof -i:8080 | grep LISTEN; then
    echo "Application successfully started on port 8080"
else
    echo "ERROR: Application failed to start on port 8080"
    sudo journalctl -u flashcard-app -n 50 --no-pager
    exit 1
fi
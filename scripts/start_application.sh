#!/bin/bash
echo "Starting flashcard-app service..."

# Change to app directory
cd /home/ec2-user/flashcard-app

# Ensure the built files exist
if [ ! -f "/home/ec2-user/flashcard-app/server/dist/server.js" ]; then
    echo "Error: server/dist/server.js not found!"
    echo "Contents of server/dist:"
    ls -la /home/ec2-user/flashcard-app/server/dist/
    exit 1
fi

# Ensure React build exists
if [ ! -d "/home/ec2-user/flashcard-app/build" ]; then
    echo "Error: React build directory not found!"
    echo "Contents of app directory:"
    ls -la /home/ec2-user/flashcard-app/
    exit 1
fi

# Get EC2 public IP for webhook URL
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

# Create or update systemd service
sudo cat > /etc/systemd/system/flashcard-app.service << EOF
[Unit]
Description=Flashcard App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/flashcard-app
ExecStart=/home/ec2-user/.nvm/versions/node/v16.20.2/bin/node server/dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=WEBHOOK_URL=http://${EC2_PUBLIC_IP}:8080/webhook
StandardOutput=append:/var/log/flashcard-app.log
StandardError=append:/var/log/flashcard-app.error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log directory if it doesn't exist
sudo mkdir -p /var/log
sudo touch /var/log/flashcard-app.log
sudo touch /var/log/flashcard-app.error.log
sudo chown ec2-user:ec2-user /var/log/flashcard-app*.log

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable flashcard-app
sudo systemctl restart flashcard-app

# Wait for service to start
sleep 3

# Check if service is running
if sudo systemctl is-active --quiet flashcard-app; then
    echo "Application started successfully"
    echo "Service status:"
    sudo systemctl status flashcard-app --no-pager
else
    echo "Failed to start application"
    echo "Service status:"
    sudo systemctl status flashcard-app --no-pager
    echo "Recent logs:"
    sudo journalctl -u flashcard-app -n 50 --no-pager
    exit 1
fi
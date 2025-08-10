#!/bin/bash
echo "Starting flashcard-app service..."

# Create or update systemd service
cat > /etc/systemd/system/flashcard-app.service << EOF
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

# Reload systemd and start service
systemctl daemon-reload
systemctl enable flashcard-app
systemctl start flashcard-app

echo "Application started"
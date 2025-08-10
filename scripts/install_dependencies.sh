#!/bin/bash
cd /home/ec2-user/flashcard-app

echo "Setting up application..."

# The dependencies are already included in the artifact from CodeBuild
# Just ensure correct permissions
chmod +x scripts/*.sh

# Create necessary directories if they don't exist
mkdir -p /var/log

echo "Application setup completed"
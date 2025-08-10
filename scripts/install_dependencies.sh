#!/bin/bash
cd /home/ec2-user/flashcard-app

echo "Installing Node.js dependencies..."

# Install root dependencies
npm ci --production

# Install server dependencies
cd server
npm ci --production
cd ..

# Ensure correct permissions
chmod +x scripts/*.sh

echo "Dependencies installed successfully"
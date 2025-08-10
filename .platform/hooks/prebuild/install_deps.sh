#!/bin/bash
# Install server dependencies and build TypeScript
echo "Installing server dependencies..."
cd /var/app/staging/server
npm install

echo "Building TypeScript server..."
npm run build

echo "Server build complete"
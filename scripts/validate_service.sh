#!/bin/bash
echo "Validating service..."

# Wait for service to be ready
sleep 5

# Check if service is running
if ! systemctl is-active --quiet flashcard-app; then
    echo "Service is not running"
    exit 1
fi

# Check health endpoint
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed"
    exit 1
fi
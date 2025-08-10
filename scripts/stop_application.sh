#!/bin/bash
echo "Stopping flashcard-app service..."

# Stop the application if it's running
if systemctl is-active --quiet flashcard-app; then
    systemctl stop flashcard-app
    echo "Application stopped"
else
    echo "Application was not running"
fi

# Clean up any orphaned node processes
pkill -f "node.*server.production.js" || true

exit 0
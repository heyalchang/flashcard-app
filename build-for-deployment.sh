#!/bin/bash
set -e

echo "🚀 Building Flashcard App for Deployment"
echo "========================================"

# Build frontend
echo "📦 Building React frontend..."
npm install
npm run build
echo "✅ Frontend build complete"

# Build backend
echo "📦 Building Express backend..."
cd server
npm install
npm run build:production
cd ..
echo "✅ Backend build complete"

echo ""
echo "🎉 Build complete! Ready for deployment."
echo ""
echo "Next steps:"
echo "1. For Elastic Beanstalk: run 'eb deploy'"
echo "2. For Railway: push to GitHub"
echo "3. For Vercel: run 'vercel --prod'"
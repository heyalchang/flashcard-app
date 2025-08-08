# Deployment Guide for Flashcard App

This guide covers deploying the flashcard app to three different platforms.

## Prerequisites

1. Build the React app first:
```bash
npm run build
```

2. Build the server TypeScript:
```bash
cd server
npm run build
cd ..
```

## Option 1: AWS Elastic Beanstalk (Recommended for WebSockets)

### Setup Steps:

1. **Install EB CLI:**
```bash
brew install awsebcli
```

2. **Initialize Elastic Beanstalk:**
```bash
eb init -p node.js-18 flashcard-app
```

3. **Create environment:**
```bash
eb create flashcard-production --instance-type t3.small
```

4. **Set environment variables:**
```bash
eb setenv NODE_ENV=production PORT=8080
```

5. **Deploy:**
```bash
eb deploy
```

6. **Get your URL:**
```bash
eb open
```

### Files Required:
- `.ebextensions/websocket.config` (already created)
- `server/src/server.production.ts` (already created)

### Cost: ~$20-40/month

---

## Option 2: Vercel (Frontend) + Railway (Backend)

### Part A: Deploy Frontend to Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy frontend:**
```bash
vercel
```

3. **Set environment variables in Vercel dashboard:**
   - `REACT_APP_WS_URL`: Your Railway WebSocket URL
   - `REACT_APP_API_URL`: Your Railway API URL

### Part B: Deploy Backend to Railway

1. **Connect GitHub repo to Railway**
2. **Set environment variables:**
   - `PORT`: 8080
   - `NODE_ENV`: production
3. **Deploy automatically on push**

### Files Required:
- `vercel.json` (already created)
- `railway.json` (already created)

### Cost: ~$10-15/month total

---

## Option 3: AWS EC2 with Docker

### Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci

# Copy and install frontend dependencies
COPY package*.json ./
RUN npm ci

# Build server
COPY server ./server
RUN cd server && npm run build

# Build frontend
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

COPY --from=0 /app/server/dist ./server/dist
COPY --from=0 /app/server/node_modules ./server/node_modules
COPY --from=0 /app/build ./build

EXPOSE 8080

CMD ["node", "server/dist/server.production.js"]
```

### Deploy:
```bash
# Build Docker image
docker build -t flashcard-app .

# Run locally to test
docker run -p 8080:8080 flashcard-app

# Push to ECR and deploy to EC2/ECS
```

### Cost: ~$10-50/month depending on instance

---

## Option 4: AWS Amplify (Limited - No WebSocket)

**⚠️ WARNING: Amplify doesn't support WebSocket servers!**

You'd need to:
1. Deploy frontend to Amplify
2. Deploy backend separately (Lambda + API Gateway WebSocket)
3. Much more complex setup

### Alternative Architecture for Amplify:
- Use AWS IoT Core for real-time messaging
- Or use AppSync subscriptions
- Or deploy backend separately on EC2/ECS

---

## Environment Variables Checklist

### Frontend (.env.production):
```
# Core Backend
REACT_APP_WS_URL=wss://your-domain.com
REACT_APP_API_URL=https://your-domain.com

# PipeCat Integration (Optional)
REACT_APP_PIPECAT_ROOM_URL=https://your-pipecat.daily.co/room
# OR for dynamic rooms:
REACT_APP_PIPECAT_AGENT_URL=https://api.pipecat.cloud
REACT_APP_PIPECAT_API_KEY=your-api-key
```

### Backend:
```
NODE_ENV=production
PORT=8080
```

### PipeCat Agent (bot.py):
```python
# Update webhook URL to match your deployment
webhook_url = "https://your-deployed-backend.com/webhook"
```

---

## Post-Deployment Testing

1. **Test WebSocket connection:**
```bash
wscat -c wss://your-domain.com
```

2. **Test webhook endpoint:**
```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 42}'
```

3. **Check health:**
```bash
curl https://your-domain.com/health
```

---

## Monitoring

### CloudWatch (AWS):
- Set up alarms for high CPU/memory
- Monitor WebSocket connections
- Track API response times

### Railway:
- Built-in metrics dashboard
- Automatic alerting

### Vercel:
- Real-time function logs
- Performance analytics

---

## Troubleshooting

### WebSocket Issues:
1. Check nginx/proxy configuration
2. Ensure upgrade headers are passed
3. Verify SSL certificates for wss://
4. Check firewall/security group rules

### CORS Issues:
1. Update server CORS configuration
2. Ensure API URL matches in frontend

### Build Issues:
1. Clear node_modules and reinstall
2. Check Node.js version compatibility
3. Verify all dependencies are installed

---

## Recommended Deployment

**For production with WebSockets:**
1. **Primary**: AWS Elastic Beanstalk
2. **Alternative**: Railway (full-stack)
3. **Budget**: EC2 with Docker

**For static frontend only:**
1. Vercel or Amplify (but need separate WebSocket solution)
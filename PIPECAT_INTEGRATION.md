# PipeCat Cloud Integration Guide

This guide explains how to integrate PipeCat Cloud voice agents with the Flashcard application.

## Architecture Overview

```
┌─────────────────────┐
│   User Browser      │
│                     │
│  ┌───────────────┐  │
│  │  Flashcard    │  │
│  │  React App    │  │
│  │               │  │
│  │  ┌─────────┐  │  │
│  │  │ Voice   │  │  │
│  │  │ Agent   │  │  │
│  │  │ iframe  │  │  │
│  │  └────┬────┘  │  │
│  └───────┼───────┘  │
└──────────┼──────────┘
           │
           ├─── WebRTC ──→ Daily.co Room
           │                    │
           │                    ↓
           │              PipeCat Agent
           │                    │
           │                    ↓
           │              Webhook POST
           │                    │
           ↓                    ↓
      WebSocket ←──── Flashcard Backend
```

## Setup Options

### Option 1: Local Development (Simplest)

1. **Start PipeCat Agent:**
```bash
cd ~/dev/pipecat-cloud-starter
pcc agents start my-first-agent --use-daily
# Copy the room URL it provides
```

2. **Configure Flashcard App:**
```bash
cd ~/dev/hooker/flashcard-app
cp .env.example .env
# Edit .env and set:
# REACT_APP_PIPECAT_ROOM_URL=<room-url-from-step-1>
```

3. **Start Flashcard App:**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm start
```

### Option 2: Deployed Integration

#### A. PipeCat on PipeCat Cloud + Flashcard on AWS

1. **Deploy PipeCat Agent:**
```bash
cd ~/dev/pipecat-cloud-starter
# Update pcc-deploy.toml with your settings
pcc deploy
```

2. **Update bot.py webhook URL:**
```python
# In bot.py, update the webhook URL to your deployed backend
webhook_url = "https://your-app.elasticbeanstalk.com/webhook"
```

3. **Deploy Flashcard App:**
```bash
cd ~/dev/hooker/flashcard-app
./build-for-deployment.sh
eb deploy
```

4. **Configure Environment Variables:**
```bash
# In AWS Elastic Beanstalk
eb setenv REACT_APP_PIPECAT_ROOM_URL=<your-pipecat-room-url>
```

#### B. Both on Same Platform (Railway)

1. **Single Repository Setup:**
```bash
# Create monorepo structure
flashcard-voice-app/
├── flashcard-app/     # Your existing flashcard app
├── pipecat-agent/     # Your PipeCat bot
└── railway.json       # Combined config
```

2. **Railway Configuration:**
```json
{
  "services": {
    "flashcard": {
      "build": {
        "builder": "NIXPACKS",
        "buildCommand": "cd flashcard-app && npm install && npm run build"
      },
      "deploy": {
        "startCommand": "cd flashcard-app && node server/dist/server.production.js"
      }
    },
    "pipecat": {
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "pipecat-agent/Dockerfile"
      }
    }
  }
}
```

## Environment Variables

### Development (.env)
```bash
# Flashcard Backend
REACT_APP_WS_URL=ws://localhost:3051
REACT_APP_API_URL=http://localhost:3051

# PipeCat Integration
REACT_APP_PIPECAT_ROOM_URL=https://xyz.daily.co/abc-room
```

### Production
```bash
# Flashcard Backend (your deployed URL)
REACT_APP_WS_URL=wss://flashcard-app.herokuapp.com
REACT_APP_API_URL=https://flashcard-app.herokuapp.com

# PipeCat Integration
REACT_APP_PIPECAT_ROOM_URL=https://your-pipecat-room.daily.co/room
# OR for dynamic rooms:
REACT_APP_PIPECAT_AGENT_URL=https://api.pipecat.cloud
REACT_APP_PIPECAT_API_KEY=your-api-key
```

## URL Configuration by Deployment

### Scenario 1: Everything Local
```
PipeCat Agent webhook_url: http://localhost:3051/webhook
Flashcard REACT_APP_API_URL: http://localhost:3051
Flashcard REACT_APP_PIPECAT_ROOM_URL: <daily-room-from-pcc>
```

### Scenario 2: PipeCat Cloud + AWS Elastic Beanstalk
```
PipeCat Agent webhook_url: https://flashcard.us-east-1.elasticbeanstalk.com/webhook
Flashcard REACT_APP_API_URL: https://flashcard.us-east-1.elasticbeanstalk.com
Flashcard REACT_APP_PIPECAT_ROOM_URL: https://pipecat.daily.co/your-room
```

### Scenario 3: PipeCat Cloud + Vercel/Railway Split
```
PipeCat Agent webhook_url: https://flashcard-backend.railway.app/webhook
Flashcard Frontend on Vercel:
  REACT_APP_API_URL: https://flashcard-backend.railway.app
  REACT_APP_WS_URL: wss://flashcard-backend.railway.app
  REACT_APP_PIPECAT_ROOM_URL: https://pipecat.daily.co/your-room
```

## Multi-User Support (Future)

For multiple concurrent users, you'll need:

1. **Dynamic Room Creation:**
```typescript
// In pipecatService.ts
async createUserSession(userId: string): Promise<AgentSession> {
  const response = await fetch(`${PIPECAT_API}/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      webhook_url: `${API_URL}/webhook/${userId}`,
      config: { /* agent config */ }
    })
  });
  return response.json();
}
```

2. **Session Management:**
```typescript
// Store session per user
const sessions = new Map<string, AgentSession>();
```

3. **Webhook Routing:**
```typescript
// In server.ts
app.post('/webhook/:userId', (req, res) => {
  const { userId } = req.params;
  // Route to specific user's WebSocket
  broadcastToUser(userId, req.body);
});
```

## Testing the Integration

1. **Verify PipeCat Connection:**
   - Open browser console
   - Look for "Voice Math Tutor" section in UI
   - Click "Join Voice Session"
   - Check for Daily.co iframe loading

2. **Test Voice Detection:**
   - Say a number like "forty-two"
   - Watch the webhook log in backend console
   - See answer appear in flashcard UI

3. **Debug Webhook Issues:**
```bash
# Monitor backend logs
cd server && npm run dev

# Test webhook manually
curl -X POST http://localhost:3051/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 42, "transcription": "forty two"}'
```

## Common Issues

### Issue: Voice agent not appearing
**Solution:** Check REACT_APP_PIPECAT_ROOM_URL is set in .env

### Issue: Webhook not receiving data
**Solution:** Verify webhook_url in bot.py matches your backend URL

### Issue: CORS errors with iframe
**Solution:** Daily.co handles CORS, but ensure you're using HTTPS in production

### Issue: WebSocket disconnections
**Solution:** Check firewall/proxy settings, especially on AWS

## Security Considerations

1. **API Keys:** Never commit API keys. Use environment variables.
2. **CORS:** Configure proper CORS headers in production
3. **Rate Limiting:** Add rate limiting to webhook endpoint
4. **Authentication:** For multi-user, implement proper auth

## Performance Optimization

1. **Lazy Load Voice Agent:**
```typescript
const VoiceAgent = React.lazy(() => import('./components/VoiceAgent'));
```

2. **Debounce Webhook:** Already implemented (900ms)

3. **Connection Pooling:** Reuse WebSocket connections

## Monitoring

1. **Frontend:** Check browser console for errors
2. **Backend:** Monitor server logs
3. **PipeCat:** Use PipeCat Cloud dashboard
4. **Daily.co:** Monitor room analytics

## Next Steps

1. Add user authentication
2. Implement session persistence
3. Add voice activity indicators
4. Create admin dashboard
5. Add analytics tracking
# Voice Mode Quick Start Guide

## Prerequisites

1. PipeCat Cloud API Key: `sk_d36c7f3e-015f-4a57-ac35-3b92c1892899`
2. PipeCat Agent deployed: `my-first-agent`
3. ngrok installed for local development

## Setup Steps

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Backend Environment

Create `server/.env`:
```bash
# PipeCat Configuration
PIPECAT_API_KEY=sk_d36c7f3e-015f-4a57-ac35-3b92c1892899
PIPECAT_AGENT_NAME=my-first-agent
PIPECAT_API_URL=https://api.pipecat.ai/v1

# For local development with ngrok
WEBHOOK_URL=https://your-ngrok-id.ngrok-free.app/webhook
```

### 3. Start ngrok

```bash
ngrok http 3051
```

Copy the HTTPS URL and update `WEBHOOK_URL` in `server/.env`

### 4. Update PipeCat Agent

Update your `bot.py` to use the ngrok webhook URL:
```bash
cd ~/dev/pipecat-cloud-starter
# Update WEBHOOK_URL in .env to match ngrok
pcc deploy
```

### 5. Start the Application

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
npm start
```

## Using Voice Mode

1. Click "🎤 Start Voice Mode" button
2. Wait for connection (minimal iframe appears)
3. Speak your answers to math problems
4. Say "goodbye" or click button to end
5. Session auto-ends after 10 minutes

## Features

- **Voice Activity Indicator**: Shows when you're speaking
- **Mute Button**: Toggle microphone on/off
- **Session Timer**: Shows remaining time (10 min max)
- **Goodbye Detection**: Say "goodbye" to end session
- **Minimal Iframe**: Shows Daily.co connection status

## Troubleshooting

### "PipeCat service not configured"
- Check `PIPECAT_API_KEY` in `server/.env`
- Restart backend after adding env vars

### Voice not connecting
- Check ngrok is running
- Verify webhook URL matches in bot.py
- Check browser microphone permissions

### Numbers not detected
- Speak clearly
- Say numbers like "forty-two" or "42"
- Check webhook is receiving POST requests

## Architecture

```
User Voice → Daily.co → PipeCat Agent → Webhook → Backend → WebSocket → Frontend
```

## Environment Variables Reference

### Backend (`server/.env`)
- `PIPECAT_API_KEY`: Your PipeCat Cloud API key
- `PIPECAT_AGENT_NAME`: Name of deployed agent
- `WEBHOOK_URL`: Public URL for webhooks (ngrok in dev)

### Frontend
- No API keys needed! All handled by backend

## Production Deployment

1. Deploy backend with stable URL
2. Update `WEBHOOK_URL` in PipeCat agent
3. Set `PIPECAT_API_KEY` in production env
4. Frontend automatically uses backend API

## Cost Considerations

- Each session spawns a PipeCat container
- Sessions auto-terminate after 10 minutes
- Always cleanup on app shutdown
- Monitor usage in PipeCat dashboard
# PipeCat Minimal Integration Guide

## The Truth About PipeCat Cloud

PipeCat Cloud is just a **room factory**. It has ONE endpoint:

```bash
POST https://api.pipecat.daily.co/v1/public/{agentName}/start
→ Returns: { dailyRoomUrl, dailyToken }
```

That's it. No sessions, no state, no management.

## Minimal Backend (40 lines)

```typescript
// server/src/pipecatServiceMinimal.ts
const sessions = new Map();

async function startVoice(userId) {
  // Already has session?
  if (sessions.has(userId)) {
    return sessions.get(userId);
  }
  
  // Get room from PipeCat
  const res = await fetch(
    `https://api.pipecat.daily.co/v1/public/${AGENT}/start`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ createDailyRoom: true })
    }
  );
  
  const { dailyRoomUrl, dailyToken } = await res.json();
  
  // Track with timeout
  const session = { roomUrl: dailyRoomUrl, token: dailyToken };
  sessions.set(userId, session);
  
  // Auto-expire (CRITICAL for cost)
  setTimeout(() => {
    sessions.delete(userId);
  }, 10 * 60 * 1000); // 10 minutes
  
  return session;
}
```

## Minimal Frontend (25 lines)

```typescript
// src/services/voiceServiceMinimal.ts
async function startVoice(iframe) {
  // Get room from backend
  const { roomUrl, token } = await fetch('/api/voice/session', {
    method: 'POST'
  }).then(r => r.json());
  
  // Load in iframe
  iframe.src = roomUrl;
  
  // Connect with Daily
  const daily = DailyIframe.wrap(iframe);
  await daily.join({ url: roomUrl, token });
  
  // Cleanup on disconnect
  daily.on('left-meeting', () => {
    iframe.remove();
  });
}
```

## Quick Start

### 1. Set Environment

```bash
# server/.env
PIPECAT_API_KEY=sk_d36c7f3e-015f-4a57-ac35-3b92c1892899
PIPECAT_AGENT_NAME=my-first-agent
WEBHOOK_URL=https://your-ngrok.ngrok.io/webhook
```

### 2. Run Minimal Version

```bash
# Backend (minimal)
cd server
npx ts-node src/serverMinimal.ts

# Frontend (with minimal component)
# Update App.tsx to import VoiceModeMinimal
npm start
```

### 3. That's It!

Click button → Get room → Connect → Talk → 10 min timeout → Done

## What This Doesn't Have

- ❌ Complex session management
- ❌ State synchronization
- ❌ Retry logic
- ❌ Session recovery
- ❌ PipeCat API calls beyond /start

## What This Does Have

- ✅ Voice connection (works)
- ✅ 10-minute timeout (cost control)
- ✅ Mute button (local only)
- ✅ Goodbye detection (via webhook)
- ✅ Emergency shutdown (nuclear option)

## Cost Control

**CRITICAL**: Without timeouts, each session costs ~$1.40/hour

```javascript
// Minimum viable cost control
setTimeout(() => {
  endSession();
}, 10 * 60 * 1000); // NEVER SKIP THIS
```

## Production Checklist

- [ ] API key in environment (not code)
- [ ] Timeout set (10 minutes max)
- [ ] Emergency shutdown endpoint
- [ ] Stable webhook URL
- [ ] Error handling (just "try again")

## Common Issues

**"PipeCat API error"**
- Check API key
- Check agent name exists

**"Webhook not working"**
- Check ngrok is running
- Check bot.py has correct WEBHOOK_URL

**"Voice not connecting"**
- Check browser allows microphone
- Check Daily iframe loaded

## The Philosophy

**Less code = fewer bugs**

Don't build what PipeCat doesn't provide:
- Session management
- State tracking
- User association

Just:
1. Get room
2. Connect
3. Set timeout
4. Done

## Total Integration: 65 Lines

- Backend service: 40 lines
- Frontend service: 25 lines
- Everything else: Optional UX

Compare to original: 500+ lines of complexity that PipeCat ignores anyway.

## Remember

PipeCat Cloud = Room factory, nothing more.
Your code = Everything stateful.
The simpler, the better.
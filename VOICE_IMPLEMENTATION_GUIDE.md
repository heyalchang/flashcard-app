# Voice Implementation Guide

## Architecture Overview

The flashcard app uses PipeCat Cloud + Daily.co for voice interaction:
- **PipeCat Cloud**: Manages AI voice agents
- **Daily.co**: Provides WebRTC infrastructure
- **Flow**: User speaks → Daily.co → PipeCat bot → Webhook → WebSocket → Frontend

## Critical Lesson: iframe Lifecycle Management

### The Problem We Hit

**Initial Implementation (WRONG):**
```typescript
// VoiceMode.tsx
const dailyFrameRef = useRef<HTMLIFrameElement>(null);

// Trying to use iframe before it exists
await voiceService.startSession(dailyFrameRef.current!); // current is null!

// iframe only renders after state changes
{state === 'connecting' && (
  <iframe ref={dailyFrameRef} />
)}
```

**Error**: "Cannot set properties of null (setting 'src')"

### Why This Happened

1. We tried to manually manage the iframe lifecycle
2. The iframe didn't exist when `startSession` was called
3. React render cycles and Daily.co initialization were racing

### The Solution: Let Daily SDK Manage the iframe

**Correct Implementation:**
```typescript
// VoiceMode.tsx
const containerRef = useRef<HTMLDivElement>(null);

// Pass container, let Daily create iframe inside
await voiceService.startSession(containerRef.current);

// Container exists from the start
<div ref={containerRef} className="daily-container" />
```

### Key Insights

1. **Daily.co is designed to create its own iframe** - This is the recommended approach
2. **Fighting the SDK causes bugs** - Manual iframe management creates race conditions
3. **Container pattern is standard** - Most WebRTC SDKs follow this pattern
4. **SDK handles edge cases** - Reconnection, cleanup, browser quirks

## Voice Service Architecture

### Component Responsibilities

**VoiceMode.tsx**
- UI state management (connecting, active, error)
- User controls (mute, end session)
- Visual feedback (timers, indicators)
- Provides container div for Daily

**voiceService.ts**
- Daily.co SDK initialization
- Session creation via backend API
- WebRTC call management
- Audio processing and events

**server.ts**
- PipeCat Cloud API integration
- Session token generation
- WebSocket message routing
- Answer webhook processing

### Session Flow

1. **User clicks "Start Voice Mode"**
   - Frontend sets state to 'connecting'
   - Container div is ready immediately

2. **voiceService.startSession(container)**
   - Calls backend `/api/voice/session`
   - Backend calls PipeCat Cloud API
   - Returns room URL + token

3. **Daily SDK initialization**
   - Creates iframe inside container
   - Joins room with token
   - Bot automatically joins

4. **Voice interaction**
   - User speaks answer
   - Bot processes via PipeCat
   - Sends to webhook
   - Frontend receives via WebSocket

## Best Practices

### DO:
- Let Daily SDK create and manage the iframe
- Use container divs for WebRTC components
- Handle all error states gracefully
- Clean up sessions on unmount
- Implement proper timeout handling

### DON'T:
- Create iframes manually for WebRTC
- Assume refs are populated immediately
- Fight the SDK's design patterns
- Ignore cleanup and error states

## Common Pitfalls

1. **Race Conditions**: Always check if elements exist before using them
2. **Memory Leaks**: Clean up Daily call instances on unmount
3. **Session Limits**: PipeCat has concurrent session limits
4. **Network Errors**: Implement retry logic for failed connections
5. **Browser Permissions**: Handle microphone permission denials

## Environment Variables

### Backend (.env)
```
PIPECAT_API_KEY=pk_xxx  # Your PipeCat public key
PIPECAT_AGENT_NAME=my-first-agent
WEBHOOK_URL=https://your-ngrok.ngrok-free.app/webhook
```

### Frontend
The frontend doesn't need PipeCat credentials - all API calls go through the backend for security.

## Testing Voice Mode

1. **Start the server**: `cd server && npm run dev`
2. **Check health**: `curl localhost:3051/health` should show `pipecatConfigured: true`
3. **Start frontend**: `npm start`
4. **Click "Start Voice Mode"**
5. **Speak a number** when you see a math question
6. **Say "goodbye"** to end the session

## Debugging Tips

- Check browser console for Daily.co errors
- Monitor network tab for failed API calls
- Check server logs for PipeCat API responses
- Verify microphone permissions in browser
- Test webhook with manual POST to `/webhook`

## Architecture Decisions

### Why Not Direct Frontend → PipeCat?
- Security: API keys should never be in frontend
- Control: Backend can manage sessions, timeouts, costs
- Flexibility: Can switch voice providers without frontend changes

### Why WebSockets for Answers?
- Real-time: Instant feedback when answer is received
- Bidirectional: Can send control messages (mute, disconnect)
- Reliable: Automatic reconnection on network issues

### Why Daily.co + PipeCat?
- Daily.co: Production-ready WebRTC infrastructure
- PipeCat: Specialized for AI voice agents
- Together: Best of both worlds - reliable transport + AI capabilities
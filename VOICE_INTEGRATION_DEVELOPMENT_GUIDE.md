# Voice Integration Development Guide for LLM Agents

## Overview: What This Guide Teaches

This guide documents the **non-obvious complexities** of integrating real-time voice capabilities into web applications using PipeCat Cloud, Daily.co, and WebSockets. It's specifically written to help LLM coding agents avoid common pitfalls and understand the hidden complexity beneath seemingly simple voice features.

## The Hidden Architecture Stack

What looks like "add voice to my app" actually involves:

```
Layer 1: Browser ← → React App (UI State)
Layer 2: React App ← → Express Backend (WebSocket for data)
Layer 3: React App ← → Daily.co iframe (WebRTC for voice)
Layer 4: Daily.co ← → PipeCat Agent (Voice processing)
Layer 5: PipeCat Agent → Express Backend (Webhook for actions)
Layer 6: Express Backend → React App (WebSocket broadcast)
```

**Critical Insight**: Layers 2 and 3 are PARALLEL, not serial. Voice flows through Daily/WebRTC while data flows through WebSocket. They meet only at the backend webhook.

## Non-Obvious Pattern #1: The Dual Connection Reality

### What LLMs Often Get Wrong
```javascript
// WRONG: Trying to send voice data through WebSocket
ws.send(audioBuffer); // This will fail spectacularly
```

### The Reality
```javascript
// Voice travels through Daily.co WebRTC
daily.join({ url: roomUrl });

// Data travels through your WebSocket
ws.send(JSON.stringify({ type: 'answer', value: 42 }));

// They are completely separate channels
```

## Non-Obvious Pattern #2: Webhook URL Configuration Hell

### The Development Problem
- Your backend runs on `localhost:3051`
- PipeCat Cloud agent runs in the cloud
- Cloud cannot reach `localhost`
- Solution: ngrok creates public URL
- Problem: ngrok URL changes every restart
- Deeper problem: PipeCat agent reads webhook URL from environment at deploy time

### The Patterns That Emerge
```bash
# Development flow (painful but necessary)
1. Start ngrok: ngrok http 3051
2. Copy URL: https://abc123.ngrok.io
3. Update bot.py env: WEBHOOK_URL=https://abc123.ngrok.io/webhook
4. Redeploy to PipeCat: pcc deploy
5. Start backend: npm run dev
6. If ngrok dies, repeat ALL steps

# Production flow (much simpler)
1. Deploy backend: Gets stable URL
2. Set webhook in PipeCat: WEBHOOK_URL=https://your-app.com/webhook
3. Deploy once
```

**LLM Trap**: Don't try to make webhook URL dynamic at runtime. PipeCat agents read it once at startup.

## Non-Obvious Pattern #3: The Daily.co iframe Requirement

### What LLMs Assume
```javascript
// LLMs think you can just use Daily API directly
const daily = DailyAPI.create();
daily.join(roomUrl); // Seems logical, but...
```

### The Reality
```javascript
// Daily REQUIRES an iframe for browser security
<iframe ref={dailyFrame} src={roomUrl} allow="microphone" />

// Then wrap it
const daily = DailyIframe.wrap(dailyFrame.current);
```

**Why**: Browser security model requires user-visible element for microphone access. The iframe provides Daily's UI for permissions, device selection, etc.

## Non-Obvious Pattern #4: Message Consumption vs State

### The Bug That Always Happens
```javascript
// Every React re-render re-processes the same webhook message
useEffect(() => {
  if (lastMessage) {
    processAnswer(lastMessage); // Processes 5+ times!
  }
}, [lastMessage, someOtherDep]); // Multiple dependencies = multiple runs
```

### The Solution Pattern
```javascript
useEffect(() => {
  if (lastMessage) {
    processAnswer(lastMessage);
    clearLastMessage(); // CRITICAL: Consume the message
  }
}, [lastMessage, clearLastMessage]); // Minimal deps
```

**Key Insight**: WebSocket messages are EVENTS, not STATE. Process once and discard.

## Non-Obvious Pattern #5: PipeCat Cloud Session Lifecycle

### What the Docs Don't Emphasize

PipeCat Cloud sessions are NOT like typical API sessions:

1. **Creation spawns a container**: Each session starts an actual Docker container
2. **Containers cost money**: They run whether used or not
3. **No automatic cleanup**: You must explicitly DELETE sessions
4. **Orphaned sessions accumulate**: Failed cleanups = rising costs

### The Defensive Pattern
```javascript
class PipeCatService {
  private sessionTimeouts = new Map();
  
  async createSession(userId) {
    const session = await this.apiCall('/sessions', 'POST');
    
    // CRITICAL: Always set a timeout
    const timeoutId = setTimeout(() => {
      this.forceEndSession(session.id);
    }, 10 * 60 * 1000); // 10 min max
    
    this.sessionTimeouts.set(session.id, timeoutId);
    
    // CRITICAL: Track for cleanup
    this.activeSessions.set(userId, session);
    
    return session;
  }
  
  // CRITICAL: Cleanup on app shutdown
  async cleanup() {
    for (const [userId, session] of this.activeSessions) {
      await this.endSession(session.id);
    }
  }
}

// Register cleanup handlers
process.on('SIGTERM', () => pipecatService.cleanup());
process.on('SIGINT', () => pipecatService.cleanup());
```

## Non-Obvious Pattern #6: The "Goodbye" Detection Chain

### The Complex Flow Nobody Expects

When user says "goodbye":

1. **Audio captured** by browser mic (0ms)
2. **Streamed to Daily** via WebRTC (20ms)
3. **Forwarded to PipeCat** agent (50ms)
4. **Transcribed by ASR** (200-500ms)
5. **Detected in bot.py** (501ms)
6. **Posted to webhook** (520ms)
7. **Received by backend** (540ms)
8. **Broadcast via WebSocket** (545ms)
9. **Received by frontend** (550ms)
10. **Triggers Daily.leave()** (560ms)
11. **Cleanup PipeCat session** (1000ms)

**Problem**: Steps 10 and 11 can race. Daily might disconnect before PipeCat says goodbye.

### The Solution
```python
# In bot.py
if "goodbye" in transcription:
    # First, have bot say goodbye (happens in real-time)
    await push_frame(LLMMessagesFrame([{
        "role": "system",
        "content": "Say goodbye nicely"
    }]))
    
    # Then wait briefly
    await asyncio.sleep(1)
    
    # Then notify webhook
    await webhook_post({"type": "disconnect"})
```

## Non-Obvious Pattern #7: Environment Variable Hell

### The Three-Layer Problem

```bash
# Layer 1: Your Backend (.env)
PIPECAT_API_KEY=sk_xxx  # For creating sessions
WEBHOOK_BASE_URL=https://your-backend.com

# Layer 2: PipeCat Agent (bot.py environment)
WEBHOOK_URL=${WEBHOOK_BASE_URL}/webhook  # Read at container start
OPENAI_API_KEY=sk_yyy
DAILY_API_KEY=zzz

# Layer 3: Your Frontend (.env)
REACT_APP_BACKEND_URL=http://localhost:3051  # Never includes API keys!
```

**Critical**: Each layer has different deployment mechanisms:
- Backend: Platform environment (Heroku, EB, etc.)
- PipeCat: `pcc secrets` or pcc-deploy.toml
- Frontend: Build-time injection

## Non-Obvious Pattern #8: Voice Activity Detection

### What LLMs Think
```javascript
// Just check if user is speaking
if (audioLevel > 0) {
  showSpeakingIndicator();
}
```

### The Reality
```javascript
daily.on('participant-updated', (event) => {
  // audioLevel is 0-1, but...
  // - Always has noise floor (0.01-0.05)
  // - Spikes randomly from background
  // - Delayed by 100-200ms
  
  const NOISE_FLOOR = 0.05;
  const SPEECH_THRESHOLD = 0.15;
  
  if (event.participant.local) {
    const level = event.participant.audioLevel || 0;
    
    // Need smoothing to avoid flicker
    this.levelHistory.push(level);
    if (this.levelHistory.length > 5) {
      this.levelHistory.shift();
    }
    
    const avgLevel = this.levelHistory.reduce((a,b) => a+b) / this.levelHistory.length;
    
    // Three states, not two
    if (avgLevel < NOISE_FLOOR) {
      setVoiceState('silent');
    } else if (avgLevel < SPEECH_THRESHOLD) {
      setVoiceState('noise');
    } else {
      setVoiceState('speaking');
    }
  }
});
```

## Non-Obvious Pattern #9: The Mute State Paradox

### The Problem
When user mutes:
1. Frontend mutes Daily (instant)
2. Backend notified (delayed)
3. PipeCat agent doesn't know (ever)
4. Bot keeps listening to silence
5. ASR times out repeatedly
6. Webhook gets "empty" transcriptions

### The Solution
```javascript
// Frontend
toggleMute() {
  daily.setLocalAudio(!muted);
  
  // Notify backend immediately
  fetch('/api/voice/mute', {
    method: 'POST',
    body: JSON.stringify({ 
      sessionId, 
      isMuted: !muted,
      timestamp: Date.now() // For ordering
    })
  });
}

// Backend
const mutedSessions = new Map();

app.post('/webhook', (req, res) => {
  const sessionId = req.body.metadata?.session_id;
  
  // Ignore webhooks from muted sessions
  if (mutedSessions.get(sessionId)) {
    return res.json({ ignored: true });
  }
  
  // Process normally...
});
```

## Non-Obvious Pattern #10: Cleanup Order Matters

### The Wrong Order (causes errors)
```javascript
async endSession() {
  await this.pipecatService.endSession(); // 1. Kill agent
  await this.daily.leave();                // 2. Leave room
  this.clearTimers();                      // 3. Clear timers
  this.ws.close();                         // 4. Close WebSocket
}
```

### The Right Order
```javascript
async endSession() {
  // 1. Stop accepting new input
  this.acceptingInput = false;
  
  // 2. Clear timers (prevent auto-retrigger)
  this.clearTimers();
  
  // 3. Leave Daily (stops voice flow)
  if (this.daily) {
    await this.daily.leave();
  }
  
  // 4. Wait briefly for final webhooks
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 5. End PipeCat session
  if (this.sessionId) {
    await this.pipecatService.endSession(this.sessionId);
  }
  
  // 6. Close WebSocket (if not shared)
  // Usually keep WebSocket open for other features
}
```

## Architecture Best Practices

### 1. Separation of Concerns
```
Frontend: UI state, Daily iframe management
Backend: Session orchestration, webhook handling
PipeCat: Voice processing, transcription
Daily: WebRTC transport
```

### 2. State Synchronization Strategy
- **Source of truth**: Backend session store
- **Frontend state**: Derived from backend + Daily events
- **Conflict resolution**: Backend always wins
- **Timeout authority**: Backend enforces hard limits

### 3. Error Recovery Patterns
```javascript
// Every async operation needs recovery
async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

// Every session needs timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}
```

### 4. Development vs Production Patterns

**Development Challenges**:
- ngrok URL instability
- Cold starts on every change
- Console logging everything
- No cleanup (Ctrl+C exits)

**Production Requirements**:
- Stable URLs
- Graceful shutdown handlers
- Structured logging
- Session cleanup cron jobs
- Rate limiting
- Cost monitoring

## Testing Strategies

### 1. Mock the External Services
```javascript
// Mock PipeCat API
class MockPipeCatService {
  async createSession() {
    return {
      session_id: 'mock-123',
      room_url: 'https://daily.co/mock-room',
      token: 'mock-token'
    };
  }
}

// Mock Daily
class MockDaily {
  join() { 
    setTimeout(() => this.emit('joined-meeting'), 100);
  }
}
```

### 2. Test the State Machines
```javascript
describe('Voice Session State', () => {
  it('should transition through states correctly', async () => {
    expect(state).toBe('off');
    
    await startVoice();
    expect(state).toBe('connecting');
    
    daily.emit('joined-meeting');
    expect(state).toBe('active');
    
    webhookReceive({ transcription: 'goodbye' });
    expect(state).toBe('disconnecting');
    
    await waitFor(() => expect(state).toBe('off'));
  });
});
```

### 3. Test the Cleanup
```javascript
it('should cleanup orphaned sessions', async () => {
  const session = await createSession();
  
  // Simulate crash
  process.emit('SIGTERM');
  
  // Verify cleanup
  expect(pipecatAPI.calls).toContain(
    `DELETE /sessions/${session.id}`
  );
});
```

## Common LLM Mistakes to Avoid

1. **Assuming synchronous operations** - Everything is async
2. **Forgetting cleanup** - Sessions cost money
3. **Ignoring race conditions** - Multiple systems = races
4. **Not handling network failures** - They will happen
5. **Testing only happy path** - Users do weird things
6. **Hardcoding URLs** - Breaks immediately in production
7. **Exposing API keys to frontend** - Security 101
8. **Not debouncing webhooks** - Duplicates everywhere
9. **Forgetting timers cause re-renders** - React footgun
10. **Not reading the actual API docs** - Assumptions fail

## Final Wisdom

Building voice features is **10x more complex** than it appears. The complexity comes not from any single component, but from orchestrating multiple real-time systems that were never designed to work together. Success requires:

1. **Defensive programming** - Assume everything can fail
2. **Explicit cleanup** - Nothing cleans itself
3. **State machines** - Track everything explicitly
4. **Timeouts everywhere** - Bound every operation
5. **Monitoring** - You can't fix what you can't see

Remember: The user just wants to click a button and talk. Everything else is implementation detail they should never see.

## Non-Obvious Pattern #11: PipeCat Cloud Is Not What You Think

### What LLMs Assume (Wrong)
PipeCat Cloud is a full session management platform with:
- Session creation/deletion endpoints
- Session state tracking
- User management
- Lifecycle hooks
- Complex API surface

### The Actual Reality
PipeCat Cloud is a **thin orchestration wrapper** that:
1. Starts a Daily room with your agent
2. Returns credentials
3. That's it.

### The Complete PipeCat Cloud API
```bash
# Start agent in a room - THE ONLY ENDPOINT YOU NEED
POST https://api.pipecat.daily.co/v1/public/{agentName}/start
Headers: Authorization: Bearer {your_api_key}
Body: {"createDailyRoom": true}
Response: {"dailyRoomUrl": "...", "dailyToken": "..."}

# That's literally the entire integration surface
```

**No Session Management API**: 
- No `/sessions` endpoint
- No DELETE method
- No session listing (except CLI: `pcc agent sessions`)
- No session state
- No user association

### What This Means for Your Architecture
1. **You own ALL session logic** - PipeCat knows nothing about your sessions
2. **Rooms expire naturally** - No cleanup API, just local tracking
3. **State is your problem** - Mute, pause, user data, all yours
4. **Cost control is on you** - Set aggressive timeouts yourself
5. **The agent is stateless** - Each room is isolated

### The Correct Mental Model
```
PipeCat Cloud = Docker orchestrator + Daily room factory
NOT a session management platform

Your App (Stateful) → PipeCat (Stateless) → Daily Room (Transport)
```

## Non-Obvious Pattern #12: The Stateless Agent Paradigm

### You Cannot Pass Runtime Config
```javascript
// THIS DOESN'T WORK - PipeCat ignores runtime config
const response = await fetch('/start', {
  body: JSON.stringify({
    createDailyRoom: true,
    webhookUrl: dynamicUrl,  // ❌ Ignored
    sessionTimeout: 600,      // ❌ Ignored
    userId: 'user-123'        // ❌ Ignored
  })
});
```

### Agent Config Is Frozen at Deploy Time
```python
# bot.py - These are set when container starts
WEBHOOK_URL = os.getenv("WEBHOOK_URL")  # Frozen
API_KEY = os.getenv("OPENAI_API_KEY")    # Frozen
# You CANNOT change these per session
```

### What You Must Build Yourself
```javascript
class SessionManager {
  // Everything stateful lives HERE, not in PipeCat
  sessions = new Map();
  timeouts = new Map();
  muteStates = new Map();
  userLimits = new Map();
  
  async startVoice(userId) {
    // 1. Enforce YOUR limits
    if (this.hasActiveSession(userId)) {
      throw new Error('Already has active session');
    }
    if (this.getTodaySessionCount(userId) > 10) {
      throw new Error('Daily limit reached');
    }
    
    // 2. Call PipeCat (stateless, just gets a room)
    const { dailyRoomUrl, dailyToken } = await this.callPipeCat();
    
    // 3. Track everything locally
    const session = {
      userId,
      roomUrl: dailyRoomUrl,
      token: dailyToken,
      startedAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000)
    };
    
    // 4. Set multiple timeout layers
    const timeoutId = setTimeout(() => {
      this.forceEndSession(userId, 'timeout');
    }, 10 * 60 * 1000);
    
    this.sessions.set(userId, session);
    this.timeouts.set(userId, timeoutId);
    
    return session;
  }
  
  // YOU handle cleanup - PipeCat won't help
  forceEndSession(userId, reason) {
    const session = this.sessions.get(userId);
    if (!session) return;
    
    // Clear YOUR tracking
    clearTimeout(this.timeouts.get(userId));
    this.sessions.delete(userId);
    this.timeouts.delete(userId);
    
    // Note: Can't tell PipeCat to stop - room expires naturally
    console.log(`Session ended locally: ${reason}`);
  }
}
```

## Non-Obvious Pattern #13: The Webhook URL Development Hell

### The Frozen Webhook Problem
```bash
# Your agent reads WEBHOOK_URL once at container start
# Changing ngrok URL means FULL REDEPLOY

Development cycle from hell:
1. Start ngrok → https://abc123.ngrok.io
2. Update bot.py env: WEBHOOK_URL=https://abc123.ngrok.io/webhook  
3. pcc deploy (wait 2-3 minutes)
4. Test your app
5. Computer sleeps/ngrok dies/network hiccup
6. New ngrok URL → https://xyz789.ngrok.io
7. GOTO 2 (suffer)
```

### Solutions Ranked by Sanity

**Best: Stable ngrok subdomain**
```bash
# Pay for ngrok, get stable URL
ngrok http 3051 --subdomain=my-dev-flashcards
# URL never changes: https://my-dev-flashcards.ngrok.io
```

**Good: Webhook proxy service**
```javascript
// Deploy tiny proxy on free tier somewhere
// proxy.myapp.com → forwards to → current ngrok
// Update proxy target, not agent
```

**Okay: Local development mode**
```javascript
if (process.env.NODE_ENV === 'development') {
  // Skip PipeCat entirely for UI development
  return {
    roomUrl: 'https://fake-daily-room.daily.co/test',
    token: 'dev-token'
  };
}
```

**Bad: Redeploy every time**
```bash
# Current reality for most devs
# 20+ redeploys per day
# 2-3 minutes each
# 1 hour/day waiting for deploys
```

## Non-Obvious Pattern #14: The Hidden Cost Explosion

### What Actually Happens Per Session
```
User clicks "Start Voice" triggers:
├─ PipeCat container starts ($0.10/hour)
├─ Daily room created ($0.05/hour)
├─ Transcription begins ($0.006/minute)
├─ LLM calls start ($0.01 per call)
├─ TTS generation ($0.015 per 1K chars)
└─ All running until timeout or natural expiry
```

### The Terrifying Math
```javascript
// Forgotten session running for 1 hour
containerCost    = $0.10
dailyRoomCost    = $0.05  
transcriptCost   = $0.36  (60 min × $0.006)
llmCost          = $0.60  (～60 calls)
ttsCost          = $0.30  (～20K characters)
TOTAL            = $1.41 per forgotten session

// 10 users leave tabs open
$14.10/hour = $338/day = $10,140/month
```

### Critical Defense Layers
```javascript
class CostDefenseSystem {
  constructor() {
    // Layer 1: Aggressive timeouts
    this.HARD_TIMEOUT = 10 * 60 * 1000;      // 10 min max
    this.IDLE_TIMEOUT = 2 * 60 * 1000;       // 2 min idle
    this.WARNING_TIME = 8 * 60 * 1000;       // Warn at 8 min
    
    // Layer 2: Rate limits
    this.MAX_SESSIONS_PER_USER_DAY = 10;
    this.MAX_CONCURRENT_SESSIONS = 5;
    this.MIN_TIME_BETWEEN_SESSIONS = 30000;  // 30 sec cooldown
    
    // Layer 3: Budget controls
    this.DAILY_BUDGET_SESSIONS = 100;
    this.sessionCountToday = 0;
  }
  
  async startSession(userId) {
    // Check EVERYTHING
    this.checkDailyBudget();
    this.checkUserLimits(userId);
    this.checkConcurrentLimit();
    this.checkCooldown(userId);
    
    const session = await this.createSession(userId);
    
    // Set MULTIPLE failsafes
    this.setHardTimeout(session);
    this.setIdleTimeout(session);
    this.setWarningTimeout(session);
    this.trackForEmergencyShutdown(session);
    
    return session;
  }
  
  // Nuclear option for cost control
  async emergencyShutdownAll() {
    console.error('🚨 EMERGENCY SHUTDOWN - KILLING ALL SESSIONS');
    for (const session of this.sessions.values()) {
      try {
        // Can't stop PipeCat, but stop accepting input
        this.sessions.delete(session.userId);
        // Notify frontend to disconnect
        this.broadcastDisconnect(session.userId);
      } catch (e) {
        console.error('Failed to kill session:', e);
      }
    }
  }
}

// Wire up EVERYWHERE
process.on('SIGTERM', () => defense.emergencyShutdownAll());
process.on('SIGINT', () => defense.emergencyShutdownAll());
process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e);
  defense.emergencyShutdownAll();
});

// Even add a manual kill switch
app.post('/api/emergency/shutdown', (req, res) => {
  defense.emergencyShutdownAll();
  res.json({ message: 'All sessions terminated' });
});
```

## Non-Obvious Pattern #15: The Minimum Viable Integration

After learning these lessons, here's the absolute minimum that actually works:

### Backend (40 lines)
```javascript
const sessions = new Map();

app.post('/api/voice/session', async (req, res) => {
  const userId = req.body.userId || `anon-${Date.now()}`;
  
  // Check if already has session
  if (sessions.has(userId)) {
    return res.json(sessions.get(userId));
  }
  
  try {
    // Call PipeCat - that's it
    const response = await fetch(
      `https://api.pipecat.daily.co/v1/public/${AGENT_NAME}/start`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ createDailyRoom: true })
      }
    );
    
    const { dailyRoomUrl, dailyToken } = await response.json();
    
    // Track locally with timeout
    const session = { roomUrl: dailyRoomUrl, token: dailyToken };
    sessions.set(userId, session);
    
    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      sessions.delete(userId);
      console.log(`Session expired for ${userId}`);
    }, 10 * 60 * 1000);
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Service unavailable' });
  }
});
```

### Frontend (25 lines)
```javascript
async function startVoice() {
  // Get room from backend
  const res = await fetch('/api/voice/session', { 
    method: 'POST',
    body: JSON.stringify({ userId: getUserId() })
  });
  const { roomUrl, token } = await res.json();
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = roomUrl;
  iframe.allow = 'microphone';
  document.body.appendChild(iframe);
  
  // Join with Daily
  const daily = DailyIframe.wrap(iframe);
  await daily.join({ url: roomUrl, token });
  
  // Handle disconnect
  daily.on('left-meeting', () => {
    iframe.remove();
  });
}
```

**That's it. Everything else is optional.**

### What We Learned NOT to Build
- ❌ Session management API calls to PipeCat
- ❌ Complex state synchronization
- ❌ Retry logic for session operations
- ❌ Session recovery mechanisms
- ❌ Waiting for PipeCat to confirm states

### What We Learned We MUST Build
- ✅ Local timeout tracking (or pay $$$)
- ✅ User limits and rate limiting
- ✅ Emergency shutdown mechanism
- ✅ Cost monitoring
- ✅ Webhook URL management for dev

## The Final Wisdom

The complexity in voice apps doesn't come from PipeCat - it's dead simple. The complexity comes from:
1. **Cost control** - Forgotten sessions are expensive
2. **Development workflow** - Webhook URLs are painful
3. **User expectations** - They want seamless, you get stateless
4. **Mental model mismatch** - It's not a session API, it's a room factory

Success requires:
1. **Accepting PipeCat's limitations** - It just makes rooms
2. **Building your own session layer** - You own all state
3. **Aggressive timeout policies** - Cost control is critical
4. **Simple integration code** - Less to break

The less you expect from PipeCat, the happier you'll be.
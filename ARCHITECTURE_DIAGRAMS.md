# Flashcard App Architecture & Data Flow Diagrams

## 1. Voice Session Initialization Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React Frontend
    participant Express as Express Server
    participant Pipecat as Pipecat Cloud
    participant Daily as Daily WebRTC
    participant Bot as Pipecat Bot

    User->>React: Click "Start Voice Mode"
    React->>React: voiceService.startSession()
    React->>Express: POST /api/voice/session<br/>{userId: "user-123"}
    
    Note over Express: Check for existing session,<br/>end it if exists
    
    Express->>Pipecat: POST /v1/public/my-first-agent/start<br/>{createDailyRoom: true,<br/>metadata: {userId, webhookUrl}}
    Pipecat->>Daily: Create room automatically
    Daily-->>Pipecat: Room created
    Pipecat->>Bot: Start bot instance
    Bot->>Daily: Bot joins room
    
    Pipecat-->>Express: {dailyRoom: "https://...",<br/>dailyToken: "eyJ...",<br/>sessionId: "..."}
    
    Note over Express: Store session in memory<br/>Set 10-minute timeout
    
    Express-->>React: {sessionId: "session-user-123-...",<br/>roomUrl: "https://...",<br/>token: "eyJ...",<br/>expiresAt: ...,<br/>remainingTime: 600000}
    
    React->>Daily: DailyIframe.createFrame()
    React->>Daily: daily.join({url, token})
    Daily-->>React: joined-meeting event
    React->>React: Update UI to "Voice Active"
    
    User<->Bot: Voice conversation via WebRTC
```

## 2. Voice Answer Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Bot as Pipecat Bot
    participant Express as Express Server
    participant WS as WebSocket Clients
    participant React as React Frontend

    User->>Bot: Says "forty-two"
    Bot->>Bot: Process speech recognition
    
    Bot->>Express: POST /webhook or /api/answer<br/>{transcription: "forty two",<br/>number: 42,<br/>metadata: {...}}
    
    Note over Express: Check debounce (900ms)
    
    alt Not debounced
        Express->>Express: Parse number from transcription
        Express->>Express: Check if session is muted
        
        alt Session not muted
            Express->>Express: Transform payload
            Express->>WS: Broadcast WebSocket message<br/>{type: "webhook",<br/>payload: {answer: 42, ...}}
            
            WS->>React: WebSocket message received
            React->>React: Process answer in App.tsx
            React->>React: Check if correct
            React->>React: Generate new question
            React->>React: Update FlashCard display
            React->>React: Add to PostLog
        else Session is muted
            Express->>Express: Skip broadcasting
        end
        
        Express-->>Bot: 200 OK {success: true}
    else Debounced
        Express-->>Bot: 200 OK {debounced: true}
    end
```

## 3. Goodbye Detection & Session Termination Flow

```mermaid
sequenceDiagram
    participant User
    participant Bot as Pipecat Bot
    participant Express as Express Server
    participant WS as WebSocket
    participant React as React Frontend
    participant Daily as Daily WebRTC

    User->>Bot: Says "goodbye"
    Bot->>Express: POST /webhook<br/>{transcription: "goodbye", ...}
    
    Express->>Express: Detect "goodbye" in transcription
    Express->>Express: Log full payload for debugging
    
    Express->>WS: Broadcast to all clients<br/>{type: "voice_disconnect",<br/>reason: "user_goodbye"}
    
    WS->>React: voice_disconnect message
    React->>React: voiceService.handleGoodbyeDetected()
    React->>React: Emit goodbye_detected event
    React->>React: VoiceMode handles event
    React->>React: Call handleEndVoice('goodbye')
    
    Note over Express: Wait 2 seconds<br/>(let bot say goodbye)
    
    Express->>Express: Get all active sessions
    loop For each active session
        Express->>Express: pipecatService.endSession(userId)
        Express->>Express: Clear timeout
        Express->>Express: Remove from activeSessions
    end
    
    React->>Daily: daily.leave()
    React->>Daily: daily.destroy()
    React->>Express: DELETE /api/voice/session/{sessionId}
    
    Daily-->>React: left-meeting event
    React->>React: Update UI to "Voice Off"
    
    Note over Bot,Daily: Bot and room expire naturally
```

## 4. WebSocket Real-time Communication Flow

```mermaid
sequenceDiagram
    participant React1 as React Client 1
    participant React2 as React Client 2
    participant Express as Express Server
    participant Bot as Voice Agent

    React1->>Express: WebSocket connect ws://localhost:3051
    Express->>Express: Add to clients Set
    Express-->>React1: Connection established
    
    React2->>Express: WebSocket connect ws://localhost:3051
    Express->>Express: Add to clients Set
    Express-->>React2: Connection established
    
    Bot->>Express: POST /webhook {answer: 42}
    Express->>Express: Process webhook
    
    par Broadcast to Client 1
        Express->>React1: {type: "webhook", payload: {...}}
        React1->>React1: Update flashcard
    and Broadcast to Client 2
        Express->>React2: {type: "webhook", payload: {...}}
        React2->>React2: Update flashcard
    end
    
    React1->>Express: WebSocket disconnect
    Express->>Express: Remove from clients Set
```

## 5. Session Lifecycle Management

```mermaid
stateDiagram-v2
    [*] --> Off: Initial state
    
    Off --> Connecting: User clicks Start Voice
    Connecting --> Active: Daily room joined
    Connecting --> Error: Connection failed
    
    Active --> Disconnecting: User clicks End
    Active --> Disconnecting: Goodbye detected
    Active --> Disconnecting: Session timeout (10 min)
    Active --> Error: Connection lost
    
    Disconnecting --> Off: Cleanup complete
    Error --> Off: User clicks reset
    
    note right of Active
        - Voice conversation active
        - Can minimize/expand
        - Mute/unmute available
        - Timer counting down
    end note
    
    note right of Connecting
        - Creating Pipecat session
        - Getting Daily room/token
        - Joining Daily room
    end note
```

## 6. Error Recovery Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React Frontend
    participant Express as Express Server
    participant Daily as Daily WebRTC

    User->>React: Click Start Voice (again)
    React->>React: Check if daily exists
    
    alt Daily instance exists
        React->>React: await cleanup()
        React->>Daily: Remove event listeners
        React->>Daily: daily.leave() if joined
        React->>Daily: daily.destroy()
        React->>React: Set daily = null
    end
    
    React->>Express: POST /api/voice/session
    
    alt User has existing session
        Express->>Express: End existing session
        Express->>Express: Clear timeout
        Express->>Express: Remove from activeSessions
    end
    
    Express->>Express: Create new session
    Express-->>React: New session details
    
    React->>React: Clear container innerHTML
    React->>Daily: Create new frame
    React->>Daily: Join with new token
```

## 7. Component Communication Architecture

```mermaid
graph TB
    subgraph "React Frontend"
        App[App.tsx]
        VM[VoiceMode.tsx]
        FC[FlashCard.tsx]
        PL[PostLog.tsx]
        VS[voiceService.ts]
        WH[useWebSocket.ts]
    end
    
    subgraph "Express Backend"
        API[API Endpoints]
        PS[pipecatService.ts]
        WS[WebSocket Server]
        NP[numberParser.ts]
    end
    
    subgraph "External Services"
        PC[Pipecat Cloud]
        DR[Daily Rooms]
        BOT[Pipecat Bot]
    end
    
    App --> VM
    App --> FC
    App --> PL
    App --> WH
    
    VM --> VS
    VS --> API
    
    WH --> WS
    
    API --> PS
    PS --> PC
    
    PC --> DR
    PC --> BOT
    
    BOT --> API
    WS --> App
    
    style App fill:#e1f5fe
    style VM fill:#fff3e0
    style PS fill:#f3e5f5
    style PC fill:#e8f5e9
```

## 8. Data Store & State Management

```mermaid
graph LR
    subgraph "Frontend State"
        RS[React State<br/>- currentQuestion<br/>- isAnswered<br/>- isCorrect]
        VS[Voice State<br/>- connection status<br/>- session info<br/>- mute state]
        LS[Local Storage<br/>- voice_user_id]
    end
    
    subgraph "Backend State"
        AS[Active Sessions Map<br/>userId -> StoredSession]
        SS[Session ID Map<br/>pipecatId -> userId]
        CS[WebSocket Clients Set]
        DB[Debounce State<br/>lastWebhookTime]
    end
    
    subgraph "External State"
        DR[Daily Room State]
        PS[Pipecat Session State]
    end
    
    RS --> AS
    VS --> AS
    AS --> PS
    PS --> DR
```

## Key Integration Points

### 1. **Webhook Endpoint** (`/webhook`, `/api/answer`)
- Receives answers from Pipecat bot
- Implements 900ms debouncing
- Parses spoken numbers
- Broadcasts via WebSocket

### 2. **Voice Session API** (`/api/voice/*`)
- Creates Pipecat sessions
- Manages session lifecycle
- Handles mute state
- Tracks session timeouts

### 3. **WebSocket Server** (port 3051)
- Real-time answer broadcasting
- Voice disconnect notifications
- Multiple client support

### 4. **Daily WebRTC Integration**
- Voice/video communication
- Room management
- Token-based authentication
- Network quality monitoring

## Environment Dependencies

```yaml
Backend (.env):
  PIPECAT_API_KEY: Public API key for Pipecat Cloud
  PIPECAT_AGENT_NAME: Agent identifier (my-first-agent)
  WEBHOOK_URL: Public URL for bot callbacks
  PORT: 3051

Frontend (.env):
  REACT_APP_WS_URL: WebSocket server URL
  REACT_APP_API_URL: Backend API URL
```

## Error Handling Strategies

1. **Connection Failures**: Automatic reconnection with 3-second delay
2. **Session Conflicts**: End existing session before creating new
3. **Cleanup Failures**: Force cleanup with finally blocks
4. **Network Issues**: Voice level smoothing, quality warnings
5. **Timeout Management**: 10-minute hard limit with warnings

## Security Considerations

1. **Token-based Auth**: Daily rooms require tokens
2. **Session Isolation**: Each user gets unique session
3. **Rate Limiting**: 900ms webhook debouncing
4. **Private Rooms**: Daily rooms set to private
5. **Cleanup on Shutdown**: All sessions ended on SIGTERM/SIGINT
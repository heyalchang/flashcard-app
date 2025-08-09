# Configuration Notes

## Webhook Configuration for Pipecat Voice Integration

### Overview
The webhook is the callback mechanism that Pipecat uses to send voice interaction responses back to the flashcard app server.

### Flow
1. **Session Creation**: When creating a Pipecat session via `/api/voice/session`, the server passes the webhook URL to Pipecat
2. **User Speech**: When a user speaks, Pipecat/bot.py processes the speech
3. **Webhook Callback**: Pipecat POSTs the transcription and parsed answer to the webhook URL
4. **Server Processing**: Server receives the webhook at `/api/answer` endpoint
5. **Frontend Update**: Server broadcasts the answer via WebSocket to the React frontend

### Configuration

#### Default Webhook URL
The server uses this default ngrok URL if `WEBHOOK_URL` environment variable is not set:
```
https://6e014b39f518.ngrok-free.app/api/answer
```

#### Setting Custom Webhook URL
You can override the default by setting the `WEBHOOK_URL` environment variable:
```bash
WEBHOOK_URL="https://your-custom-url.ngrok-free.app/api/answer" npm run dev
```

#### Bot Configuration
The bot.py file (in ~/dev/pipecat-cloud-starter/bot.py) should have the same webhook URL configured:
- Line 56: Uses `WEBHOOK_URL` env var or defaults to `http://localhost:3000/api/answer`
- For production, this should match your server's public endpoint

### Endpoints
- **Primary Webhook**: `/api/answer` - Receives voice responses from Pipecat
- **Alternative Webhook**: `/webhook` - Legacy endpoint with additional processing (debouncing, goodbye detection)

### Important Notes
- The webhook URL must be publicly accessible (hence the need for ngrok in development)
- The server logs the webhook URL being used during startup
- The webhook includes debouncing (900ms) to prevent duplicate processing
- Session metadata passed during creation includes the webhook URL for Pipecat to use

### Development Setup with ngrok
1. Start ngrok tunnel: `ngrok http 3051`
2. Copy the ngrok URL (e.g., `https://6e014b39f518.ngrok-free.app`)
3. Set webhook URL in bot.py or via environment variable
4. Start server with Pipecat API key
5. Voice responses will flow through the ngrok tunnel to your local server
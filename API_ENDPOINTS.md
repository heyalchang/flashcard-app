# API Endpoints

## Server Configuration
- **Host**: `localhost`
- **Port**: `3051`
- **Base URL**: `http://localhost:3051`

## Webhook Endpoints

### 1. Main Webhook
**POST** `/webhook`

Receives answer data from external applications and broadcasts to all connected WebSocket clients.

**Request Body:**
```json
{
  "number": 42
}
```
or
```json
{
  "answer": 42
}
```
or
```json
{
  "transcription": "forty two"
}
```
or any combination of the above fields.

**Features:**
- Debouncing: Ignores requests within 900ms of the previous webhook
- Number parsing: Can parse spoken numbers from transcription field (e.g., "forty two" → 42)
- If both `number` and `transcription` are provided, validates and corrects the number based on transcription

**Response:**
```json
{
  "success": true,
  "received": { ... },
  "debounced": false
}
```

### 2. Alternative Answer Endpoint
**POST** `/api/answer`

Alternative endpoint with identical functionality to `/webhook`.

**Request Body:** Same as `/webhook`

**Response:** Same as `/webhook`

## Health Check

### Health Status
**GET** `/health`

Returns server status and number of connected WebSocket clients.

**Response:**
```json
{
  "status": "ok",
  "clients": 2
}
```

## WebSocket Connection

### WebSocket Endpoint
**URL**: `ws://localhost:3051`

Clients connect to this endpoint to receive real-time updates when webhook data is received.

**Message Format (sent to clients):**
```json
{
  "type": "webhook" | "answer",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "payload": {
    "answer": 42,
    "transcription": "forty two",
    "originalTimestamp": "2024-01-01T11:59:59.000Z",
    "lastQuestion": "What is 6 × 7?"
  }
}
```

## Client Configuration
- **Port**: `3050`
- **URL**: `http://localhost:3050`
- Proxy configured to forward API requests to server at port 3051

## Example Usage

### Using curl to send an answer:
```bash
curl -X POST http://localhost:3051/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 42}'
```

### Using curl to check health:
```bash
curl http://localhost:3051/health
```

## Notes
- Both webhook endpoints implement a 900ms debounce to prevent duplicate processing
- The server automatically handles number parsing from voice transcriptions
- All webhook data is broadcast to connected WebSocket clients in real-time
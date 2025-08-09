# Math Flashcard App

A React application that displays single-digit addition and subtraction flashcards with answers between 1-20, designed to receive answers via webhook from a voice agent.

## Features

- Single-digit addition and subtraction problems
- Answers constrained to 1-20 range
- WebSocket connection for real-time updates
- Webhook endpoint for receiving POST requests
- Visual log of all received webhook posts
- Automatic progression to next question on correct answer

## Getting Started

### Install Dependencies

```bash
# Install frontend dependencies
cd flashcard-app
npm install

# Install backend dependencies
cd server
npm install
```

### Running the Application

You need to run both the backend server and the React frontend:

#### Terminal 1 - Backend Server:
```bash
cd flashcard-app/server
npm run dev
```

This starts the Express server on http://localhost:3001 with:
- Webhook endpoint: `POST http://localhost:3001/webhook`
- WebSocket server: `ws://localhost:3001`

#### Terminal 2 - React Frontend:
```bash
cd flashcard-app
npm start
```

This starts the React app on http://localhost:3000

## Testing the Application

### Using curl:
```bash
# Send a correct answer
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"answer": 15}'

# Send an incorrect answer
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"answer": 99}'
```

### Using HTTPie:
```bash
# Send a correct answer
http POST localhost:3001/webhook answer:=15

# Send any custom payload
http POST localhost:3001/webhook answer:=10 user="voice-agent" session="abc123"
```

## Webhook Format

The webhook expects a JSON payload with at least an `answer` field:

```json
{
  "answer": 15
}
```

Additional fields are accepted and will be displayed in the log.

## Voice Mode with PipeCat Cloud (Minimal Version)

### Prerequisites

1. PipeCat Cloud API key and configured agent
2. ngrok for webhook tunneling (development only)

### Setup

1. Configure the backend environment:
```bash
cd server
cp .env.example .env
# Edit .env and add your PIPECAT_API_KEY and PIPECAT_AGENT_NAME
```

2. Start ngrok to expose your webhook:
```bash
ngrok http 3051
# Copy the HTTPS URL and add it to server/.env as WEBHOOK_URL
```

3. Run the minimal backend:
```bash
cd server
npm run dev:minimal
```

4. Run the frontend with minimal voice component:
```bash
# This runs the simplified AppMinimal.tsx with VoiceModeMinimal
npm run start:minimal
```

### Using Voice Mode

1. Click "Start Voice Mode" button
2. Allow microphone permissions when prompted
3. Speak your answer to the math problem
4. Say "goodbye" or click stop to end the session
5. Sessions auto-expire after 10 minutes for cost control

### Important Notes

- Each voice session costs approximately $1.40/hour if left running
- Sessions automatically timeout after 10 minutes
- The minimal implementation has no complex state management
- PipeCat Cloud is just a room factory - all session management is handled locally

## Development

The app uses WebSockets to communicate between the backend and frontend, ensuring real-time updates when webhook posts are received. When a correct answer is received, the app automatically advances to the next question after a 2-second delay.
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { parseSpokenNumber } from './numberParser';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve React build files
const buildPath = path.join(__dirname, '../../build');
app.use(express.static(buildPath));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface WebhookPayload {
  number?: number;
  transcription?: string;
  timestamp?: string;
  last_question?: string | null;
  [key: string]: any;
}

const clients = new Set<WebSocket>();

// Debouncing: track last webhook time
let lastWebhookTime = 0;
const DEBOUNCE_MS = 900;

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');
  clients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Send a ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

app.post('/webhook', (req, res) => {
  const payload: WebhookPayload = req.body;
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  // Debounce: ignore if too soon after last webhook
  if (now - lastWebhookTime < DEBOUNCE_MS) {
    console.log(`Ignoring webhook (debounced, ${now - lastWebhookTime}ms since last)`);
    return res.status(200).json({ success: true, debounced: true });
  }
  
  lastWebhookTime = now;
  console.log('Received webhook:', payload);

  // Try to parse the transcription if number seems wrong
  let finalAnswer = payload.number;
  if (payload.transcription && payload.number !== undefined) {
    const parsedNumber = parseSpokenNumber(payload.transcription);
    if (parsedNumber !== null && parsedNumber !== payload.number) {
      console.log(`Correcting number from ${payload.number} to ${parsedNumber} based on transcription "${payload.transcription}"`);
      finalAnswer = parsedNumber;
    }
  } else if (payload.transcription && payload.number === undefined) {
    // If no number provided, try to parse from transcription
    const parsedNumber = parseSpokenNumber(payload.transcription);
    if (parsedNumber !== null) {
      console.log(`Parsed number ${parsedNumber} from transcription "${payload.transcription}"`);
      finalAnswer = parsedNumber;
    }
  }

  // Transform the payload to match frontend expectations
  const transformedPayload = {
    answer: finalAnswer,
    transcription: payload.transcription,
    originalTimestamp: payload.timestamp,
    lastQuestion: payload.last_question
  };

  const message = {
    type: 'webhook',
    timestamp,
    payload: transformedPayload
  };

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  res.status(200).json({ success: true, received: payload });
});

app.post('/api/answer', (req, res) => {
  const payload: WebhookPayload = req.body;
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  // Debounce: ignore if too soon after last webhook
  if (now - lastWebhookTime < DEBOUNCE_MS) {
    console.log(`Ignoring answer webhook (debounced, ${now - lastWebhookTime}ms since last)`);
    return res.status(200).json({ success: true, debounced: true });
  }
  
  lastWebhookTime = now;
  console.log('Received answer webhook:', payload);

  const message = {
    type: 'answer',
    timestamp,
    payload
  };

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  res.status(200).json({ success: true, received: payload });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clients: clients.size });
});

// Catch all - serve React app for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Webhook endpoints available at /webhook and /api/answer`);
  console.log(`WebSocket endpoint available at ws://[your-domain]/`);
});
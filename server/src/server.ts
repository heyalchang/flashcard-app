import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { parseSpokenNumber } from './numberParser';
import { pipecatService } from './pipecatService';

const app = express();
const port = process.env.PORT || 3051;

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow all origins in production (ALB handles security)
    : 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve React build files
  const buildPath = path.join(__dirname, '../../build');
  app.use(express.static(buildPath));
  console.log('Serving static files from:', buildPath);
}

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
});

app.post('/webhook', async (req, res) => {
  const payload: WebhookPayload = req.body;
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  // Check for goodbye in transcription
  if (payload.transcription?.toLowerCase().includes('goodbye')) {
    console.log('Goodbye detected in transcription:', payload.transcription);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Try to find user ID from metadata
    const userId = payload.metadata?.userId || payload.userId;
    const sessionId = payload.metadata?.session_id || payload.session_id;
    
    // Broadcast disconnect signal to all clients
    const disconnectMessage = {
      type: 'voice_disconnect',
      timestamp,
      sessionId,
      userId,
      reason: 'user_goodbye'
    };
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(disconnectMessage));
      }
    });
    
    // End all active sessions (since we might not have the exact session ID)
    // This is safer than trying to match a specific session
    setTimeout(async () => {
      console.log('Ending all active voice sessions after goodbye');
      const activeSessions = pipecatService.getActiveSessions();
      for (const [uid, session] of activeSessions) {
        console.log(`Ending session for user ${uid}`);
        await pipecatService.endSession(uid, 'goodbye');
      }
    }, 2000);
    
    return res.status(200).json({ success: true, goodbye: true });
  }
  
  // Check if session is muted
  const sessionId = payload.metadata?.session_id || payload.session_id;
  if (sessionId) {
    const userId = pipecatService.getUserIdByPipecatId(sessionId);
    if (userId && pipecatService.isMuted(userId)) {
      console.log('Ignoring webhook from muted session');
      return res.status(200).json({ success: true, muted: true });
    }
  }
  
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
  res.json({ 
    status: 'ok', 
    clients: clients.size,
    pipecatConfigured: pipecatService.isConfigured(),
    activeSessions: pipecatService.getActiveSessions().size
  });
});

// Voice session endpoints
app.post('/api/voice/session', async (req, res) => {
  try {
    const userId = req.body.userId || `user-${Date.now()}`;
    
    if (!pipecatService.isConfigured()) {
      return res.status(503).json({ 
        error: 'PipeCat service not configured',
        message: 'PIPECAT_API_KEY environment variable is missing'
      });
    }
    
    const session = await pipecatService.createSession(userId);
    
    // Map snake_case to camelCase for frontend
    res.json({
      sessionId: session.session_id,
      roomUrl: session.room_url,  // Map room_url -> roomUrl for frontend
      token: session.token,
      expiresAt: session.expiresAt,
      remainingTime: pipecatService.getRemainingTime(userId)
    });
  } catch (error: any) {
    console.error('Failed to create voice session:', error);
    res.status(500).json({ 
      error: 'Failed to create voice session',
      message: error.message || 'Unknown error'
    });
  }
});

app.delete('/api/voice/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = pipecatService.getUserIdByPipecatId(sessionId);
    
    if (userId) {
      await pipecatService.endSession(userId, 'user_initiated');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    console.error('Failed to end voice session:', error);
    res.status(500).json({ error: 'Failed to end voice session' });
  }
});

app.post('/api/voice/mute', (req, res) => {
  const { sessionId, isMuted } = req.body;
  const userId = pipecatService.getUserIdByPipecatId(sessionId);
  
  if (userId) {
    pipecatService.setMuteState(userId, isMuted);
    res.json({ success: true, isMuted });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.get('/api/voice/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const userId = pipecatService.getUserIdByPipecatId(sessionId);
  
  if (userId) {
    const session = pipecatService.getSession(userId);
    res.json({
      active: true,
      remainingTime: pipecatService.getRemainingTime(userId),
      isMuted: session?.isMuted || false
    });
  } else {
    res.json({ active: false });
  }
});

// IMPORTANT: Catch-all route MUST be last
// This serves the React app for any route not matched above
if (process.env.NODE_ENV === 'production') {
  // Express 5.x requires specific catch-all syntax
  app.use((req, res, next) => {
    // Only handle GET requests that aren't API calls
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/webhook')) {
      const indexPath = path.join(__dirname, '../../build', 'index.html');
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

server.listen(port, () => {
  const webhookUrl = process.env.WEBHOOK_URL || 'https://6e014b39f518.ngrok-free.app/api/answer';
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('========================================');
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log('========================================');
  console.log('Endpoints:');
  console.log(`  Webhook:     http://localhost:${port}/webhook`);
  console.log(`  Alt Webhook: http://localhost:${port}/api/answer`);
  console.log(`  Voice API:   http://localhost:${port}/api/voice/*`);
  console.log(`  WebSocket:   ws://localhost:${port}`);
  console.log('----------------------------------------');
  console.log('PipeCat Configuration:');
  console.log(`  API Key:     ${pipecatService.isConfigured() ? '✓ Configured' : '✗ Missing'}`);
  console.log(`  Agent Name:  ${process.env.PIPECAT_AGENT_NAME || 'my-first-agent'}`);
  console.log(`  Webhook URL: ${webhookUrl}`);
  if (isProduction) {
    console.log('----------------------------------------');
    console.log('Static Files:');
    console.log(`  Serving React app from /build directory`);
    console.log(`  All routes fallback to index.html`);
  }
  console.log('========================================');
});
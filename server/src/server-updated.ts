import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import { parseSpokenNumber } from './numberParser';
import { pipecatService } from './pipecatService';
import configManager from './config';

// Initialize configuration and load secrets
async function initializeApp() {
  // Load secrets from AWS Secrets Manager if in production
  await configManager.loadSecrets();
  
  const app = express();
  const port = configManager.getPort();
  const corsOrigin = configManager.getCorsOrigin();

  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

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
      activeSessions: pipecatService.getActiveSessions().size,
      environment: configManager.isProduction() ? 'production' : 'development',
      features: {
        voiceMode: configManager.isFeatureEnabled('voice_mode'),
        practiceMode: configManager.isFeatureEnabled('practice_mode')
      }
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

  server.listen(port, () => {
    const webhookUrl = configManager.getWebhookUrl();
    const isProduction = configManager.isProduction();
    
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
    console.log(`  API Key:     ${configManager.getPipecatApiKey() ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  Agent Name:  ${configManager.get('pipecat.agent_name')}`);
    console.log(`  Webhook URL: ${webhookUrl}`);
    console.log('----------------------------------------');
    console.log('Features:');
    console.log(`  Voice Mode:    ${configManager.isFeatureEnabled('voice_mode') ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`  Practice Mode: ${configManager.isFeatureEnabled('practice_mode') ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`  Debug Mode:    ${configManager.isFeatureEnabled('debug_mode') ? '✓ Enabled' : '✗ Disabled'}`);
    console.log('========================================');
  });
}

// Start the application
initializeApp().catch(error => {
  console.error('Failed to initialize application:', error);
  process.exit(1);
});
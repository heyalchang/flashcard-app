import fetch from 'node-fetch';

interface PipeCatSession {
  session_id: string;
  room_url: string;
  token: string;
  expires_at?: string;
}

interface SessionMetadata {
  user_id: string;
  max_duration: number;
  webhook_url?: string;
  created_at: string;
}

interface StoredSession extends PipeCatSession {
  userId: string;
  createdAt: number;
  expiresAt: number;
  timeoutId?: NodeJS.Timeout;
  isMuted?: boolean;
}

class PipeCatService {
  private readonly API_URL = 'https://api.pipecat.daily.co/v1';
  private readonly API_KEY = process.env.PIPECAT_API_KEY || '';
  private readonly AGENT_NAME = process.env.PIPECAT_AGENT_NAME || 'my-first-agent';
  private readonly MAX_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes
  
  private activeSessions = new Map<string, StoredSession>();
  private sessionsByPipecatId = new Map<string, string>(); // pipecatId -> userId

  constructor() {
    if (!this.API_KEY) {
      console.error('WARNING: PIPECAT_API_KEY not set');
    }
    
    // Cleanup on shutdown
    process.on('SIGTERM', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
  }

  async createSession(userId: string): Promise<StoredSession> {
    try {
      // If user has an existing session, end it first
      if (this.activeSessions.has(userId)) {
        console.log(`User ${userId} has existing session, ending it first`);
        await this.endSession(userId, 'new_session_requested');
      }

      console.log(`Creating PipeCat session for user ${userId}`);
      
      // Call PipeCat API to start a session
      const response = await fetch(`${this.API_URL}/public/${this.AGENT_NAME}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          createDailyRoom: true,
          metadata: {
            userId: userId,
            webhookUrl: process.env.WEBHOOK_URL || 'https://6e014b39f518.ngrok-free.app/api/answer'
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PipeCat API error: ${response.status} - ${error}`);
      }

      const responseData = await response.json();
      console.log('PipeCat API response:', responseData);
      
      // Map the response to our session format
      // PipeCat returns dailyRoomUrl and dailyToken
      const pipecatSession: PipeCatSession = {
        session_id: `session-${userId}-${Date.now()}`, // Generate our own session ID
        room_url: responseData.dailyRoom || responseData.room_url,
        token: responseData.dailyToken || responseData.token,
        expires_at: responseData.expires_at
      };
      
      // Create stored session with additional metadata
      const storedSession: StoredSession = {
        ...pipecatSession,
        userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.MAX_SESSION_DURATION,
        isMuted: false
      };

      // Set timeout for automatic cleanup
      storedSession.timeoutId = setTimeout(() => {
        console.log(`Session timeout for user ${userId}`);
        this.endSession(userId, 'timeout');
      }, this.MAX_SESSION_DURATION);

      // Store session
      this.activeSessions.set(userId, storedSession);
      this.sessionsByPipecatId.set(pipecatSession.session_id, userId);

      console.log(`Session created: ${pipecatSession.session_id} for user ${userId}`);
      return storedSession;

    } catch (error) {
      console.error('Failed to create PipeCat session:', error);
      throw error;
    }
  }

  async endSession(userId: string, reason: string = 'user_initiated'): Promise<void> {
    const session = this.activeSessions.get(userId);
    if (!session) {
      console.log(`No active session for user ${userId}`);
      return;
    }

    console.log(`Ending session ${session.session_id} for user ${userId} (reason: ${reason})`);

    // Clear timeout
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // Note: PipeCat Cloud doesn't have a session end endpoint
    // The session will expire naturally or when the Daily room expires
    // We just clean up our local state
    console.log('Session ended locally (PipeCat session will expire naturally)');

    // Remove from active sessions
    this.activeSessions.delete(userId);
    this.sessionsByPipecatId.delete(session.session_id);
  }

  async listActiveSessions(): Promise<any> {
    // Note: Use CLI command `pcc agent sessions my-first-agent` to see active sessions
    // API doesn't provide a session list endpoint
    // Return our locally tracked sessions instead
    const sessions = Array.from(this.activeSessions.values()).map(session => ({
      userId: session.userId,
      sessionId: session.session_id,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      isMuted: session.isMuted
    }));
    
    console.log(`Local active sessions: ${sessions.length}`);
    return sessions;
  }

  setMuteState(userId: string, isMuted: boolean): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.isMuted = isMuted;
      console.log(`User ${userId} mute state: ${isMuted}`);
    }
  }

  isMuted(userId: string): boolean {
    return this.activeSessions.get(userId)?.isMuted || false;
  }

  getSession(userId: string): StoredSession | undefined {
    return this.activeSessions.get(userId);
  }

  getSessionByPipecatId(pipecatId: string): StoredSession | undefined {
    const userId = this.sessionsByPipecatId.get(pipecatId);
    if (userId) {
      return this.activeSessions.get(userId);
    }
    return undefined;
  }

  getUserIdByPipecatId(pipecatId: string): string | undefined {
    return this.sessionsByPipecatId.get(pipecatId);
  }

  getRemainingTime(userId: string): number {
    const session = this.activeSessions.get(userId);
    if (!session) return 0;
    
    const remaining = session.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up all active PipeCat sessions...');
    const promises = Array.from(this.activeSessions.keys()).map(userId =>
      this.endSession(userId, 'shutdown')
    );
    await Promise.all(promises);
    console.log('Cleanup complete');
  }

  // Helper method to validate API key
  isConfigured(): boolean {
    return !!this.API_KEY;
  }

  // Get all active sessions for monitoring
  getActiveSessions(): Map<string, StoredSession> {
    return new Map(this.activeSessions);
  }
}

// Export singleton instance
export const pipecatService = new PipeCatService();

// Export types
export type { PipeCatSession, StoredSession, SessionMetadata };
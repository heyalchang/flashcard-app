/**
 * Service for managing PipeCat Cloud agent interactions
 * Handles room creation, agent lifecycle, and configuration
 */

interface PipeCatConfig {
  agentUrl?: string;
  webhookUrl: string;
  useDaily: boolean;
  apiKey?: string;
}

interface AgentSession {
  roomUrl: string;
  token?: string;
  sessionId: string;
  createdAt: Date;
  expiresAt?: Date;
}

class PipeCatService {
  private config: PipeCatConfig;
  private currentSession: AgentSession | null = null;

  constructor(config?: Partial<PipeCatConfig>) {
    this.config = {
      agentUrl: config?.agentUrl || process.env.REACT_APP_PIPECAT_AGENT_URL,
      webhookUrl: config?.webhookUrl || process.env.REACT_APP_API_URL || 'http://localhost:3051',
      useDaily: config?.useDaily ?? true,
      apiKey: config?.apiKey || process.env.REACT_APP_PIPECAT_API_KEY
    };
  }

  /**
   * Creates a new agent session
   * In production, this would call PipeCat Cloud API to create a room
   */
  async createSession(): Promise<AgentSession> {
    // For local development with existing room URL
    if (process.env.REACT_APP_PIPECAT_ROOM_URL) {
      this.currentSession = {
        roomUrl: process.env.REACT_APP_PIPECAT_ROOM_URL,
        sessionId: `local-${Date.now()}`,
        createdAt: new Date()
      };
      return this.currentSession;
    }

    // In production, call PipeCat Cloud API
    if (this.config.agentUrl && this.config.apiKey) {
      try {
        const response = await fetch(`${this.config.agentUrl}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            webhook_url: `${this.config.webhookUrl}/webhook`,
            config: {
              min_number: 0,
              max_number: 99,
              debounce_ms: 500
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data = await response.json();
        this.currentSession = {
          roomUrl: data.room_url,
          token: data.token,
          sessionId: data.session_id,
          createdAt: new Date(),
          expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
        };

        return this.currentSession;
      } catch (error) {
        console.error('Failed to create PipeCat session:', error);
        throw error;
      }
    }

    throw new Error('PipeCat Cloud configuration missing');
  }

  /**
   * Gets the current session or creates a new one
   */
  async getOrCreateSession(): Promise<AgentSession> {
    // Check if current session is still valid
    if (this.currentSession) {
      if (!this.currentSession.expiresAt || 
          this.currentSession.expiresAt > new Date()) {
        return this.currentSession;
      }
    }

    return this.createSession();
  }

  /**
   * Ends the current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    // In production, notify PipeCat Cloud
    if (this.config.agentUrl && this.config.apiKey) {
      try {
        await fetch(`${this.config.agentUrl}/sessions/${this.currentSession.sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        });
      } catch (error) {
        console.error('Failed to end PipeCat session:', error);
      }
    }

    this.currentSession = null;
  }

  /**
   * Gets the webhook URL for the current deployment
   */
  getWebhookUrl(): string {
    return `${this.config.webhookUrl}/webhook`;
  }

  /**
   * Checks if PipeCat is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.REACT_APP_PIPECAT_ROOM_URL || 
             (this.config.agentUrl && this.config.apiKey));
  }
}

// Export singleton instance
export const pipecatService = new PipeCatService();

// Export type for use in components
export type { AgentSession, PipeCatConfig };
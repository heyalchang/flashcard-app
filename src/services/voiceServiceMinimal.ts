// @ts-ignore - Daily types not installed
import DailyIframe from '@daily-co/daily-js';

/**
 * Minimal Voice Service
 * - Get room from backend
 * - Connect via Daily
 * - Handle disconnect
 * That's it.
 */
class VoiceServiceMinimal {
  private daily: any = null;
  private roomUrl: string | null = null;
  private token: string | null = null;
  private userId: string;

  constructor() {
    // Generate or retrieve user ID
    let userId = sessionStorage.getItem('voice_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('voice_user_id', userId);
    }
    this.userId = userId;
  }

  /**
   * Start voice session
   */
  async start(iframeElement: HTMLIFrameElement): Promise<void> {
    try {
      // 1. Get room from backend
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to start voice';
        
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          // If response isn't JSON, use status text
          errorMessage = `Server error: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const { roomUrl, token } = await response.json();
      this.roomUrl = roomUrl;
      this.token = token;

      // 2. Set iframe source
      iframeElement.src = roomUrl;
      
      // 3. Wait for load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Iframe timeout')), 5000);
        iframeElement.onload = () => {
          clearTimeout(timeout);
          resolve(undefined);
        };
      });

      // 4. Initialize Daily
      this.daily = DailyIframe.wrap(iframeElement);

      // 5. Join room
      await this.daily.join({ url: roomUrl, token });
      
      // 6. Setup basic events
      this.daily.on('left-meeting', () => {
        this.cleanup();
      });

    } catch (error: any) {
      this.cleanup();
      
      // Add user-friendly error messages
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Is the backend running on port 3051?');
      }
      
      throw error;
    }
  }

  /**
   * End voice session
   */
  async stop(): Promise<void> {
    if (this.daily) {
      try {
        await this.daily.leave();
      } catch (error) {
        console.error('Error leaving Daily room:', error);
      }
    }

    // Notify backend
    try {
      await fetch(`/api/voice/session/${this.userId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error ending backend session:', error);
    }

    this.cleanup();
  }

  /**
   * Toggle mute
   */
  async toggleMute(muted: boolean): Promise<void> {
    if (!this.daily) return;
    
    this.daily.setLocalAudio(!muted);
    
    // Notify backend (optional)
    try {
      await fetch('/api/voice/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, isMuted: muted })
      });
    } catch (error) {
      console.error('Failed to update mute state:', error);
    }
  }

  /**
   * Check if active
   */
  isActive(): boolean {
    return this.daily !== null;
  }

  /**
   * Get Daily instance for advanced features
   */
  getDaily(): any {
    return this.daily;
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    this.daily = null;
    this.roomUrl = null;
    this.token = null;
  }
}

// Export singleton
export const voiceService = new VoiceServiceMinimal();
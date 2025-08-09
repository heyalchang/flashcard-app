// @ts-ignore - Daily types not installed
import DailyIframe from '@daily-co/daily-js';

interface VoiceSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  expiresAt: number;
  remainingTime: number;
}

class VoiceService {
  private daily: any = null;
  private session: VoiceSession | null = null;
  private isMuted: boolean = false;
  private voiceLevelHistory: number[] = [];
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3051';
    
    // Listen for WebSocket messages about disconnection
    this.setupWebSocketListener();
  }

  private setupWebSocketListener() {
    // Listen for goodbye detection from WebSocket
    window.addEventListener('websocket_message' as any, (event: CustomEvent) => {
      const message = event.detail;
      if (message.type === 'voice_disconnect') {
        // Handle goodbye even if session ID doesn't match or is missing
        // This is safer since we might not always have the correct session ID
        console.log('Voice disconnect received:', message);
        if (this.session) {
          this.handleGoodbyeDetected();
        }
      }
    });
  }

  private emitEvent(type: string, data: any = {}) {
    window.dispatchEvent(new CustomEvent('voice_event', {
      detail: { type, data }
    }));
  }

  async startSession(containerElement: HTMLElement): Promise<void> {
    try {
      // Clean up any existing session first
      if (this.daily) {
        console.log('Cleaning up existing Daily instance before creating new one');
        await this.cleanup();
      }

      // Clear the container of any existing iframes
      containerElement.innerHTML = '';

      // Call backend to create PipeCat session
      const response = await fetch(`${this.apiUrl}/api/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.getUserId()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create voice session');
      }

      this.session = await response.json();
      
      // Create Daily call object inside the container
      // Daily SDK will create and manage its own iframe
      this.daily = DailyIframe.createFrame(containerElement, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px'
        },
        showLeaveButton: false,
        showFullscreenButton: false
      });

      // Setup Daily event listeners
      this.setupDailyEvents();

      // Join the room with token
      await this.daily.join({
        url: this.session!.roomUrl,
        token: this.session!.token
      });

    } catch (error) {
      console.error('Failed to start voice session:', error);
      await this.cleanup();
      throw error;
    }
  }

  private setupDailyEvents() {
    if (!this.daily) return;

    // Connection events
    this.daily.on('joined-meeting', () => {
      console.log('Joined Daily meeting');
      this.emitEvent('state_changed', { state: 'active' });
    });

    this.daily.on('left-meeting', () => {
      console.log('Left Daily meeting');
      this.emitEvent('state_changed', { state: 'off' });
      this.cleanup();
    });
    
    // Detect when remote participant (bot) leaves
    this.daily.on('participant-left', (event: any) => {
      if (!event.participant.local) {
        console.log('Bot left the meeting - likely said goodbye');
        this.handleGoodbyeDetected();
      }
    });

    this.daily.on('error', (error: any) => {
      console.error('Daily error:', error);
      this.emitEvent('error', { message: error.errorMsg || 'Connection error' });
    });

    // Audio level monitoring for voice activity
    this.daily.on('participant-updated', (event: any) => {
      if (event.participant.local) {
        const audioLevel = event.participant.audioLevel || 0;
        
        // Smooth the audio level
        this.voiceLevelHistory.push(audioLevel);
        if (this.voiceLevelHistory.length > 5) {
          this.voiceLevelHistory.shift();
        }
        
        const avgLevel = this.voiceLevelHistory.reduce((a, b) => a + b, 0) / this.voiceLevelHistory.length;
        this.emitEvent('voice_level', { level: avgLevel });
      }
    });

    // Network quality monitoring
    this.daily.on('network-quality-change', (event: any) => {
      if (event.quality < 50) {
        this.emitEvent('warning', { message: 'Poor network connection' });
      }
    });
  }

  async toggleMute(): Promise<void> {
    if (!this.daily || !this.session) {
      throw new Error('No active voice session');
    }

    this.isMuted = !this.isMuted;
    this.daily.setLocalAudio(!this.isMuted);

    // Notify backend about mute state
    try {
      await fetch(`${this.apiUrl}/api/voice/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.session.sessionId,
          isMuted: this.isMuted
        })
      });
    } catch (error) {
      console.error('Failed to update mute state on backend:', error);
    }

    return;
  }

  async endSession(reason: string = 'user_initiated'): Promise<void> {
    console.log(`Ending voice session: ${reason}`);
    
    // Stop accepting new input
    const sessionId = this.session?.sessionId;
    
    // Leave Daily room first
    if (this.daily) {
      try {
        await this.daily.leave();
      } catch (error) {
        console.error('Error leaving Daily room:', error);
      }
    }

    // Wait briefly for final webhooks to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // End PipeCat session on backend
    if (sessionId) {
      try {
        await fetch(`${this.apiUrl}/api/voice/session/${sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to end PipeCat session:', error);
      }
    }

    await this.cleanup();
  }

  private async handleGoodbyeDetected() {
    console.log('Goodbye detected via webhook');
    this.emitEvent('goodbye_detected', {});
    // The component will call endSession
  }

  private async cleanup(): Promise<void> {
    // Destroy the Daily frame if it exists
    if (this.daily) {
      try {
        // Remove all event listeners first to prevent callbacks
        this.daily.off('joined-meeting');
        this.daily.off('left-meeting');
        this.daily.off('error');
        this.daily.off('participant-updated');
        this.daily.off('network-quality-change');
        
        // First leave the meeting if we're in one
        const meetingState = this.daily.meetingState();
        if (meetingState === 'joined-meeting' || meetingState === 'joining-meeting') {
          await this.daily.leave();
        }
        
        // Then destroy the frame
        await this.daily.destroy();
      } catch (error) {
        console.error('Error destroying Daily frame:', error);
        // Force cleanup even if destroy fails
      } finally {
        // Always null out the reference
        this.daily = null;
      }
    }
    
    this.daily = null;
    this.session = null;
    this.isMuted = false;
    this.voiceLevelHistory = [];
  }

  private getUserId(): string {
    // Get or create a user ID for this session
    let userId = sessionStorage.getItem('voice_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('voice_user_id', userId);
    }
    return userId;
  }

  isActive(): boolean {
    return this.session !== null && this.daily !== null;
  }

  getSession(): VoiceSession | null {
    return this.session;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

// Export types
export type { VoiceSession };
import React, { useState, useRef, useEffect } from 'react';
import './VoiceMode.css';
import { voiceService } from '../services/voiceServiceMinimal';

/**
 * Minimal Voice Mode Component
 * - Start/stop button
 * - Mute toggle
 * - 10-minute timer
 * - Minimal iframe
 */
const VoiceModeMinimal: React.FC = () => {
  const [state, setState] = useState<'off' | 'connecting' | 'active' | 'error'>('off');
  const [isMuted, setIsMuted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [error, setError] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds as MM:SS
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Start timer when active
  useEffect(() => {
    if (state === 'active') {
      setTimeRemaining(600);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  // Listen for goodbye from WebSocket
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const message = event.detail;
      if (message.type === 'voice_disconnect') {
        console.log('Goodbye detected, ending session');
        handleStop();
      }
    };

    window.addEventListener('websocket_message' as any, handleMessage);
    return () => {
      window.removeEventListener('websocket_message' as any, handleMessage);
    };
  }, []);

  const handleStart = async () => {
    if (!iframeRef.current) return;
    
    setState('connecting');
    setError(null);
    
    try {
      await voiceService.start(iframeRef.current);
      setState('active');
      
      // Listen for Daily events
      const daily = voiceService.getDaily();
      if (daily) {
        daily.on('left-meeting', () => {
          setState('off');
        });
      }
    } catch (error: any) {
      console.error('Failed to start voice:', error);
      
      // Set user-friendly error message
      let errorMessage = error.message || 'Failed to start voice';
      
      // Add specific guidance for common errors
      if (errorMessage.includes('backend running')) {
        errorMessage = '❌ Backend not running. Start the server with: cd server && npm run dev:minimal';
      } else if (errorMessage.includes('API key')) {
        errorMessage = '❌ Invalid PipeCat API key. Check server/.env file';
      } else if (errorMessage.includes('not found')) {
        errorMessage = '❌ PipeCat agent not found. Check PIPECAT_AGENT_NAME in server/.env';
      } else if (errorMessage.includes('Rate limit')) {
        errorMessage = '❌ Too many requests. Please wait a moment and try again';
      }
      
      setError(errorMessage);
      setState('error');
      setTimeout(() => {
        setState('off');
        setError(null);
      }, 5000); // Show error for 5 seconds
    }
  };

  const handleStop = async () => {
    try {
      await voiceService.stop();
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
    setState('off');
    setIsMuted(false);
    setTimeRemaining(600);
  };

  const handleToggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await voiceService.toggleMute(newMuted);
  };

  return (
    <div className="voice-mode-container">
      {/* Main Button */}
      <button 
        className={`voice-mode-btn ${state}`}
        onClick={state === 'off' ? handleStart : handleStop}
        disabled={state === 'connecting'}
      >
        {state === 'off' && '🎤 Start Voice Mode'}
        {state === 'connecting' && '⟳ Connecting...'}
        {state === 'active' && '🔊 Voice Active - Click to Stop'}
        {state === 'error' && '⚠️ Error - Click to Reset'}
      </button>

      {/* Error */}
      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}

      {/* Active Controls */}
      {state === 'active' && (
        <div className="voice-controls">
          <button 
            onClick={handleToggleMute}
            className={`mute-btn ${isMuted ? 'muted' : ''}`}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          
          <div className="session-timer">
            <span className="timer-value">{formatTime(timeRemaining)}</span>
            <span className="timer-label">remaining</span>
          </div>
          
          <div className="voice-instructions">
            Say "goodbye" to end
          </div>
        </div>
      )}

      {/* Hidden iframe (required for Daily) */}
      <div style={{ display: state === 'off' ? 'none' : 'block' }}>
        <div className="daily-frame-container">
          <div className="frame-header">
            <span>Voice Connection</span>
          </div>
          <iframe
            ref={iframeRef}
            title="Voice Connection"
            className="daily-frame-minimal"
            allow="microphone; camera; autoplay"
            style={{ width: '320px', height: '180px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceModeMinimal;
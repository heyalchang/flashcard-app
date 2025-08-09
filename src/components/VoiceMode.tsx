import React, { useState, useEffect, useRef } from 'react';
import './VoiceMode.css';
import { voiceService } from '../services/voiceService';

export type VoiceState = 'off' | 'connecting' | 'active' | 'disconnecting' | 'error';

const VoiceMode: React.FC = () => {
  const [state, setState] = useState<VoiceState>('off');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [isMuted, setIsMuted] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFrameMinimized, setIsFrameMinimized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  // Start countdown timer when active
  useEffect(() => {
    if (state === 'active') {
      setTimeRemaining(600); // Reset to 10 minutes
      
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndVoice('timeout');
            return 0;
          }
          
          // Show warning at 1 minute
          if (prev === 60) {
            setError('Session ending in 1 minute');
            setTimeout(() => setError(null), 5000);
          }
          
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [state]);

  // Handle voice service events
  useEffect(() => {
    const handleVoiceEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'state_changed':
          setState(data.state);
          setIsInitializing(false); // Clear initialization flag when state changes
          break;
        case 'voice_level':
          setVoiceLevel(data.level);
          break;
        case 'error':
          setError(data.message);
          setState('error');
          setIsInitializing(false);
          break;
        case 'goodbye_detected':
          handleEndVoice('goodbye');
          break;
      }
    };

    window.addEventListener('voice_event' as any, handleVoiceEvent);
    return () => {
      window.removeEventListener('voice_event' as any, handleVoiceEvent);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // If voice is active when component unmounts, end the session
      if (voiceService.isActive()) {
        console.log('Cleaning up voice session on component unmount');
        voiceService.endSession('component_unmount');
      }
    };
  }, []);

  const handleStartVoice = async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializing || state === 'connecting') {
      console.log('Already initializing voice session');
      return;
    }

    setIsInitializing(true);
    setState('connecting');
    setError(null);
    
    try {
      if (!containerRef.current) {
        throw new Error('Container not ready');
      }
      await voiceService.startSession(containerRef.current);
      // State will be updated via event
    } catch (error: any) {
      console.error('Failed to start voice session:', error);
      setError(error.message || 'Failed to start voice session');
      setState('error');
      
      // Auto-reset to off after error
      setTimeout(() => {
        setState('off');
        setError(null);
      }, 3000);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleEndVoice = async (reason: string = 'user_initiated') => {
    setState('disconnecting');
    setIsInitializing(false); // Reset initialization flag
    
    try {
      await voiceService.endSession(reason);
      setState('off');
      setTimeRemaining(600);
      setIsMuted(false);
      setVoiceLevel(0);
      setError(null);
      setIsFrameMinimized(false);
    } catch (error: any) {
      console.error('Failed to end voice session:', error);
      setError('Failed to end session cleanly');
      setState('off');
    }
  };

  const handleToggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    try {
      await voiceService.toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      setIsMuted(!newMuted); // Revert on error
    }
  };

  const getButtonClass = () => {
    const classes = ['voice-mode-btn'];
    if (state === 'connecting' || state === 'disconnecting') {
      classes.push('pulsing');
    }
    if (state === 'active') {
      classes.push('active');
    }
    if (state === 'error') {
      classes.push('error');
    }
    return classes.join(' ');
  };

  const getVoiceLevelClass = () => {
    if (voiceLevel < 0.05) return 'silent';
    if (voiceLevel < 0.15) return 'noise';
    return 'speaking';
  };

  return (
    <div className="voice-mode-container">
      {/* Main Control Button */}
      <button 
        className={getButtonClass()}
        onClick={state === 'off' ? handleStartVoice : () => handleEndVoice()}
        disabled={state === 'connecting' || state === 'disconnecting' || isInitializing}
      >
        {state === 'off' && '🎤 Start Voice Mode'}
        {state === 'connecting' && '⟳ Connecting...'}
        {state === 'active' && '🔊 Voice Active'}
        {state === 'disconnecting' && '⟳ Ending...'}
        {state === 'error' && '⚠️ Error - Click to reset'}
      </button>
      
      {/* Error Display */}
      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}
      
      {/* Active Session Controls */}
      {state === 'active' && (
        <div className="voice-controls">
          {/* Mute Button */}
          <button 
            onClick={handleToggleMute} 
            className={`mute-btn ${isMuted ? 'muted' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          
          {/* Voice Activity Indicator */}
          <div className="voice-indicator" title="Voice activity">
            <div 
              className={`activity-bar ${getVoiceLevelClass()}`}
              style={{ height: `${Math.min(100, voiceLevel * 200)}%` }}
            />
          </div>
          
          {/* Session Timer */}
          <div className="session-timer">
            <span className="timer-value">{formatTime(timeRemaining)}</span>
            <span className="timer-label">remaining</span>
            {timeRemaining <= 60 && (
              <span className="timer-warning">⚠️</span>
            )}
          </div>
          
          {/* Instructions */}
          <div className="voice-instructions">
            Say "goodbye" to end • Click button to stop
          </div>
        </div>
      )}
      
      {/* Daily Container - Always rendered but hidden when not in use */}
      <div 
        className={`daily-frame-container ${(state === 'connecting' || state === 'active') ? 'visible' : 'hidden'} ${isFrameMinimized ? 'minimized' : ''}`}
      >
        <div className="frame-header">
          <span className="frame-title">
            {state === 'connecting' ? 'Connecting to voice...' : state === 'active' ? 'Voice Connected' : 'Voice Mode'}
          </span>
          {(state === 'connecting' || state === 'active') && (
            <button 
              className="frame-minimize"
              onClick={() => setIsFrameMinimized(!isFrameMinimized)}
              title={isFrameMinimized ? 'Expand' : 'Minimize'}
            >
              {isFrameMinimized ? '□' : '_'}
            </button>
          )}
        </div>
        <div
          ref={containerRef}
          className="daily-container"
          style={{ 
            width: '100%', 
            height: isFrameMinimized ? '0' : '200px',
            overflow: 'hidden',
            position: 'relative',
            visibility: isFrameMinimized ? 'hidden' : 'visible'
          }}
        />
      </div>
    </div>
  );
};

export default VoiceMode;
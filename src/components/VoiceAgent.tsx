import React, { useEffect, useRef, useState } from 'react';

interface VoiceAgentProps {
  roomUrl?: string;
  enableAutoJoin?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  roomUrl, 
  enableAutoJoin = false,
  onConnectionChange 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get room URL from environment or props
  const agentRoomUrl = roomUrl || process.env.REACT_APP_PIPECAT_ROOM_URL;

  useEffect(() => {
    if (!agentRoomUrl) {
      setError('No PipeCat room URL configured');
      return;
    }

    // Listen for postMessage events from the iframe (Daily.co events)
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from Daily domain
      if (!event.origin.includes('daily.co')) return;

      // Handle Daily events
      if (event.data.type === 'daily-event') {
        switch (event.data.event) {
          case 'joined-meeting':
            setIsConnected(true);
            setIsLoading(false);
            onConnectionChange?.(true);
            break;
          case 'left-meeting':
            setIsConnected(false);
            onConnectionChange?.(false);
            break;
          case 'error':
            setError(event.data.error);
            setIsLoading(false);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [agentRoomUrl, onConnectionChange]);

  const handleJoinRoom = () => {
    if (!agentRoomUrl) {
      setError('No room URL available');
      return;
    }
    setIsLoading(true);
    setError(null);
  };

  if (!agentRoomUrl) {
    return (
      <div className="voice-agent-container">
        <div className="voice-agent-error">
          <p>Voice agent not configured</p>
          <small>Set REACT_APP_PIPECAT_ROOM_URL or pass roomUrl prop</small>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-agent-container">
      <div className="voice-agent-header">
        <h3>Voice Math Tutor</h3>
        <div className="voice-status">
          {isConnected ? (
            <span className="status-connected">● Connected</span>
          ) : (
            <span className="status-disconnected">● Disconnected</span>
          )}
        </div>
      </div>

      {error && (
        <div className="voice-agent-error">
          <p>Error: {error}</p>
        </div>
      )}

      {!isConnected && !isLoading && (
        <div className="voice-agent-controls">
          <button 
            onClick={handleJoinRoom}
            className="join-button"
          >
            Join Voice Session
          </button>
        </div>
      )}

      {(isLoading || isConnected || enableAutoJoin) && (
        <div className="voice-agent-frame">
          <iframe
            ref={iframeRef}
            src={agentRoomUrl}
            allow="microphone; camera; autoplay"
            style={{
              width: '100%',
              height: '400px',
              border: 'none',
              borderRadius: '8px'
            }}
            title="PipeCat Voice Agent"
          />
        </div>
      )}

      <div className="voice-agent-info">
        <p>Speak your answers to the math problems!</p>
        <small>The voice agent will detect numbers in your speech</small>
      </div>
    </div>
  );
};

export default VoiceAgent;
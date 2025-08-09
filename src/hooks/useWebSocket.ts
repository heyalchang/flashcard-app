import { useEffect, useState, useRef, useCallback } from 'react';
import { WebhookMessage } from '../types';

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebhookMessage | null;
  clearLastMessage: () => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebhookMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLastMessage = useCallback(() => {
    setLastMessage(null);
  }, []);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          // Emit event for voice service if it's a voice disconnect
          if (message.type === 'voice_disconnect') {
            window.dispatchEvent(new CustomEvent('websocket_message', {
              detail: message
            }));
          }
          
          // Only set as lastMessage if it's a webhook message
          if (message.type === 'webhook' || message.type === 'answer') {
            setLastMessage(message as WebhookMessage);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage, clearLastMessage };
}
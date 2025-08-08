import { Answer } from '../types/core';
import { DomainPlugin } from '../core/PluginSystem';

/**
 * Strategy interface for handling different input methods
 */
export interface InputHandler {
  /** Callback when answer is submitted */
  onSubmit?: (answer: Answer) => void;
  
  /** Enable input handling */
  enable(): void;
  
  /** Disable input handling */
  disable(): void;
  
  /** Clean up resources */
  cleanup(): void;
  
  /** Check if handler is currently enabled */
  isEnabled(): boolean;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseInputHandler implements InputHandler {
  protected enabled = false;
  onSubmit?: (answer: Answer) => void;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  abstract cleanup(): void;

  protected submitAnswer(answer: Answer): void {
    if (this.enabled && this.onSubmit) {
      this.onSubmit(answer);
    }
  }
}

/**
 * Keyboard input handler
 */
export class KeyboardInputHandler extends BaseInputHandler {
  private currentInput = '';
  private keyListener?: (e: KeyboardEvent) => void;

  constructor() {
    super();
    this.setupKeyboardListener();
  }

  private setupKeyboardListener(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.enabled) return;

      if (e.key >= '0' && e.key <= '9') {
        this.currentInput += e.key;
      } else if (e.key === 'Enter' && this.currentInput) {
        const value = parseInt(this.currentInput, 10);
        this.submitAnswer({
          value,
          type: 'number',
          raw: this.currentInput,
          inputMethod: 'keyboard',
          timestamp: Date.now()
        });
        this.currentInput = '';
      } else if (e.key === 'Backspace') {
        this.currentInput = this.currentInput.slice(0, -1);
      } else if (e.key === 'Escape') {
        this.currentInput = '';
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyListener);
    }
  }

  cleanup(): void {
    if (this.keyListener && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyListener);
    }
  }

  getCurrentInput(): string {
    return this.currentInput;
  }

  clearInput(): void {
    this.currentInput = '';
  }
}

/**
 * Touch/Click input handler (for TouchpadInput component)
 */
export class TouchInputHandler extends BaseInputHandler {
  private touchpadRef?: HTMLElement;

  setTouchpadElement(element: HTMLElement): void {
    this.touchpadRef = element;
  }

  // This handler works with the TouchpadInput component
  // The component will call submitAnswer directly
  handleTouchInput(value: number): void {
    if (!this.enabled) return;
    
    this.submitAnswer({
      value,
      type: 'number',
      raw: value.toString(),
      inputMethod: 'touch',
      timestamp: Date.now()
    });
  }

  cleanup(): void {
    this.touchpadRef = undefined;
  }
}

/**
 * Voice input handler
 */
export class VoiceInputHandler extends BaseInputHandler {
  private plugin: DomainPlugin;
  private websocket?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout?: NodeJS.Timeout;

  constructor(plugin: DomainPlugin, websocketUrl = 'ws://localhost:3001') {
    super();
    this.plugin = plugin;
    this.connectWebSocket(websocketUrl);
  }

  private connectWebSocket(url: string): void {
    try {
      this.websocket = new WebSocket(url);

      this.websocket.onopen = () => {
        console.log('Voice input WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.websocket.onmessage = (event) => {
        if (!this.enabled) return;

        try {
          const data = JSON.parse(event.data);
          
          // Parse the voice input using the plugin
          const answer = this.plugin.parseAnswer(
            data.payload?.answer || data.payload?.number || data.payload?.text,
            'voice'
          );

          if (answer !== null) {
            this.submitAnswer({
              value: answer,
              type: typeof answer,
              raw: data.payload?.text || data.payload?.answer?.toString(),
              inputMethod: 'voice',
              timestamp: Date.now(),
              metadata: { 
                originalTimestamp: data.timestamp
              }
            });
          }
        } catch (error) {
          console.error('Error processing voice input:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('Voice input WebSocket disconnected');
        this.attemptReconnect(url);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect(url);
    }
  }

  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket(url);
    }, delay);
  }

  cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }
}

/**
 * Combined input handler that accepts multiple input methods
 */
export class MultiInputHandler extends BaseInputHandler {
  private handlers: InputHandler[] = [];

  constructor(handlers: InputHandler[]) {
    super();
    this.handlers = handlers;
    
    // Forward submit events from all handlers
    handlers.forEach(handler => {
      handler.onSubmit = (answer) => this.submitAnswer(answer);
    });
  }

  enable(): void {
    super.enable();
    this.handlers.forEach(h => h.enable());
  }

  disable(): void {
    super.disable();
    this.handlers.forEach(h => h.disable());
  }

  cleanup(): void {
    this.handlers.forEach(h => h.cleanup());
  }

  addHandler(handler: InputHandler): void {
    handler.onSubmit = (answer) => this.submitAnswer(answer);
    this.handlers.push(handler);
    
    if (this.enabled) {
      handler.enable();
    }
  }

  removeHandler(handler: InputHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers[index].cleanup();
      this.handlers.splice(index, 1);
    }
  }
}

/**
 * Mock input handler for testing
 */
export class MockInputHandler extends BaseInputHandler {
  private simulatedAnswers: Answer[] = [];
  private currentIndex = 0;
  private autoSubmitInterval?: NodeJS.Timeout;

  constructor(answers: Answer[] = []) {
    super();
    this.simulatedAnswers = answers;
  }

  setAnswers(answers: Answer[]): void {
    this.simulatedAnswers = answers;
    this.currentIndex = 0;
  }

  simulateAnswer(answer: Answer): void {
    if (this.enabled) {
      this.submitAnswer(answer);
    }
  }

  simulateNextAnswer(): void {
    if (this.currentIndex < this.simulatedAnswers.length) {
      this.simulateAnswer(this.simulatedAnswers[this.currentIndex++]);
    }
  }

  startAutoSubmit(intervalMs = 2000): void {
    this.stopAutoSubmit();
    
    this.autoSubmitInterval = setInterval(() => {
      if (this.currentIndex < this.simulatedAnswers.length) {
        this.simulateNextAnswer();
      } else {
        this.stopAutoSubmit();
      }
    }, intervalMs);
  }

  stopAutoSubmit(): void {
    if (this.autoSubmitInterval) {
      clearInterval(this.autoSubmitInterval);
      this.autoSubmitInterval = undefined;
    }
  }

  cleanup(): void {
    this.stopAutoSubmit();
  }

  reset(): void {
    this.currentIndex = 0;
  }
}
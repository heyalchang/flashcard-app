export interface Question {
  id: string;
  expression: string;
  answer: number;
  operator: '+' | '-' | '×' | '÷';
  operand1: number;
  operand2: number;
}

export interface WebhookMessage {
  type: 'webhook';
  timestamp: string;
  payload: {
    answer?: number;
    transcription?: string;
    originalTimestamp?: string;
    lastQuestion?: string | null;
    [key: string]: any;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  payload: any;
  isCorrect?: boolean;
}
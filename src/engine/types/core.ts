/**
 * Core domain-agnostic types for the learning engine
 * These types can be used for any learning domain (math, language, coding, etc.)
 */

export interface Question<TContent = any, TAnswer = any> {
  id: string;
  type: string; // 'math', 'text', 'code', 'image', etc.
  content: TContent;
  correctAnswer: TAnswer;
  metadata?: Record<string, any>;
}

export interface Answer<T = any> {
  value: T;
  type?: string; // Type of answer (e.g., 'number', 'text', 'skip')
  raw?: string; // Original input before transformation
  timestamp?: number;
  inputMethod?: 'keyboard' | 'voice' | 'touch' | 'selection';
  confidence?: number;
  metadata?: Record<string, any>; // Additional metadata
}

export interface ProgressEntry {
  questionId: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  averageTime: number;
  lastAttempt: Date;
  mastery: number; // 0-1 scale
  streak: number;
}

export interface Session {
  id: string;
  userId: string;
  mode: PracticeMode;
  startTime: Date;
  endTime?: Date;
  questions: Question[];
  progress: Map<string, ProgressEntry>;
  metadata?: Record<string, any>;
}

export type PracticeMode = 
  | 'learn' 
  | 'practice' 
  | 'timed' 
  | 'accuracy' 
  | 'fluency' 
  | 'assessment';

export interface AttemptDetail {
  question: Question;
  userAnswer: any;
  isCorrect: boolean;
  responseTime: number; // in milliseconds
  timestamp: number;
}

export interface SessionSummary {
  sessionId: string;
  mode: PracticeMode;
  duration: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  averageResponseTime: number;
  masteryAchieved: string[]; // Question IDs that reached mastery
  progressEntries: ProgressEntry[];
  attemptDetails?: AttemptDetail[]; // Detailed list of all attempts
}

export interface FeedbackState {
  isCorrect: boolean;
  message?: string;
  correctAnswer?: any;
  explanation?: string;
  showNext?: boolean;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode | string;
  totalQuestions: number;
  masteredQuestions: number;
  locked: boolean;
  prerequisites?: string[]; // Track IDs that must be completed first
  metadata?: Record<string, any>;
}

export interface PlacementResult {
  recommendedTracks: string[];
  skillLevel: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  detailedScores: Record<string, number>;
}
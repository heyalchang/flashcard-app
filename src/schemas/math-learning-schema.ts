/**
 * Math Learning Engine Schema
 * 
 * This schema defines the complete data structure for the math learning engine,
 * including questions, answers, progress tracking, and user interactions.
 */

// ============================================================================
// Core Mathematical Entities
// ============================================================================

/**
 * Represents a mathematical operation
 */
export enum Operation {
  ADDITION = '+',
  SUBTRACTION = '-',
  MULTIPLICATION = '×',
  DIVISION = '÷',
  EXPONENTIATION = '^',
  MODULO = '%',
  SQUARE_ROOT = '√'
}

/**
 * Represents the difficulty level of a math problem
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',      // Single digit operations
  ELEMENTARY = 'elementary',   // Double digit, basic operations
  INTERMEDIATE = 'intermediate', // Mixed operations, larger numbers
  ADVANCED = 'advanced',       // Complex multi-step problems
  EXPERT = 'expert'           // Advanced concepts
}

/**
 * Represents fluency levels based on response time and accuracy
 */
export enum FluencyLevel {
  NOT_STARTED = 'not_started',     // Never attempted
  LEARNING = 'learning',            // 0-20% mastery
  ACCURACY = 'accuracy',            // 20-40% mastery, focus on correct answers
  FLUENCY_6S = 'fluency_6s',        // 40-60% mastery, answering within 6 seconds
  FLUENCY_3S_2S = 'fluency_3s_2s',  // 60-80% mastery, answering within 2-3 seconds
  MASTERED = 'mastered'             // 80-100% mastery, consistent fast accurate responses
}

// ============================================================================
// Question Structure
// ============================================================================

/**
 * Core question content for math problems
 */
export interface MathQuestionContent {
  operand1: number;
  operand2: number;
  operation: Operation;
  
  // Optional fields for more complex problems
  operand3?: number;
  operation2?: Operation;
  
  // Display preferences
  displayFormat?: 'horizontal' | 'vertical' | 'word_problem';
  units?: string; // e.g., "apples", "meters", etc.
}

/**
 * Complete math question structure
 */
export interface MathQuestion {
  id: string;                      // Unique identifier
  content: MathQuestionContent;
  correctAnswer: number;
  
  // Metadata
  difficulty: DifficultyLevel;
  tags: string[];                  // e.g., ["multiplication", "single-digit", "times-table-3"]
  category: string;                // e.g., "multiplication_facts", "addition_with_regrouping"
  
  // Learning track association
  trackId: string;
  sequenceNumber: number;          // Position in learning sequence
  
  // Optional fields
  alternateAnswers?: number[];     // For questions with multiple valid answers
  hint?: string;
  explanation?: string;
  visualAidUrl?: string;           // Link to visual representation
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Answer and Response Tracking
// ============================================================================

/**
 * Input methods for capturing answers
 */
export enum InputMethod {
  KEYBOARD = 'keyboard',
  TOUCHPAD = 'touchpad',
  VOICE = 'voice',
  TOUCH_SCREEN = 'touch_screen',
  HANDWRITING = 'handwriting',
  MULTIPLE_CHOICE = 'multiple_choice'
}

/**
 * Represents a single answer attempt
 */
export interface AnswerAttempt {
  id: string;
  questionId: string;
  userId: string;
  sessionId: string;
  
  // Answer details
  userAnswer: number;
  isCorrect: boolean;
  correctAnswer: number;
  
  // Timing
  responseTime: number;            // Time in milliseconds
  timestamp: Date;
  
  // Input details
  inputMethod: InputMethod;
  rawInput?: string;               // Original input before parsing
  
  // Context
  attemptNumber: number;           // Which attempt for this question in session
  hintsUsed: number;
  
  // Performance metrics
  fluencyScore?: number;           // Calculated based on speed and accuracy
  confidenceRating?: number;       // Self-reported confidence (1-5)
}

// ============================================================================
// Progress and Mastery Tracking
// ============================================================================

/**
 * Progress entry for a specific question
 */
export interface QuestionProgress {
  questionId: string;
  userId: string;
  
  // Attempt history
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  
  // Timing metrics
  averageResponseTime: number;     // In milliseconds
  bestResponseTime: number;
  lastResponseTime: number;
  
  // Dates
  firstAttemptDate: Date;
  lastAttemptDate: Date;
  
  // Mastery calculation
  mastery: number;                 // 0-1 scale
  fluencyLevel: FluencyLevel;
  
  // Streak tracking
  currentStreak: number;
  bestStreak: number;
  
  // Recent performance (last 5 attempts)
  recentAttempts: {
    timestamp: Date;
    responseTime: number;
    isCorrect: boolean;
  }[];
  
  // Spaced repetition
  nextReviewDate?: Date;
  reviewInterval?: number;         // Days until next review
  easeFactor?: number;             // Difficulty adjustment for spaced repetition
}

/**
 * Grid cell data for visualization
 */
export interface GridCellData {
  id: string;                      // e.g., "3-4" for 3×4
  row: number;                     // operand1
  column: number;                  // operand2
  operation: Operation;
  
  // Display data
  displayValue: number;            // The answer
  displayEquation: string;         // e.g., "3 × 4 = 12"
  
  // Progress data
  mastery: number;
  fluencyLevel: FluencyLevel;
  lastAttemptDate?: Date;
  lastResponseTime?: number;
  totalAttempts: number;
  accuracy: number;                // Percentage
  
  // Visual state
  isHighlighted?: boolean;
  isSelected?: boolean;
  backgroundColor?: string;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Practice modes available in the system
 */
export enum PracticeMode {
  LEARN = 'learn',                 // Introduction to new concepts
  PRACTICE = 'practice',           // Standard practice
  TIMED_PRACTICE = 'timed',        // Time-pressure practice
  FLUENCY_PRACTICE = 'fluency',    // Focus on speed and accuracy
  ASSESSMENT = 'assessment',       // Placement or progress test
  REVIEW = 'review',               // Spaced repetition review
  CHALLENGE = 'challenge'          // Advanced problems
}

/**
 * Practice session configuration
 */
export interface SessionConfig {
  mode: PracticeMode;
  duration?: number;               // Minutes
  questionCount?: number;
  
  // Filtering
  operations?: Operation[];
  difficultyLevels?: DifficultyLevel[];
  operandRanges?: {
    min: number;
    max: number;
  }[];
  
  // Behavior
  allowHints: boolean;
  showFeedback: boolean;
  adaptiveDifficulty: boolean;
  
  // Timing
  timePerQuestion?: number;        // Seconds
  fluencyTargets?: {
    [key in FluencyLevel]?: number; // Target response time in ms
  };
}

/**
 * Complete practice session
 */
export interface PracticeSession {
  id: string;
  userId: string;
  
  // Configuration
  config: SessionConfig;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;          // Minutes
  pausedDuration?: number;         // Time spent paused
  
  // Questions and answers
  questions: MathQuestion[];
  attempts: AnswerAttempt[];
  
  // Performance summary
  totalQuestions: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;                // Percentage
  averageResponseTime: number;
  
  // Progress made
  masteryGained: number;           // Sum of mastery improvements
  newMasteredFacts: string[];      // Question IDs newly mastered
  
  // Session state
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  currentQuestionIndex?: number;
}

// ============================================================================
// User Profile and Settings
// ============================================================================

/**
 * User learning profile
 */
export interface UserProfile {
  id: string;
  username: string;
  
  // Demographics
  age?: number;
  gradeLevel?: string;
  
  // Preferences
  preferredInputMethod: InputMethod;
  dailyGoalMinutes: number;
  reminderTime?: string;           // e.g., "15:30"
  
  // Accessibility
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'high_contrast' | 'dark';
  soundEffects: boolean;
  voiceFeedback: boolean;
  
  // Learning settings
  showHints: boolean;
  adaptiveLearning: boolean;
  spacedRepetition: boolean;
}

/**
 * Overall user statistics
 */
export interface UserStatistics {
  userId: string;
  
  // Time tracking
  totalPracticeTime: number;       // Minutes
  dailyPracticeTime: number;
  weeklyPracticeTime: number;
  monthlyPracticeTime: number;
  currentStreak: number;           // Days
  longestStreak: number;
  
  // Performance
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;
  averageResponseTime: number;
  
  // Progress
  totalMasteredFacts: number;
  factsByFluencyLevel: {
    [key in FluencyLevel]: number;
  };
  
  // By operation
  performanceByOperation: {
    [key in Operation]?: {
      accuracy: number;
      averageResponseTime: number;
      masteredCount: number;
      totalCount: number;
    };
  };
  
  // Achievements
  achievementsUnlocked: string[];
  currentLevel: number;
  experiencePoints: number;
  
  // Dates
  accountCreatedDate: Date;
  lastActiveDate: Date;
}

// ============================================================================
// Learning Track Structure
// ============================================================================

/**
 * Learning track (curriculum path)
 */
export interface LearningTrack {
  id: string;
  name: string;
  description: string;
  
  // Metadata
  gradeLevel: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number;       // Hours to complete
  
  // Content
  operations: Operation[];
  operandRanges: {
    min: number;
    max: number;
  }[];
  totalQuestions: number;
  
  // Prerequisites
  prerequisiteTrackIds: string[];
  
  // Progress tracking
  sections: TrackSection[];
  
  // Visual
  iconUrl?: string;
  color?: string;
  
  // State
  isLocked: boolean;
  unlockCriteria?: string;
}

/**
 * Section within a learning track
 */
export interface TrackSection {
  id: string;
  trackId: string;
  name: string;
  sequenceNumber: number;
  
  // Content
  questionIds: string[];
  
  // Requirements
  masteryRequired: number;         // 0-1 scale
  minimumAccuracy: number;         // Percentage
  
  // Status
  isCompleted: boolean;
  completionDate?: Date;
}

// ============================================================================
// Analytics and Reporting
// ============================================================================

/**
 * Daily practice summary
 */
export interface DailyPracticeSummary {
  userId: string;
  date: Date;
  
  // Time
  totalMinutes: number;
  sessions: number;
  
  // Performance
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  
  // Progress
  factsReviewed: number;
  newFactsLearned: number;
  factsMastered: number;
  
  // By practice mode
  timeByMode: {
    [key in PracticeMode]?: number;
  };
  
  // Streaks
  dailyGoalMet: boolean;
  currentStreak: number;
}

/**
 * Progress report for a time period
 */
export interface ProgressReport {
  userId: string;
  startDate: Date;
  endDate: Date;
  
  // Overall metrics
  totalPracticeTime: number;
  totalSessions: number;
  averageSessionLength: number;
  
  // Performance trends
  accuracyTrend: number[];         // Daily accuracy values
  responseTimeTrend: number[];     // Daily average response times
  
  // Mastery progress
  startingMasteredFacts: number;
  endingMasteredFacts: number;
  masteryGrowth: number;
  
  // Detailed breakdown
  progressByOperation: {
    [key in Operation]?: {
      startMastery: number;
      endMastery: number;
      improvement: number;
      problemAreas: string[];      // Specific facts needing work
    };
  };
  
  // Recommendations
  strengths: string[];
  areasForImprovement: string[];
  recommendedFocusAreas: string[];
  suggestedNextTracks: string[];
}

// ============================================================================
// Real-time Events
// ============================================================================

/**
 * WebSocket event types for real-time updates
 */
export enum EventType {
  ANSWER_SUBMITTED = 'answer_submitted',
  QUESTION_DISPLAYED = 'question_displayed',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  GOAL_REACHED = 'goal_reached',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  MASTERY_ACHIEVED = 'mastery_achieved',
  VOICE_INPUT_RECEIVED = 'voice_input_received'
}

/**
 * Real-time event structure
 */
export interface LearningEvent {
  id: string;
  type: EventType;
  userId: string;
  timestamp: Date;
  
  // Event-specific data
  payload: {
    questionId?: string;
    answer?: number;
    responseTime?: number;
    isCorrect?: boolean;
    masteryLevel?: number;
    achievementId?: string;
    sessionId?: string;
    inputMethod?: InputMethod;
    [key: string]: any;
  };
  
  // Metadata
  deviceInfo?: {
    platform: string;
    version: string;
    screenSize?: string;
  };
}

// ============================================================================
// Export aggregated schema
// ============================================================================

export interface MathLearningEngineSchema {
  // Core entities
  questions: MathQuestion[];
  answers: AnswerAttempt[];
  progress: QuestionProgress[];
  
  // User data
  userProfile: UserProfile;
  userStatistics: UserStatistics;
  
  // Learning structure
  tracks: LearningTrack[];
  sections: TrackSection[];
  
  // Sessions
  sessions: PracticeSession[];
  currentSession?: PracticeSession;
  
  // Analytics
  dailySummaries: DailyPracticeSummary[];
  progressReports: ProgressReport[];
  
  // Real-time
  events: LearningEvent[];
  
  // UI State
  gridData: GridCellData[][];
  selectedCell?: GridCellData;
  
  // System metadata
  version: string;
  lastSync: Date;
}
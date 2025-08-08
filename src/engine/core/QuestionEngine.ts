/**
 * Question Engine - Core system for presenting questions and handling multi-modal answers
 * 
 * This engine is responsible for:
 * - Presenting questions to users
 * - Accepting answers via multiple input methods (voice, keyboard, touchpad)
 * - Validating answers
 * - Tracking progress
 * - Managing question flow
 */

import { 
  Question, 
  Answer, 
  SessionSummary, 
  ProgressEntry,
  PracticeMode 
} from '../types/core';

// Define SessionConfig locally
interface SessionConfig {
  mode?: PracticeMode;
  feedbackDuration?: number;
  [key: string]: any;
}
import { DomainPlugin } from './PluginSystem';
import { QuestionProvider } from '../strategies/QuestionProvider';
import { InputHandler } from '../strategies/InputHandler';
import { ProgressTracker } from '../strategies/ProgressTracker';

export interface QuestionEngineConfig {
  // Core components
  plugin: DomainPlugin;
  questionProvider: QuestionProvider;
  inputHandler: InputHandler;
  progressTracker: ProgressTracker;
  
  // Display callbacks
  onQuestionChange?: (question: Question | null) => void;
  onAnswerSubmit?: (answer: Answer, isCorrect: boolean) => void;
  onSessionComplete?: (summary: SessionSummary) => void;
  onProgressUpdate?: (progress: SessionSummary) => void;
  onHintRequested?: (hint: string) => void;
  
  // Session configuration
  sessionConfig?: SessionConfig;
}

/**
 * Question Engine - The core system for question/answer interactions
 */
export class QuestionEngine {
  private config: QuestionEngineConfig;
  private currentQuestion: Question | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private questionStartTime: number = 0;
  private sessionStartTime: number = 0;
  private pausedTime: number = 0;
  private pauseStartTime: number = 0;

  constructor(config: QuestionEngineConfig) {
    this.config = config;
    this.setupInputHandler();
  }

  /**
   * Configure the input handler to route answers to the engine
   */
  private setupInputHandler(): void {
    this.config.inputHandler.onSubmit = (answer: Answer) => {
      if (this.isRunning && !this.isPaused) {
        this.handleAnswer(answer);
      }
    };
  }

  /**
   * Start a new question session
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.sessionStartTime = Date.now();
    this.pausedTime = 0;
    
    // Reset progress tracker
    this.config.progressTracker.reset();
    
    // Enable input
    this.config.inputHandler.enable();
    
    // Load first question
    this.nextQuestion();
  }

  /**
   * Stop the current session
   */
  stop(): SessionSummary {
    this.isRunning = false;
    this.isPaused = false;
    
    // Disable input
    this.config.inputHandler.disable();
    
    // Calculate session duration
    const totalDuration = Date.now() - this.sessionStartTime - this.pausedTime;
    
    // Get final summary
    const summary = this.config.progressTracker.getSummary();
    summary.duration = totalDuration;
    
    // Notify completion
    this.config.onSessionComplete?.(summary);
    
    return summary;
  }

  /**
   * Pause the current session
   */
  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    this.config.inputHandler.disable();
  }

  /**
   * Resume a paused session
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    
    this.isPaused = false;
    this.pausedTime += Date.now() - this.pauseStartTime;
    this.config.inputHandler.enable();
  }

  /**
   * Load and display the next question
   */
  private nextQuestion(): void {
    // Get next question from provider
    const question = this.config.questionProvider.getNext();
    
    if (!question) {
      // No more questions - end session
      this.stop();
      return;
    }
    
    this.currentQuestion = question;
    this.questionStartTime = Date.now();
    
    // Notify UI to display the question
    this.config.onQuestionChange?.(question);
  }

  /**
   * Process an answer from any input method
   */
  private handleAnswer(answer: Answer): void {
    if (!this.isRunning || !this.currentQuestion) return;

    const timeSpent = Date.now() - this.questionStartTime;
    
    // Validate answer using plugin
    // Check if plugin has enhanced validation method
    let isCorrect: boolean;
    if ('validateAnswerWithQuestion' in this.config.plugin) {
      // Use enhanced validation with full question context
      isCorrect = (this.config.plugin as any).validateAnswerWithQuestion(
        answer,
        this.currentQuestion
      );
    } else {
      // Fall back to standard validation
      isCorrect = this.config.plugin.validateAnswer(
        answer,
        this.currentQuestion.correctAnswer
      );
    }

    // Record attempt in progress tracker
    this.config.progressTracker.recordAttempt(
      this.currentQuestion,
      answer,
      isCorrect,
      timeSpent
    );

    // Notify UI of answer result
    this.config.onAnswerSubmit?.(answer, isCorrect);
    
    // Update progress
    const progress = this.config.progressTracker.getSummary();
    this.config.onProgressUpdate?.(progress);

    // Handle post-answer flow based on mode
    this.handlePostAnswer(isCorrect);
  }

  /**
   * Handle what happens after an answer
   */
  private handlePostAnswer(isCorrect: boolean): void {
    // Disable input temporarily
    this.config.inputHandler.disable();

    // Determine feedback duration based on configuration
    let feedbackDuration = this.config.sessionConfig?.feedbackDuration || 1500;
    
    // In learn mode, might wait longer for incorrect answers
    if (this.config.sessionConfig?.mode === 'learn' && !isCorrect) {
      feedbackDuration = 3000;
    }

    // Move to next question after feedback
    setTimeout(() => {
      if (this.isRunning && !this.isPaused) {
        this.config.inputHandler.enable();
        this.nextQuestion();
      }
    }, feedbackDuration);
  }

  /**
   * Skip the current question
   */
  skipQuestion(): void {
    if (!this.isRunning || !this.currentQuestion) return;
    
    // Record as skipped
    const skipAnswer: Answer = {
      value: null,
      type: 'skip',
      timestamp: Date.now(),
      inputMethod: 'keyboard'
    };
    this.config.progressTracker.recordAttempt(
      this.currentQuestion,
      skipAnswer,
      false,
      Date.now() - this.questionStartTime
    );
    
    // Move to next question
    this.nextQuestion();
  }

  /**
   * Request a hint for the current question
   */
  requestHint(): void {
    if (!this.currentQuestion || !this.config.plugin.getHint) return;
    
    const progress = this.config.progressTracker.getProgress(this.currentQuestion.id);
    const attempts = progress?.attempts || 0;
    const hint = this.config.plugin.getHint(this.currentQuestion, attempts);
    
    this.config.onHintRequested?.(hint);
  }

  /**
   * Get current session progress
   */
  getProgress(): SessionSummary {
    return this.config.progressTracker.getSummary();
  }

  /**
   * Check if engine is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Check if engine is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }
}

/**
 * Factory function to create a Question Engine with mode-specific configuration
 */
export function createQuestionEngine(
  mode: PracticeMode,
  plugin: DomainPlugin,
  questions: Question[],
  options: Partial<QuestionEngineConfig> = {}
): QuestionEngine {
  // Import strategies
  const { SimpleQuestionProvider, AdaptiveQuestionProvider } = require('../strategies/QuestionProvider');
  const { SimpleProgressTracker, TimedProgressTracker } = require('../strategies/ProgressTracker');
  
  // Select appropriate strategies based on mode
  let questionProvider: QuestionProvider;
  let progressTracker: ProgressTracker;
  
  switch (mode) {
    case 'learn':
      // Sequential questions, detailed progress
      questionProvider = new SimpleQuestionProvider(questions);
      progressTracker = new SimpleProgressTracker();
      break;
      
    case 'practice':
      // Random questions, standard progress
      questionProvider = new SimpleQuestionProvider(questions, true); // randomize
      progressTracker = new SimpleProgressTracker();
      break;
      
    case 'timed':
      // Random questions with time tracking
      questionProvider = new SimpleQuestionProvider(questions, true);
      progressTracker = new TimedProgressTracker();
      break;
      
    case 'fluency':
      // Adaptive questions based on performance
      questionProvider = new AdaptiveQuestionProvider(questions);
      progressTracker = new SimpleProgressTracker();
      break;
      
    case 'assessment':
      // Fixed sequence for consistent testing
      questionProvider = new SimpleQuestionProvider(questions, false);
      progressTracker = new SimpleProgressTracker();
      break;
      
    default:
      questionProvider = new SimpleQuestionProvider(questions);
      progressTracker = new SimpleProgressTracker();
  }
  
  // Create engine configuration
  const config: QuestionEngineConfig = {
    plugin,
    questionProvider,
    progressTracker,
    inputHandler: options.inputHandler || new (require('../strategies/InputHandler').TouchInputHandler)(),
    sessionConfig: {
      mode,
      feedbackDuration: mode === 'fluency' ? 1000 : 1500,
      ...options.sessionConfig
    },
    ...options
  };
  
  return new QuestionEngine(config);
}
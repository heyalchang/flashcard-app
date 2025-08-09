import { Question, Answer, SessionSummary, PracticeMode } from '../types/core';
import { QuestionProvider } from '../strategies/QuestionProvider';
import { InputHandler } from '../strategies/InputHandler';
import { ProgressTracker } from '../strategies/ProgressTracker';
import { DomainPlugin } from './PluginSystem';

export interface PracticeEngineConfig {
  mode: PracticeMode;
  questionProvider: QuestionProvider;
  inputHandler: InputHandler;
  progressTracker: ProgressTracker;
  plugin: DomainPlugin;
  onQuestionChange?: (question: Question | null) => void;
  onAnswerSubmit?: (answer: Answer, isCorrect: boolean) => void;
  onSessionComplete?: (summary: SessionSummary) => void;
  onProgressUpdate?: (summary: SessionSummary) => void;
}

export class PracticeEngine {
  private config: PracticeEngineConfig;
  private currentQuestion: Question | null = null;
  private questionStartTime: number = 0;
  private isRunning: boolean = false;
  private sessionStartTime: number = 0;

  constructor(config: PracticeEngineConfig) {
    this.config = config;
    this.setupInputHandler();
  }

  private setupInputHandler(): void {
    // Connect input handler to our submit method
    this.config.inputHandler.onSubmit = (answer: Answer) => {
      this.handleAnswer(answer);
    };
  }

  /**
   * Start a practice session
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.sessionStartTime = Date.now();
    this.config.progressTracker.reset();
    this.nextQuestion();
  }

  /**
   * Stop the current session
   */
  stop(): SessionSummary {
    this.isRunning = false;
    this.currentQuestion = null;
    
    const summary = this.config.progressTracker.getSummary();
    this.config.onSessionComplete?.(summary);
    
    return summary;
  }

  /**
   * Pause the session
   */
  pause(): void {
    this.isRunning = false;
    this.config.inputHandler.disable();
  }

  /**
   * Resume the session
   */
  resume(): void {
    if (this.currentQuestion) {
      this.isRunning = true;
      this.config.inputHandler.enable();
      this.questionStartTime = Date.now(); // Reset timer for current question
    }
  }

  /**
   * Move to the next question
   */
  private nextQuestion(): void {
    if (!this.isRunning) return;

    // Check if we should continue
    if (!this.config.progressTracker.shouldContinue()) {
      this.stop();
      return;
    }

    // Get next question
    this.currentQuestion = this.config.questionProvider.getNext();
    
    if (!this.currentQuestion) {
      // No more questions available
      if (this.config.questionProvider.hasMore()) {
        // Provider says there are more but couldn't get one - error state
        console.error('Question provider inconsistency');
      }
      this.stop();
      return;
    }

    // Start timing
    this.questionStartTime = Date.now();
    
    // Enable input
    this.config.inputHandler.enable();
    
    // Notify listeners
    this.config.onQuestionChange?.(this.currentQuestion);
  }

  /**
   * Handle an answer submission
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
        answer.value,  // Pass the numeric value, not the Answer object
        this.currentQuestion
      );
    } else {
      // Fall back to standard validation
      isCorrect = this.config.plugin.validateAnswer(
        answer.value,  // Pass the numeric value, not the Answer object
        this.currentQuestion.correctAnswer
      );
    }

    // Record attempt
    this.config.progressTracker.recordAttempt(
      this.currentQuestion,
      answer,
      isCorrect,
      timeSpent
    );

    // Notify listeners
    this.config.onAnswerSubmit?.(answer, isCorrect);
    
    // Update progress
    const progress = this.config.progressTracker.getSummary();
    this.config.onProgressUpdate?.(progress);

    // Handle feedback based on mode
    this.handleFeedback(isCorrect);
  }

  /**
   * Handle post-answer feedback
   */
  private handleFeedback(isCorrect: boolean): void {
    // Disable input temporarily
    this.config.inputHandler.disable();

    // Duration depends on mode
    let feedbackDuration = 1500; // Default feedback time
    
    if (this.config.mode === 'timed') {
      feedbackDuration = 500; // Shorter for timed mode
    } else if (this.config.mode === 'assessment') {
      feedbackDuration = 1000; // Medium for assessment
    }

    // Move to next question after feedback
    setTimeout(() => {
      this.nextQuestion();
    }, feedbackDuration);
  }

  /**
   * Get current session progress
   */
  getProgress(): SessionSummary {
    return this.config.progressTracker.getSummary();
  }

  /**
   * Get current question
   */
  getCurrentQuestion(): Question | null {
    return this.currentQuestion;
  }

  /**
   * Check if session is running
   */
  isSessionRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update configuration (for changing strategies mid-session)
   */
  updateConfig(updates: Partial<PracticeEngineConfig>): void {
    // Only allow certain updates during a session
    if (this.isRunning) {
      // Can't change core strategies during a session
      if (updates.questionProvider || updates.progressTracker || updates.plugin) {
        console.warn('Cannot change core strategies during an active session');
        return;
      }
    }

    this.config = { ...this.config, ...updates };
    
    // Re-setup if input handler changed
    if (updates.inputHandler) {
      this.setupInputHandler();
    }
  }

  /**
   * Skip current question (for practice mode)
   */
  skipQuestion(): void {
    if (!this.isRunning || this.config.mode === 'assessment') {
      return; // Can't skip in assessment mode
    }

    if (this.currentQuestion) {
      // Record as incorrect with 0 time
      this.config.progressTracker.recordAttempt(
        this.currentQuestion,
        { value: null, type: 'skip', inputMethod: 'keyboard', timestamp: Date.now() },
        false,
        0
      );
    }

    this.nextQuestion();
  }

  /**
   * Get time spent on current question
   */
  getCurrentQuestionTime(): number {
    if (!this.currentQuestion || !this.isRunning) return 0;
    return Date.now() - this.questionStartTime;
  }
}

/**
 * Factory function to create a practice engine with presets
 */
export function createPracticeEngine(
  mode: PracticeMode,
  plugin: DomainPlugin,
  questions: Question[],
  options: Partial<PracticeEngineConfig> = {}
): PracticeEngine {
  // Import strategies dynamically to avoid circular dependencies
  const { SequentialQuestionProvider, RandomQuestionProvider, AdaptiveQuestionProvider } = 
    require('../strategies/QuestionProvider');
  const { KeyboardInputHandler, VoiceInputHandler, TouchInputHandler } = 
    require('../strategies/InputHandler');
  const { SimpleProgressTracker, MasteryProgressTracker, TimedProgressTracker, AssessmentProgressTracker } = 
    require('../strategies/ProgressTracker');

  // Default strategies based on mode
  let questionProvider: QuestionProvider;
  let progressTracker: ProgressTracker;
  let inputHandler: InputHandler;

  switch (mode) {
    case 'learn':
      questionProvider = new SequentialQuestionProvider();
      progressTracker = new SimpleProgressTracker(mode, questions.length);
      inputHandler = new KeyboardInputHandler();
      break;
    
    case 'practice':
      questionProvider = new RandomQuestionProvider();
      progressTracker = new MasteryProgressTracker(mode);
      inputHandler = new KeyboardInputHandler();
      break;
    
    case 'timed':
      questionProvider = new RandomQuestionProvider();
      progressTracker = new TimedProgressTracker(mode);
      inputHandler = new KeyboardInputHandler();
      break;
    
    case 'fluency':
      questionProvider = new AdaptiveQuestionProvider();
      progressTracker = new MasteryProgressTracker(mode, 0.9, 5); // Higher requirements
      inputHandler = new VoiceInputHandler(plugin);
      break;
    
    case 'assessment':
      questionProvider = new AdaptiveQuestionProvider();
      progressTracker = new AssessmentProgressTracker();
      inputHandler = new KeyboardInputHandler();
      break;
    
    default:
      // Default to practice mode
      questionProvider = new RandomQuestionProvider();
      progressTracker = new SimpleProgressTracker(mode);
      inputHandler = new KeyboardInputHandler();
  }

  // Initialize provider with questions
  questionProvider.initialize(questions);

  // Create engine with defaults and overrides
  return new PracticeEngine({
    mode,
    plugin,
    questionProvider,
    inputHandler,
    progressTracker,
    ...options
  });
}
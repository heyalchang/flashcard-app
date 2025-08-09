import { Question, Answer, ProgressEntry, SessionSummary, PracticeMode, AttemptDetail } from '../types/core';

/**
 * Strategy interface for tracking progress
 */
export interface ProgressTracker {
  /** Record an attempt at answering a question */
  recordAttempt(
    question: Question,
    answer: Answer,
    isCorrect: boolean,
    timeSpent: number
  ): void;
  
  /** Get progress for a specific question */
  getProgress(questionId: string): ProgressEntry | undefined;
  
  /** Get mastery level for a question (0-1) */
  getMastery(questionId: string): number;
  
  /** Check if practice should continue */
  shouldContinue(): boolean;
  
  /** Get summary of the session */
  getSummary(): SessionSummary;
  
  /** Reset all progress */
  reset(): void;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseProgressTracker implements ProgressTracker {
  protected progress: Map<string, ProgressEntry> = new Map();
  protected attemptDetails: AttemptDetail[] = [];
  protected sessionId: string;
  protected mode: PracticeMode;
  protected startTime: number;
  protected questionsAttempted = 0;
  protected questionsCorrect = 0;

  constructor(mode: PracticeMode = 'practice') {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.mode = mode;
    this.startTime = Date.now();
  }

  recordAttempt(
    question: Question,
    answer: Answer,
    isCorrect: boolean,
    timeSpent: number
  ): void {
    this.questionsAttempted++;
    if (isCorrect) this.questionsCorrect++;

    // Store attempt detail
    this.attemptDetails.push({
      question,
      userAnswer: answer.value,
      isCorrect,
      responseTime: timeSpent,
      timestamp: Date.now()
    });

    let entry = this.progress.get(question.id);
    
    if (!entry) {
      entry = {
        questionId: question.id,
        attempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        averageTime: 0,
        lastAttempt: new Date(),
        mastery: 0,
        streak: 0
      };
      this.progress.set(question.id, entry);
    }

    // Update entry
    entry.attempts++;
    if (isCorrect) {
      entry.correctCount++;
      entry.streak++;
    } else {
      entry.incorrectCount++;
      entry.streak = 0;
    }
    
    // Update average time
    entry.averageTime = 
      (entry.averageTime * (entry.attempts - 1) + timeSpent) / entry.attempts;
    
    entry.lastAttempt = new Date();
    entry.mastery = this.calculateMastery(entry);
  }

  protected abstract calculateMastery(entry: ProgressEntry): number;

  getProgress(questionId: string): ProgressEntry | undefined {
    return this.progress.get(questionId);
  }

  getMastery(questionId: string): number {
    return this.progress.get(questionId)?.mastery || 0;
  }

  abstract shouldContinue(): boolean;

  getSummary(): SessionSummary {
    const duration = Date.now() - this.startTime;
    const progressArray = Array.from(this.progress.values());
    
    const totalResponseTime = progressArray.reduce(
      (sum, entry) => sum + entry.averageTime * entry.attempts,
      0
    );
    const totalAttempts = progressArray.reduce(
      (sum, entry) => sum + entry.attempts,
      0
    );
    
    return {
      sessionId: this.sessionId,
      mode: this.mode,
      duration,
      questionsAttempted: this.questionsAttempted,
      questionsCorrect: this.questionsCorrect,
      accuracy: this.questionsAttempted > 0 
        ? this.questionsCorrect / this.questionsAttempted 
        : 0,
      averageResponseTime: totalAttempts > 0 
        ? totalResponseTime / totalAttempts 
        : 0,
      masteryAchieved: progressArray
        .filter(e => e.mastery >= 1)
        .map(e => e.questionId),
      progressEntries: progressArray,
      attemptDetails: this.attemptDetails
    };
  }

  reset(): void {
    this.progress.clear();
    this.attemptDetails = [];
    this.questionsAttempted = 0;
    this.questionsCorrect = 0;
    this.startTime = Date.now();
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Simple progress tracker - basic tracking without mastery
 */
export class SimpleProgressTracker extends BaseProgressTracker {
  private maxQuestions: number;

  constructor(mode: PracticeMode = 'practice', maxQuestions = 10) {
    super(mode);
    this.maxQuestions = maxQuestions;
  }

  protected calculateMastery(entry: ProgressEntry): number {
    // Simple: correct/attempts ratio
    return entry.attempts > 0 ? entry.correctCount / entry.attempts : 0;
  }

  shouldContinue(): boolean {
    return this.questionsAttempted < this.maxQuestions;
  }
}

/**
 * Mastery progress tracker - continues until mastery achieved
 */
export class MasteryProgressTracker extends BaseProgressTracker {
  private masteryThreshold: number;
  private requiredCorrect: number;

  constructor(
    mode: PracticeMode = 'practice',
    masteryThreshold = 0.8,
    requiredCorrect = 3
  ) {
    super(mode);
    this.masteryThreshold = masteryThreshold;
    this.requiredCorrect = requiredCorrect;
  }

  protected calculateMastery(entry: ProgressEntry): number {
    // Mastery requires both accuracy and minimum correct answers
    if (entry.correctCount < this.requiredCorrect) {
      return entry.correctCount / this.requiredCorrect;
    }
    
    const accuracy = entry.correctCount / entry.attempts;
    return accuracy >= this.masteryThreshold ? 1 : accuracy;
  }

  shouldContinue(): boolean {
    // Continue if any question hasn't reached mastery
    const entries = Array.from(this.progress.values());
    for (const entry of entries) {
      if (entry.mastery < 1) return true;
    }
    
    // Or if we haven't attempted enough questions
    return this.questionsAttempted < 5;
  }
}

/**
 * Timed progress tracker - includes time pressure
 */
export class TimedProgressTracker extends BaseProgressTracker {
  private timeTargets: Map<string, number> = new Map();
  private adaptiveTargets: boolean;

  constructor(
    mode: PracticeMode = 'timed',
    baseTimeTarget = 3000,
    adaptiveTargets = true
  ) {
    super(mode);
    this.adaptiveTargets = adaptiveTargets;
  }

  recordAttempt(
    question: Question,
    answer: Answer,
    isCorrect: boolean,
    timeSpent: number
  ): void {
    super.recordAttempt(question, answer, isCorrect, timeSpent);
    
    // Update time targets if adaptive
    if (this.adaptiveTargets && isCorrect) {
      const currentTarget = this.timeTargets.get(question.id) || 3000;
      const newTarget = Math.max(1000, currentTarget - 200); // Reduce by 200ms, min 1s
      this.timeTargets.set(question.id, newTarget);
    }
  }

  protected calculateMastery(entry: ProgressEntry): number {
    // Mastery based on both accuracy and speed
    const accuracyScore = entry.correctCount / Math.max(entry.attempts, 1);
    const timeTarget = this.timeTargets.get(entry.questionId) || 3000;
    const speedScore = entry.averageTime <= timeTarget ? 1 : timeTarget / entry.averageTime;
    
    return (accuracyScore * 0.7 + speedScore * 0.3); // 70% accuracy, 30% speed
  }

  shouldContinue(): boolean {
    // Continue for a fixed number of questions or time
    return this.questionsAttempted < 20 && (Date.now() - this.startTime) < 300000; // 5 minutes
  }

  getTimeTarget(questionId: string): number {
    return this.timeTargets.get(questionId) || 3000;
  }
}

/**
 * Assessment progress tracker - for placement tests
 */
export class AssessmentProgressTracker extends BaseProgressTracker {
  private difficultyScores: Map<string, number> = new Map();
  private confidenceThreshold = 0.7;

  constructor() {
    super('assessment');
  }

  recordAttempt(
    question: Question,
    answer: Answer,
    isCorrect: boolean,
    timeSpent: number
  ): void {
    super.recordAttempt(question, answer, isCorrect, timeSpent);
    
    // Track performance by difficulty
    const difficulty = question.metadata?.difficulty || 'medium';
    const currentScore = this.difficultyScores.get(difficulty) || 0;
    const newScore = isCorrect ? currentScore + 1 : currentScore;
    this.difficultyScores.set(difficulty, newScore);
  }

  protected calculateMastery(entry: ProgressEntry): number {
    // For assessment, mastery is just accuracy
    return entry.attempts > 0 ? entry.correctCount / entry.attempts : 0;
  }

  shouldContinue(): boolean {
    // Continue until we have confidence in placement
    const totalAttempts = this.questionsAttempted;
    
    // Minimum questions
    if (totalAttempts < 10) return true;
    
    // Maximum questions
    if (totalAttempts >= 30) return false;
    
    // Check if we have enough data for each difficulty
    const hasEasy = (this.difficultyScores.get('easy') || 0) >= 3;
    const hasMedium = (this.difficultyScores.get('medium') || 0) >= 3;
    const hasHard = (this.difficultyScores.get('hard') || 0) >= 3;
    
    return !(hasEasy && hasMedium && hasHard);
  }

  getPlacementData(): Map<string, number> {
    return this.difficultyScores;
  }
}
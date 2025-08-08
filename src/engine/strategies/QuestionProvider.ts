import { Question } from '../types/core';

/**
 * Strategy interface for providing questions in different orders
 */
export interface QuestionProvider<T = any> {
  /** Initialize the provider with a set of questions */
  initialize(questions: Question<T>[]): void;
  
  /** Get the next question to present */
  getNext(): Question<T> | null;
  
  /** Check if more questions are available */
  hasMore(): boolean;
  
  /** Reset the provider to start over */
  reset(): void;
  
  /** Get current progress information */
  getProgress(): { current: number; total: number };
}

/**
 * Sequential provider - presents questions in order
 */
export class SequentialQuestionProvider<T = any> implements QuestionProvider<T> {
  private questions: Question<T>[] = [];
  private currentIndex = 0;

  initialize(questions: Question<T>[]): void {
    this.questions = questions;
    this.currentIndex = 0;
  }

  getNext(): Question<T> | null {
    if (this.currentIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentIndex++];
  }

  hasMore(): boolean {
    return this.currentIndex < this.questions.length;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.currentIndex,
      total: this.questions.length
    };
  }
}

/**
 * Random provider - presents questions in random order
 */
export class RandomQuestionProvider<T = any> implements QuestionProvider<T> {
  private questions: Question<T>[] = [];
  private remainingIndices: number[] = [];
  private totalQuestions = 0;

  initialize(questions: Question<T>[]): void {
    this.questions = questions;
    this.totalQuestions = questions.length;
    this.reset();
  }

  getNext(): Question<T> | null {
    if (this.remainingIndices.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * this.remainingIndices.length);
    const questionIndex = this.remainingIndices[randomIndex];
    this.remainingIndices.splice(randomIndex, 1);
    
    return this.questions[questionIndex];
  }

  hasMore(): boolean {
    return this.remainingIndices.length > 0;
  }

  reset(): void {
    this.remainingIndices = Array.from({ length: this.questions.length }, (_, i) => i);
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.totalQuestions - this.remainingIndices.length,
      total: this.totalQuestions
    };
  }
}

/**
 * Adaptive provider - adjusts difficulty based on performance
 */
export class AdaptiveQuestionProvider<T = any> implements QuestionProvider<T> {
  private questions: Question<T>[] = [];
  private questionsByDifficulty: Map<string, Question<T>[]> = new Map();
  private currentDifficulty = 'medium';
  private questionsAnswered = 0;
  private correctStreak = 0;

  initialize(questions: Question<T>[]): void {
    this.questions = questions;
    this.organizeDyDifficulty();
    this.questionsAnswered = 0;
    this.correctStreak = 0;
  }

  private organizeDyDifficulty(): void {
    this.questionsByDifficulty.clear();
    
    for (const question of this.questions) {
      const difficulty = question.metadata?.difficulty || 'medium';
      if (!this.questionsByDifficulty.has(difficulty)) {
        this.questionsByDifficulty.set(difficulty, []);
      }
      this.questionsByDifficulty.get(difficulty)!.push(question);
    }
  }

  getNext(): Question<T> | null {
    const availableQuestions = this.questionsByDifficulty.get(this.currentDifficulty) || [];
    
    if (availableQuestions.length === 0) {
      // Try other difficulties
      const entries = Array.from(this.questionsByDifficulty.entries());
      for (const [difficulty, questions] of entries) {
        if (questions.length > 0) {
          this.currentDifficulty = difficulty;
          return this.getNext();
        }
      }
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];
    availableQuestions.splice(randomIndex, 1);
    
    this.questionsAnswered++;
    return question;
  }

  hasMore(): boolean {
    const allQuestions = Array.from(this.questionsByDifficulty.values());
    for (const questions of allQuestions) {
      if (questions.length > 0) return true;
    }
    return false;
  }

  reset(): void {
    this.organizeDyDifficulty();
    this.questionsAnswered = 0;
    this.correctStreak = 0;
    this.currentDifficulty = 'medium';
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.questionsAnswered,
      total: this.questions.length
    };
  }

  /** Update difficulty based on answer correctness */
  updatePerformance(isCorrect: boolean): void {
    if (isCorrect) {
      this.correctStreak++;
      if (this.correctStreak >= 3) {
        this.increaseDifficulty();
        this.correctStreak = 0;
      }
    } else {
      this.correctStreak = 0;
      this.decreaseDifficulty();
    }
  }

  private increaseDifficulty(): void {
    const difficulties = ['easy', 'medium', 'hard'];
    const currentIndex = difficulties.indexOf(this.currentDifficulty);
    if (currentIndex < difficulties.length - 1) {
      this.currentDifficulty = difficulties[currentIndex + 1];
    }
  }

  private decreaseDifficulty(): void {
    const difficulties = ['easy', 'medium', 'hard'];
    const currentIndex = difficulties.indexOf(this.currentDifficulty);
    if (currentIndex > 0) {
      this.currentDifficulty = difficulties[currentIndex - 1];
    }
  }
}
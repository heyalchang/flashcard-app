import React from 'react';
import { DomainPlugin } from '../core/PluginSystem';
import { Question, ProgressEntry } from '../types/core';

interface MathContent {
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '×' | '÷';
}

export interface ValidationOptions {
  useDynamicCalculation?: boolean;  // Calculate answer on-the-fly
  useOperationSpecificTolerance?: boolean;  // Different tolerance per operation
  debugMode?: boolean;  // Enable detailed logging
  tolerance?: number;  // Custom tolerance override
}

/**
 * Enhanced Math Plugin with dynamic answer calculation
 * This plugin can validate answers by calculating them on-the-fly
 * rather than relying on pre-calculated correct answers
 */
export class EnhancedMathPlugin implements DomainPlugin<MathContent, number> {
  name = 'enhanced-math';
  private options: ValidationOptions;
  
  questionTypes = [
    'addition',
    'subtraction', 
    'multiplication',
    'division'
  ];

  constructor(options: ValidationOptions = {}) {
    this.options = {
      useDynamicCalculation: true,
      useOperationSpecificTolerance: true,
      debugMode: false,
      ...options
    };
  }

  /**
   * Calculate the correct answer dynamically based on operands and operation
   */
  private calculateAnswer(operand1: number, operand2: number, operator: '+' | '-' | '×' | '÷'): number {
    const num1 = Number(operand1);
    const num2 = Number(operand2);

    if (this.options.debugMode) {
      console.log(`[EnhancedMathPlugin] Calculating: ${num1} ${operator} ${num2}`);
    }

    switch (operator) {
      case '+':
        return num1 + num2;
      case '-':
        return num1 - num2;
      case '×':
        return num1 * num2;
      case '÷':
        if (num2 === 0) {
          console.error('[EnhancedMathPlugin] Division by zero attempted');
          return NaN;
        }
        return num1 / num2;
      default:
        console.error(`[EnhancedMathPlugin] Unknown operator: ${operator}`);
        return NaN;
    }
  }

  /**
   * Get operation-specific tolerance for floating point comparison
   */
  private getTolerance(operator: '+' | '-' | '×' | '÷'): number {
    if (this.options.tolerance !== undefined) {
      return this.options.tolerance;
    }

    if (!this.options.useOperationSpecificTolerance) {
      return 0.01; // Default tolerance for all operations
    }

    switch (operator) {
      case '+':
      case '-':
      case '×':
        return 0; // Exact match for integer operations
      case '÷':
        return 0.01; // Small tolerance for division due to floating point
      default:
        return 0.01;
    }
  }

  /**
   * Enhanced validation with dynamic calculation option
   */
  validateAnswerWithQuestion(answer: number, question: Question<MathContent>): boolean {
    const { operand1, operand2, operator } = question.content;
    
    // Calculate the correct answer dynamically or use pre-calculated
    const correctAnswer = this.options.useDynamicCalculation
      ? this.calculateAnswer(operand1, operand2, operator)
      : question.correctAnswer as number;

    if (isNaN(correctAnswer)) {
      console.error('[EnhancedMathPlugin] Invalid calculation result');
      return false;
    }

    const tolerance = this.getTolerance(operator);

    if (this.options.debugMode) {
      console.log(`[EnhancedMathPlugin] Validation Details:`);
      console.log(`  Question: ${operand1} ${operator} ${operand2}`);
      console.log(`  User Answer: ${answer}`);
      console.log(`  Correct Answer: ${correctAnswer}`);
      console.log(`  Tolerance: ${tolerance}`);
      console.log(`  Difference: ${Math.abs(answer - correctAnswer)}`);
    }

    // Check if answer is within tolerance
    const isCorrect = Math.abs(answer - correctAnswer) <= tolerance;

    if (this.options.debugMode) {
      console.log(`  Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    }

    return isCorrect;
  }

  /**
   * Standard validation method (for backward compatibility)
   */
  validateAnswer(answer: number, correct: number): boolean {
    // When called without question context, use simple comparison with default tolerance
    const tolerance = this.options.tolerance ?? 0.01;
    
    if (this.options.debugMode) {
      console.log(`[EnhancedMathPlugin] Simple validation: ${answer} vs ${correct}, tolerance: ${tolerance}`);
    }

    return Math.abs(answer - correct) <= tolerance;
  }

  renderQuestion(question: Question<MathContent>): React.ReactNode {
    const { operand1, operand2, operator } = question.content;
    
    // Calculate answer dynamically if enabled (for display purposes)
    const displayAnswer = this.options.useDynamicCalculation
      ? this.calculateAnswer(operand1, operand2, operator)
      : question.correctAnswer;
    
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4 text-6xl font-bold">
          <span>{operand1}</span>
          <span className="text-blue-600">{this.getOperatorSymbol(operator)}</span>
          <span>{operand2}</span>
          <span className="text-gray-400">=</span>
          <span className="text-gray-300">?</span>
        </div>
        {this.options.debugMode && (
          <div className="text-xs text-gray-500 font-mono">
            Debug: Answer = {displayAnswer}
          </div>
        )}
      </div>
    );
  }

  private getOperatorSymbol(operator: string): string {
    switch (operator) {
      case '+': return '+';
      case '-': return '−';
      case '×': return '×';
      case '÷': return '÷';
      default: return operator;
    }
  }

  parseAnswer(input: string): number | null {
    // Clean the input
    const cleaned = input.trim().toLowerCase();
    
    // Handle voice input variations
    const voiceToNumber: Record<string, number> = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
      'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
      'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100,
      // Handle negative numbers
      'negative': -1, 'minus': -1
    };

    // Check for negative numbers
    let isNegative = false;
    let processedInput = cleaned;
    
    if (cleaned.startsWith('negative ') || cleaned.startsWith('minus ')) {
      isNegative = true;
      processedInput = cleaned.replace(/^(negative|minus)\s+/, '');
    }

    // Check if it's a word number
    if (voiceToNumber[processedInput] !== undefined) {
      const value = voiceToNumber[processedInput];
      return isNegative && value !== -1 ? -value : value;
    }

    // Handle compound numbers like "twenty-one" or "twenty one"
    const parts = processedInput.split(/[\s-]+/);
    if (parts.length === 2) {
      const tens = voiceToNumber[parts[0]];
      const ones = voiceToNumber[parts[1]];
      if (tens !== undefined && ones !== undefined && tens >= 20 && tens <= 90 && ones < 10) {
        const value = tens + ones;
        return isNegative ? -value : value;
      }
    }

    // Try to parse as a number
    const parsed = parseFloat(processedInput);
    if (!isNaN(parsed)) {
      return isNegative ? -parsed : parsed;
    }

    // Try parsing the original input as-is (handles negative numbers naturally)
    const directParse = parseFloat(cleaned);
    return isNaN(directParse) ? null : directParse;
  }

  calculateMastery(progress: ProgressEntry): number {
    // Enhanced mastery calculation based on accuracy, speed, and consistency
    const accuracyScore = progress.correctCount / Math.max(progress.attempts, 1);
    
    // Speed-based scoring with operation-specific thresholds
    let speedScore = 0;
    if (progress.averageTime < 2000) speedScore = 0.2;  // Under 2 seconds: excellent
    else if (progress.averageTime < 3000) speedScore = 0.15;  // Under 3 seconds: very good
    else if (progress.averageTime < 5000) speedScore = 0.1;   // Under 5 seconds: good
    else if (progress.averageTime < 8000) speedScore = 0.05;  // Under 8 seconds: okay
    
    // Streak bonus (consistency)
    const streakBonus = Math.min(progress.streak / 10, 0.15); // Max 15% bonus for streak of 10+
    
    // Calculate total score (removed recentWeight as it's not in ProgressEntry)
    const totalScore = accuracyScore * 0.7 + speedScore + streakBonus;
    
    if (this.options.debugMode) {
      console.log(`[EnhancedMathPlugin] Mastery Calculation:`);
      console.log(`  Accuracy: ${(accuracyScore * 100).toFixed(1)}%`);
      console.log(`  Speed Score: ${(speedScore * 100).toFixed(1)}%`);
      console.log(`  Streak Bonus: ${(streakBonus * 100).toFixed(1)}%`);
      console.log(`  Total: ${(totalScore * 100).toFixed(1)}%`);
    }
    
    return Math.min(totalScore, 1);
  }

  getHint(question: Question<MathContent>, attemptNumber: number): string {
    const { operand1, operand2, operator } = question.content;
    const answer = this.options.useDynamicCalculation
      ? this.calculateAnswer(operand1, operand2, operator)
      : question.correctAnswer as number;
    
    if (attemptNumber === 1) {
      switch (operator) {
        case '+':
          return `Try counting up from ${operand1} by ${operand2}`;
        case '-':
          return `What do you have left if you take away ${operand2} from ${operand1}?`;
        case '×':
          if (operand2 <= 10) {
            return `Think of ${operand1} groups of ${operand2}`;
          }
          return `Break it down: ${operand1} × 10 = ${operand1 * 10}, then add ${operand1} × ${operand2 - 10}`;
        case '÷':
          return `How many groups of ${operand2} fit in ${operand1}?`;
        default:
          return 'Think about the operation';
      }
    } else if (attemptNumber === 2) {
      // Give a range hint
      if (answer < 10) {
        return `The answer is less than 10`;
      } else if (answer < 50) {
        return `The answer is between ${Math.floor(answer / 10) * 10} and ${Math.floor(answer / 10) * 10 + 10}`;
      } else {
        const firstDigit = Math.floor(answer / 10);
        return `The answer starts with ${firstDigit}...`;
      }
    } else if (attemptNumber === 3) {
      // Give most of the answer
      if (answer >= 10) {
        const answerStr = answer.toString();
        return `The answer is ${answerStr.slice(0, -1)}?`;
      }
    }
    
    return `The answer is ${answer}`;
  }

  formatAnswer(answer: number): string {
    // Format with appropriate decimal places
    if (Number.isInteger(answer)) {
      return answer.toString();
    }
    // For division results, show up to 2 decimal places
    return answer.toFixed(2).replace(/\.?0+$/, '');
  }

  getExplanation(question: Question<MathContent>): string {
    const { operand1, operand2, operator } = question.content;
    const answer = this.options.useDynamicCalculation
      ? this.calculateAnswer(operand1, operand2, operator)
      : question.correctAnswer as number;
    
    switch (operator) {
      case '+':
        return `${operand1} + ${operand2} = ${this.formatAnswer(answer)}\nYou're combining ${operand1} and ${operand2} together.`;
      case '-':
        return `${operand1} - ${operand2} = ${this.formatAnswer(answer)}\nYou're taking away ${operand2} from ${operand1}.`;
      case '×':
        return `${operand1} × ${operand2} = ${this.formatAnswer(answer)}\nThis is ${operand1} groups of ${operand2} (or ${operand2} groups of ${operand1}).`;
      case '÷':
        const remainder = operand1 % operand2;
        if (remainder === 0) {
          return `${operand1} ÷ ${operand2} = ${this.formatAnswer(answer)}\n${operand1} can be divided into ${answer} groups of ${operand2}.`;
        } else {
          return `${operand1} ÷ ${operand2} = ${this.formatAnswer(answer)}\n${operand1} divided by ${operand2} gives ${Math.floor(answer)} with a remainder of ${remainder}.`;
        }
      default:
        return `The answer is ${this.formatAnswer(answer)}`;
    }
  }

  /**
   * Set or update validation options
   */
  setOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current validation options
   */
  getOptions(): ValidationOptions {
    return { ...this.options };
  }
}
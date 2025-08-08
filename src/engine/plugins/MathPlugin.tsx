import React from 'react';
import { DomainPlugin } from '../core/PluginSystem';
import { Question, ProgressEntry } from '../types/core';

interface MathContent {
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '×' | '÷';
}

export class MathPlugin implements DomainPlugin<MathContent, number> {
  name = 'math';
  
  questionTypes = [
    'addition',
    'subtraction', 
    'multiplication',
    'division'
  ];

  renderQuestion(question: Question<MathContent>): React.ReactNode {
    const { operand1, operand2, operator } = question.content;
    
    return (
      <div className="flex items-center space-x-4 text-6xl font-bold">
        <span>{operand1}</span>
        <span className="text-blue-600">{this.getOperatorSymbol(operator)}</span>
        <span>{operand2}</span>
        <span className="text-gray-400">=</span>
        <span className="text-gray-300">?</span>
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

  validateAnswer(answer: number, correct: number): boolean {
    // Handle floating point precision for division
    if (Math.abs(answer - correct) < 0.01) {
      return true;
    }
    return answer === correct;
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
      'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
    };

    // Check if it's a word number
    if (voiceToNumber[cleaned] !== undefined) {
      return voiceToNumber[cleaned];
    }

    // Handle compound numbers like "twenty-one" or "twenty one"
    const parts = cleaned.split(/[\s-]+/);
    if (parts.length === 2) {
      const tens = voiceToNumber[parts[0]];
      const ones = voiceToNumber[parts[1]];
      if (tens !== undefined && ones !== undefined && tens >= 20 && tens <= 90 && ones < 10) {
        return tens + ones;
      }
    }

    // Try to parse as a number
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  calculateMastery(progress: ProgressEntry): number {
    // Mastery based on correct answers and streak
    const accuracyScore = progress.correctCount / Math.max(progress.attempts, 1);
    const streakBonus = Math.min(progress.streak / 5, 0.2); // Max 20% bonus for streak
    const speedBonus = progress.averageTime < 3000 ? 0.1 : 0; // 10% bonus for fast answers
    
    return Math.min(accuracyScore + streakBonus + speedBonus, 1);
  }

  getHint(question: Question<MathContent>, attemptNumber: number): string {
    const { operand1, operand2, operator } = question.content;
    
    if (attemptNumber === 1) {
      switch (operator) {
        case '+':
          return `Try counting up from ${operand1}`;
        case '-':
          return `What do you have left if you take away ${operand2} from ${operand1}?`;
        case '×':
          return `${operand1} groups of ${operand2}`;
        case '÷':
          return `How many groups of ${operand2} fit in ${operand1}?`;
        default:
          return 'Think about the operation';
      }
    } else if (attemptNumber === 2) {
      const answer = question.correctAnswer as number;
      const firstDigit = Math.floor(answer / 10);
      if (firstDigit > 0) {
        return `The answer starts with ${firstDigit}...`;
      }
      return `The answer is less than 10`;
    }
    
    return `The answer is ${question.correctAnswer}`;
  }

  formatAnswer(answer: number): string {
    // Format with appropriate decimal places
    if (Number.isInteger(answer)) {
      return answer.toString();
    }
    return answer.toFixed(2);
  }

  getExplanation(question: Question<MathContent>): string {
    const { operand1, operand2, operator } = question.content;
    const answer = question.correctAnswer as number;
    
    switch (operator) {
      case '+':
        return `${operand1} + ${operand2} = ${answer}`;
      case '-':
        return `${operand1} - ${operand2} = ${answer}`;
      case '×':
        return `${operand1} × ${operand2} = ${answer}`;
      case '÷':
        return `${operand1} ÷ ${operand2} = ${answer}`;
      default:
        return `The answer is ${answer}`;
    }
  }
}
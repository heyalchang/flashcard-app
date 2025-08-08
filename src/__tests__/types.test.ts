import { Question, Answer, ProgressEntry } from '../engine/types/core';

describe('Domain-agnostic types', () => {
  test('Types support math questions', () => {
    const mathQuestion: Question = {
      id: 'math-1',
      type: 'addition',
      content: { 
        operand1: 5, 
        operand2: 3, 
        operator: '+' 
      },
      correctAnswer: 8,
      metadata: {
        difficulty: 'easy',
        grade: 1
      }
    };
    
    expect(mathQuestion.type).toBe('addition');
    expect(mathQuestion.correctAnswer).toBe(8);
  });

  test('Types support language questions', () => {
    const languageQuestion: Question = {
      id: 'lang-1',
      type: 'translation',
      content: { 
        phrase: 'Hello', 
        fromLanguage: 'en', 
        toLanguage: 'es' 
      },
      correctAnswer: 'Hola',
      metadata: {
        category: 'greetings',
        difficulty: 'beginner'
      }
    };
    
    expect(languageQuestion.type).toBe('translation');
    expect(languageQuestion.correctAnswer).toBe('Hola');
  });

  test('Types support coding questions', () => {
    const codingQuestion: Question = {
      id: 'code-1',
      type: 'function-output',
      content: {
        code: 'function add(a, b) { return a + b; }',
        call: 'add(2, 3)',
        language: 'javascript'
      },
      correctAnswer: 5,
      metadata: {
        topic: 'functions',
        difficulty: 'medium'
      }
    };
    
    expect(codingQuestion.type).toBe('function-output');
    expect(codingQuestion.correctAnswer).toBe(5);
  });

  test('Answer supports multiple input methods', () => {
    const voiceAnswer: Answer = {
      value: 42,
      timestamp: Date.now(),
      inputMethod: 'voice',
      confidence: 0.95,
      rawInput: 'forty two'
    };

    const keyboardAnswer: Answer = {
      value: 'Hello World',
      timestamp: Date.now(),
      inputMethod: 'keyboard'
    };

    expect(voiceAnswer.inputMethod).toBe('voice');
    expect(keyboardAnswer.inputMethod).toBe('keyboard');
  });

  test('ProgressEntry tracks mastery', () => {
    const progress: ProgressEntry = {
      questionId: 'q1',
      attempts: 5,
      correctCount: 4,
      incorrectCount: 1,
      averageTime: 2500,
      lastAttempt: new Date(),
      mastery: 0.8,
      streak: 3
    };

    expect(progress.mastery).toBeGreaterThanOrEqual(0);
    expect(progress.mastery).toBeLessThanOrEqual(1);
    expect(progress.correctCount / progress.attempts).toBe(0.8);
  });
});
import React from 'react';
import { render } from '@testing-library/react';
import { MathPlugin } from '../engine/plugins/MathPlugin';
import { PluginManager } from '../engine/core/PluginSystem';
import { Question } from '../engine/types/core';

describe('Plugin System', () => {
  let mathPlugin: MathPlugin;
  let pluginManager: PluginManager;

  beforeEach(() => {
    mathPlugin = new MathPlugin();
    pluginManager = PluginManager.getInstance();
  });

  describe('MathPlugin', () => {
    test('handles math questions correctly', () => {
      const question: Question = {
        id: '1',
        type: 'addition',
        content: { operand1: 5, operand2: 3, operator: '+' },
        correctAnswer: 8
      };
      
      expect(mathPlugin.validateAnswer(8, 8)).toBe(true);
      expect(mathPlugin.validateAnswer(7, 8)).toBe(false);
    });

    test('parses numeric input correctly', () => {
      expect(mathPlugin.parseAnswer('8')).toBe(8);
      expect(mathPlugin.parseAnswer('42')).toBe(42);
      expect(mathPlugin.parseAnswer('3.14')).toBeCloseTo(3.14);
    });

    test('parses voice input correctly', () => {
      expect(mathPlugin.parseAnswer('eight')).toBe(8);
      expect(mathPlugin.parseAnswer('twenty')).toBe(20);
      expect(mathPlugin.parseAnswer('twenty one')).toBe(21);
      expect(mathPlugin.parseAnswer('twenty-one')).toBe(21);
      expect(mathPlugin.parseAnswer('forty two')).toBe(42);
    });

    test('returns null for invalid input', () => {
      expect(mathPlugin.parseAnswer('abc')).toBe(null);
      expect(mathPlugin.parseAnswer('not a number')).toBe(null);
      expect(mathPlugin.parseAnswer('')).toBe(null);
    });

    test('calculates mastery correctly', () => {
      const progress = {
        questionId: 'q1',
        attempts: 10,
        correctCount: 8,
        incorrectCount: 2,
        averageTime: 2500,
        lastAttempt: new Date(),
        mastery: 0,
        streak: 5
      };

      const mastery = mathPlugin.calculateMastery(progress);
      expect(mastery).toBeGreaterThan(0.8); // 80% accuracy + bonuses
      expect(mastery).toBeLessThanOrEqual(1);
    });

    test('provides appropriate hints', () => {
      const question: Question = {
        id: '1',
        type: 'addition',
        content: { operand1: 5, operand2: 3, operator: '+' },
        correctAnswer: 8
      };

      const hint1 = mathPlugin.getHint!(question, 1);
      expect(hint1).toContain('counting up');

      const hint2 = mathPlugin.getHint!(question, 2);
      expect(hint2).toContain('less than 10');

      const hint3 = mathPlugin.getHint!(question, 3);
      expect(hint3).toContain('8');
    });

    test('renders question correctly', () => {
      const question: Question = {
        id: '1',
        type: 'multiplication',
        content: { operand1: 6, operand2: 7, operator: '×' },
        correctAnswer: 42
      };

      const { container } = render(
        <div>{mathPlugin.renderQuestion(question)}</div>
      );

      expect(container.textContent).toContain('6');
      expect(container.textContent).toContain('×');
      expect(container.textContent).toContain('7');
    });
  });

  describe('PluginManager', () => {
    test('registers and retrieves plugins', () => {
      pluginManager.registerPlugin(mathPlugin);
      
      const retrieved = pluginManager.getPlugin('math');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('math');
    });

    test('sets and gets active plugin', () => {
      pluginManager.registerPlugin(mathPlugin);
      pluginManager.setActivePlugin('math');
      
      const active = pluginManager.getActivePlugin();
      expect(active.name).toBe('math');
    });

    test('throws error for non-existent plugin', () => {
      expect(() => {
        pluginManager.setActivePlugin('nonexistent');
      }).toThrow("Plugin 'nonexistent' not found");
    });

    test('checks if can handle question type', () => {
      pluginManager.registerPlugin(mathPlugin);
      pluginManager.setActivePlugin('math');
      
      expect(pluginManager.canHandleQuestionType('addition')).toBe(true);
      expect(pluginManager.canHandleQuestionType('translation')).toBe(false);
    });
  });
});
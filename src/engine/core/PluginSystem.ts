import React from 'react';
import { Question, Answer, ProgressEntry } from '../types/core';

/**
 * Domain Plugin Interface
 * Implement this interface to add support for any learning domain
 */
export interface DomainPlugin<TQuestion = any, TAnswer = any> {
  /** Unique identifier for this plugin */
  name: string;
  
  /** Question types this plugin can handle */
  questionTypes: string[];
  
  /** Render a question for display */
  renderQuestion(question: Question<TQuestion>): React.ReactNode;
  
  /** Validate if an answer is correct */
  validateAnswer(answer: TAnswer, correct: TAnswer): boolean;
  
  /** Parse text/voice input into the expected answer format */
  parseAnswer(input: string, questionType: string): TAnswer | null;
  
  /** Calculate mastery level based on progress */
  calculateMastery(progress: ProgressEntry): number;
  
  /** Optional: Provide hints for a question */
  getHint?(question: Question<TQuestion>, attemptNumber: number): string;
  
  /** Optional: Custom input component for this domain */
  renderInput?(props: InputProps): React.ReactNode;
  
  /** Optional: Format answer for display */
  formatAnswer?(answer: TAnswer): string;
  
  /** Optional: Get explanation for correct answer */
  getExplanation?(question: Question<TQuestion>): string;
}

export interface InputProps {
  onSubmit: (value: any) => void;
  disabled?: boolean;
  questionType?: string;
  currentValue?: any;
}

/**
 * Plugin Manager - Singleton to manage all plugins
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, DomainPlugin> = new Map();
  private activePlugin: DomainPlugin | null = null;

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  registerPlugin(plugin: DomainPlugin): void {
    this.plugins.set(plugin.name, plugin);
    console.log(`Registered plugin: ${plugin.name}`);
  }

  setActivePlugin(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }
    this.activePlugin = plugin;
    console.log(`Active plugin set to: ${name}`);
  }

  getActivePlugin(): DomainPlugin {
    if (!this.activePlugin) {
      throw new Error('No active plugin set');
    }
    return this.activePlugin;
  }

  getPlugin(name: string): DomainPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): DomainPlugin[] {
    return Array.from(this.plugins.values());
  }

  canHandleQuestionType(type: string): boolean {
    if (!this.activePlugin) return false;
    return this.activePlugin.questionTypes.includes(type);
  }
}
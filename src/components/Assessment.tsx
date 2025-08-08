import React, { useState, useEffect } from 'react';
import { Question, SessionSummary, PlacementResult } from '../engine/types/core';
import { PracticeEngine, createPracticeEngine } from '../engine/core/PracticeEngine';
import { MathPlugin } from '../engine/plugins/MathPlugin';
import { TouchpadInput } from './inputs/TouchpadInput';
import { QuestionDisplay } from './QuestionDisplay';
import { TouchInputHandler } from '../engine/strategies/InputHandler';

interface AssessmentProps {
  onComplete: (result: PlacementResult) => void;
  onCancel: () => void;
}

// Generate assessment questions with varying difficulty
function generateAssessmentQuestions(): Question[] {
  const questions: Question[] = [];
  let qIndex = 0;
  
  // Easy addition (0-5)
  for (let i = 0; i < 3; i++) {
    const a = Math.floor(Math.random() * 6);
    const b = Math.floor(Math.random() * 6);
    questions.push({
      id: `assess-${qIndex++}`,
      type: 'arithmetic',
      content: {
        expression: `${a} + ${b}`,
        operands: [a, b],
        operator: '+'
      },
      correctAnswer: a + b,
      metadata: { difficulty: 'easy', category: 'addition' }
    });
  }
  
  // Medium addition (5-15)
  for (let i = 0; i < 3; i++) {
    const a = Math.floor(Math.random() * 10) + 5;
    const b = Math.floor(Math.random() * 10) + 5;
    questions.push({
      id: `assess-${qIndex++}`,
      type: 'arithmetic',
      content: {
        expression: `${a} + ${b}`,
        operands: [a, b],
        operator: '+'
      },
      correctAnswer: a + b,
      metadata: { difficulty: 'medium', category: 'addition' }
    });
  }
  
  // Hard addition (15+)
  for (let i = 0; i < 2; i++) {
    const a = Math.floor(Math.random() * 20) + 10;
    const b = Math.floor(Math.random() * 20) + 10;
    questions.push({
      id: `assess-${qIndex++}`,
      type: 'arithmetic',
      content: {
        expression: `${a} + ${b}`,
        operands: [a, b],
        operator: '+'
      },
      correctAnswer: a + b,
      metadata: { difficulty: 'hard', category: 'addition' }
    });
  }
  
  // Subtraction
  for (let i = 0; i < 3; i++) {
    const a = Math.floor(Math.random() * 15) + 10;
    const b = Math.floor(Math.random() * 10);
    questions.push({
      id: `assess-${qIndex++}`,
      type: 'arithmetic',
      content: {
        expression: `${a} - ${b}`,
        operands: [a, b],
        operator: '-'
      },
      correctAnswer: a - b,
      metadata: { difficulty: i < 2 ? 'easy' : 'medium', category: 'subtraction' }
    });
  }
  
  // Multiplication (if doing well)
  for (let i = 0; i < 2; i++) {
    const a = Math.floor(Math.random() * 5) + 2;
    const b = Math.floor(Math.random() * 5) + 2;
    questions.push({
      id: `assess-${qIndex++}`,
      type: 'arithmetic',
      content: {
        expression: `${a} × ${b}`,
        operands: [a, b],
        operator: '×'
      },
      correctAnswer: a * b,
      metadata: { difficulty: 'hard', category: 'multiplication' }
    });
  }
  
  return questions;
}

export const Assessment: React.FC<AssessmentProps> = ({ onComplete, onCancel }) => {
  const [stage, setStage] = useState<'intro' | 'testing' | 'complete'>('intro');
  const [engine, setEngine] = useState<PracticeEngine | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [touchHandler] = useState(() => new TouchInputHandler());

  useEffect(() => {
    if (stage === 'testing') {
      const mathPlugin = new MathPlugin();
      const questions = generateAssessmentQuestions();
      
      const practiceEngine = createPracticeEngine(
        'assessment',
        mathPlugin,
        questions,
        {
          inputHandler: touchHandler,
          onQuestionChange: (question) => {
            setCurrentQuestion(question);
            setIsAnswered(false);
            setIsCorrect(false);
          },
          onAnswerSubmit: (answer, correct) => {
            setIsAnswered(true);
            setIsCorrect(correct);
          },
          onSessionComplete: (sessionSummary) => {
            setSummary(sessionSummary);
            setStage('complete');
          },
          onProgressUpdate: (progressUpdate) => {
            setProgress((progressUpdate.questionsAttempted / 13) * 100);
          }
        }
      );

      setEngine(practiceEngine);
      practiceEngine.start();

      return () => {
        practiceEngine.stop();
        touchHandler.cleanup();
      };
    }
  }, [stage]);

  const handleTouchpadSubmit = (value: number) => {
    touchHandler.handleTouchInput(value);
  };

  const handleInlineSubmit = (value: number) => {
    touchHandler.handleTouchInput(value);
  };

  const calculatePlacement = (summary: SessionSummary): PlacementResult => {
    const difficultyScores: Record<string, { correct: number; total: number }> = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    };
    
    const categoryScores: Record<string, { correct: number; total: number }> = {
      addition: { correct: 0, total: 0 },
      subtraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 }
    };
    
    // Analyze performance by difficulty and category
    summary.progressEntries.forEach(entry => {
      const question = generateAssessmentQuestions().find(q => q.id === entry.questionId);
      if (question?.metadata) {
        const difficulty = question.metadata.difficulty as string;
        const category = question.metadata.category as string;
        
        if (difficultyScores[difficulty]) {
          difficultyScores[difficulty].total += entry.attempts;
          difficultyScores[difficulty].correct += entry.correctCount;
        }
        
        if (categoryScores[category]) {
          categoryScores[category].total += entry.attempts;
          categoryScores[category].correct += entry.correctCount;
        }
      }
    });
    
    // Calculate skill level (0-100)
    const easyScore = difficultyScores.easy.total > 0 
      ? (difficultyScores.easy.correct / difficultyScores.easy.total) * 100 : 0;
    const mediumScore = difficultyScores.medium.total > 0 
      ? (difficultyScores.medium.correct / difficultyScores.medium.total) * 100 : 0;
    const hardScore = difficultyScores.hard.total > 0 
      ? (difficultyScores.hard.correct / difficultyScores.hard.total) * 100 : 0;
    
    const skillLevel = (easyScore * 0.3 + mediumScore * 0.4 + hardScore * 0.3);
    
    // Determine recommended tracks
    const recommendedTracks: string[] = [];
    if (easyScore >= 80) {
      recommendedTracks.push('addition-basics');
      if (mediumScore >= 70) {
        recommendedTracks.push('subtraction-basics');
        if (hardScore >= 60) {
          recommendedTracks.push('multiplication-intro');
        }
      }
    }
    
    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    Object.entries(categoryScores).forEach(([category, scores]) => {
      if (scores.total > 0) {
        const accuracy = (scores.correct / scores.total) * 100;
        if (accuracy >= 80) {
          strengths.push(category);
        } else if (accuracy < 50) {
          weaknesses.push(category);
        }
      }
    });
    
    return {
      recommendedTracks: recommendedTracks.length > 0 ? recommendedTracks : ['addition-basics'],
      skillLevel,
      strengths,
      weaknesses,
      detailedScores: {
        easy: easyScore,
        medium: mediumScore,
        hard: hardScore,
        addition: categoryScores.addition.total > 0 
          ? (categoryScores.addition.correct / categoryScores.addition.total) * 100 : 0,
        subtraction: categoryScores.subtraction.total > 0 
          ? (categoryScores.subtraction.correct / categoryScores.subtraction.total) * 100 : 0,
        multiplication: categoryScores.multiplication.total > 0 
          ? (categoryScores.multiplication.correct / categoryScores.multiplication.total) * 100 : 0
      }
    };
  };

  // Intro Screen
  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-8">
        <div className="max-w-2xl bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold mb-4">Placement Assessment</h1>
            <p className="text-gray-600 mb-6">
              Let's find your perfect starting point! This quick assessment will help us understand 
              your current skill level and recommend the best learning tracks for you.
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-3">What to expect:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">📝</span>
                <span>10-15 math questions of varying difficulty</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⏱️</span>
                <span>Takes about 5-10 minutes</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎯</span>
                <span>Questions adapt to your skill level</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                <span>Get personalized recommendations</span>
              </li>
            </ul>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Skip for Now
            </button>
            <button
              onClick={() => setStage('testing')}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (stage === 'complete' && summary) {
    const placement = calculatePlacement(summary);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-4">Assessment Complete!</h1>
            <p className="text-gray-600">
              Great job! Here's your personalized learning profile.
            </p>
          </div>
          
          {/* Skill Level */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Overall Skill Level</h3>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-8 rounded-full flex items-center justify-end pr-3 transition-all"
                  style={{ width: `${placement.skillLevel}%` }}
                >
                  <span className="text-white font-semibold">{placement.skillLevel.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Beginner</span>
                <span>Intermediate</span>
                <span>Advanced</span>
              </div>
            </div>
          </div>
          
          {/* Detailed Scores */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Object.entries(placement.detailedScores).map(([category, score]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 capitalize">{category}</div>
                <div className="text-2xl font-bold text-gray-800">{score.toFixed(0)}%</div>
              </div>
            ))}
          </div>
          
          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {placement.strengths.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">💪 Strengths</h3>
                <ul className="space-y-1">
                  {placement.strengths.map(strength => (
                    <li key={strength} className="text-green-700 capitalize">
                      ✓ {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {placement.weaknesses.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2">📚 Areas to Improve</h3>
                <ul className="space-y-1">
                  {placement.weaknesses.map(weakness => (
                    <li key={weakness} className="text-orange-700 capitalize">
                      • {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Recommendations */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-800 mb-3">🎯 Recommended Learning Tracks</h3>
            <div className="space-y-2">
              {placement.recommendedTracks.map(track => (
                <div key={track} className="flex items-center text-blue-700">
                  <span className="mr-2">→</span>
                  <span className="capitalize">{track.replace(/-/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => onComplete(placement)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Testing Screen
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Placement Assessment</h2>
          
          <div className="flex items-center gap-4">
            {/* Progress Bar */}
            <div className="w-48">
              <div className="text-xs text-gray-600 mb-1">Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-8">
        {/* Question Display with Inline Input */}
        <div className="mb-8">
          <QuestionDisplay
            question={currentQuestion}
            onSubmit={handleInlineSubmit}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            disabled={false}
            mode="inline"
          />
        </div>

        {/* Optional Touchpad Input */}
        <details className="group">
          <summary className="cursor-pointer text-center text-sm text-gray-600 hover:text-gray-800 transition-colors mb-4">
            Prefer using a number pad? Click here ▼
          </summary>
          <TouchpadInput
            onSubmit={handleTouchpadSubmit}
            disabled={isAnswered}
            showFeedback={isAnswered}
            isCorrect={isCorrect}
          />
        </details>
      </div>
    </div>
  );
};
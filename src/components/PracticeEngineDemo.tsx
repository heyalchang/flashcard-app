import React, { useState, useEffect } from 'react';
import { PracticeEngine, createPracticeEngine } from '../engine/core/PracticeEngine';
import { MathPlugin } from '../engine/plugins/MathPlugin';
import { TouchpadInput } from './inputs/TouchpadInput';
import { Question, SessionSummary } from '../engine/types/core';
import { TouchInputHandler } from '../engine/strategies/InputHandler';

// Generate sample math questions
function generateMathQuestions(count: number): Question[] {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    questions.push({
      id: `q-${i}`,
      type: 'arithmetic',
      content: {
        expression: `${a} + ${b}`,
        operands: [a, b],
        operator: '+'
      },
      correctAnswer: a + b,
      metadata: {
        difficulty: a + b > 15 ? 'hard' : a + b > 10 ? 'medium' : 'easy'
      }
    });
  }
  return questions;
}

export const PracticeEngineDemo: React.FC = () => {
  const [engine, setEngine] = useState<PracticeEngine | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [touchHandler] = useState(() => new TouchInputHandler());

  useEffect(() => {
    // Create practice engine
    const mathPlugin = new MathPlugin();
    const questions = generateMathQuestions(10);
    
    const practiceEngine = createPracticeEngine(
      'practice',
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
          setCurrentQuestion(null);
        },
        onProgressUpdate: (progress) => {
          console.log('Progress:', progress);
        }
      }
    );

    setEngine(practiceEngine);

    return () => {
      practiceEngine.stop();
      touchHandler.cleanup();
    };
  }, []);

  const handleStart = () => {
    engine?.start();
  };

  const handleStop = () => {
    const finalSummary = engine?.stop();
    if (finalSummary) {
      setSummary(finalSummary);
    }
  };

  const handleTouchpadSubmit = (value: number) => {
    touchHandler.handleTouchInput(value);
  };

  if (summary && !currentQuestion) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p>Questions Attempted: {summary.questionsAttempted}</p>
          <p>Correct Answers: {summary.questionsCorrect}</p>
          <p>Accuracy: {(summary.accuracy * 100).toFixed(1)}%</p>
          <p>Average Response Time: {(summary.averageResponseTime / 1000).toFixed(1)}s</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start New Session
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Practice Engine Demo</h2>
        <p className="mb-4">Test the new composable practice engine with math problems</p>
        <button
          onClick={handleStart}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Start Practice
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-bold">Practice Mode</h2>
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Stop Session
        </button>
      </div>

      {/* Question Display */}
      <div className="mb-8 p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="text-4xl font-bold mb-2">
          {currentQuestion.content.expression} = ?
        </div>
        {isAnswered && (
          <div className={`mt-4 text-2xl ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Try again'}
          </div>
        )}
      </div>

      {/* TouchPad Input */}
      <TouchpadInput
        onSubmit={handleTouchpadSubmit}
        disabled={isAnswered}
        showFeedback={isAnswered}
        isCorrect={isCorrect}
      />

      {/* Progress */}
      {engine && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Progress: {engine.getProgress().questionsAttempted} / 10
        </div>
      )}
    </div>
  );
};
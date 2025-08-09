import React, { useState, useEffect, useRef } from 'react';
import { Track, PracticeMode, Question, SessionSummary } from '../engine/types/core';
import { PracticeEngine, createPracticeEngine } from '../engine/core/PracticeEngine';
import { MathPlugin } from '../engine/plugins/MathPlugin';
import { TouchpadInput } from './inputs/TouchpadInput';
import { QuestionDisplay } from './QuestionDisplay';
import { ProgressGrid } from './ProgressGrid';
import { MultiInputHandler, TouchInputHandler, VoiceInputHandler } from '../engine/strategies/InputHandler';
import { TimedProgressTracker } from '../engine/strategies/ProgressTracker';

interface PracticeSessionProps {
  track: Track;
  mode: PracticeMode;
  onEnd: () => void;
}

// Generate questions based on track
function generateQuestionsForTrack(track: Track): Question[] {
  const questions: Question[] = [];
  
  // Generate questions based on track ID
  switch (track.id) {
    case 'addition-basics':
      for (let i = 0; i < 20; i++) {
        const a = Math.floor(Math.random() * 10);
        const b = Math.floor(Math.random() * 10);
        questions.push({
          id: `add-${i}`,
          type: 'arithmetic',
          content: {
            expression: `${a} + ${b}`,
            operands: [a, b],
            operator: '+'
          },
          correctAnswer: a + b,
          metadata: {
            difficulty: a + b > 12 ? 'hard' : a + b > 6 ? 'medium' : 'easy',
            trackId: track.id
          }
        });
      }
      break;
      
    case 'subtraction-basics':
      for (let i = 0; i < 20; i++) {
        const a = Math.floor(Math.random() * 10) + 5;
        const b = Math.floor(Math.random() * Math.min(a, 10));
        questions.push({
          id: `sub-${i}`,
          type: 'arithmetic',
          content: {
            expression: `${a} - ${b}`,
            operands: [a, b],
            operator: '-'
          },
          correctAnswer: a - b,
          metadata: {
            difficulty: a - b > 7 ? 'hard' : a - b > 3 ? 'medium' : 'easy',
            trackId: track.id
          }
        });
      }
      break;
      
    case 'multiplication-intro':
      for (let i = 0; i < 25; i++) {
        const a = Math.floor(Math.random() * 6) + 1;
        const b = Math.floor(Math.random() * 6) + 1;
        questions.push({
          id: `mul-${i}`,
          type: 'arithmetic',
          content: {
            expression: `${a} × ${b}`,
            operands: [a, b],
            operator: '×'
          },
          correctAnswer: a * b,
          metadata: {
            difficulty: a * b > 20 ? 'hard' : a * b > 10 ? 'medium' : 'easy',
            trackId: track.id
          }
        });
      }
      break;
      
    default:
      // Default to addition for unknown tracks
      for (let i = 0; i < 10; i++) {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        questions.push({
          id: `default-${i}`,
          type: 'arithmetic',
          content: {
            expression: `${a} + ${b}`,
            operands: [a, b],
            operator: '+'
          },
          correctAnswer: a + b,
          metadata: {
            difficulty: 'medium',
            trackId: track.id
          }
        });
      }
  }
  
  return questions;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({ track, mode, onEnd }) => {
  const [engine, setEngine] = useState<PracticeEngine | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [progress, setProgress] = useState<SessionSummary | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const touchHandlerRef = useRef<TouchInputHandler>(new TouchInputHandler());
  const engineRef = useRef<PracticeEngine | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create practice engine based on mode
    const mathPlugin = new MathPlugin();
    const questions = generateQuestionsForTrack(track);
    
    // Create input handler based on mode
    let inputHandler: MultiInputHandler | TouchInputHandler;
    if (mode === 'fluency') {
      // Use both voice and touch for fluency mode
      const voiceHandler = new VoiceInputHandler(mathPlugin);
      inputHandler = new MultiInputHandler([voiceHandler, touchHandlerRef.current]);
    } else {
      inputHandler = touchHandlerRef.current;
    }
    
    const practiceEngine = createPracticeEngine(
      mode,
      mathPlugin,
      questions,
      {
        inputHandler,
        onQuestionChange: (question) => {
          setCurrentQuestion(question);
          setIsAnswered(false);
          setIsCorrect(false);
          setTimeRemaining(null);
          
          // Start timer for timed mode
          if (mode === 'timed' && question) {
            const tracker = practiceEngine.getProgress();
            if (tracker && 'getTimeTarget' in (practiceEngine as any).config.progressTracker) {
              const timeTarget = (practiceEngine as any).config.progressTracker.getTimeTarget(question.id);
              setTimeRemaining(Math.floor(timeTarget / 1000));
            }
          }
        },
        onAnswerSubmit: (answer, correct) => {
          setIsAnswered(true);
          setIsCorrect(correct);
        },
        onSessionComplete: (sessionSummary) => {
          setSummary(sessionSummary);
          setCurrentQuestion(null);
        },
        onProgressUpdate: (progressUpdate) => {
          setProgress(progressUpdate);
        }
      }
    );

    engineRef.current = practiceEngine;
    setEngine(practiceEngine);
    
    // Start the session
    practiceEngine.start();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      practiceEngine.stop();
      inputHandler.cleanup();
    };
  }, [track, mode]);

  // Timer for timed mode
  useEffect(() => {
    if (mode === 'timed' && timeRemaining !== null && !isPaused && !isAnswered) {
      timerRef.current = setTimeout(() => {
        if (timeRemaining > 0) {
          setTimeRemaining(timeRemaining - 1);
        } else {
          // Time's up - skip question
          engineRef.current?.skipQuestion();
        }
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [timeRemaining, mode, isPaused, isAnswered]);

  const handleTouchpadSubmit = (value: number) => {
    touchHandlerRef.current.handleTouchInput(value);
  };

  const handleInlineSubmit = (value: number) => {
    touchHandlerRef.current.handleTouchInput(value);
  };

  const handlePause = () => {
    if (engine) {
      if (isPaused) {
        engine.resume();
      } else {
        engine.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleSkip = () => {
    engine?.skipQuestion();
  };

  const handleEndSession = () => {
    const finalSummary = engine?.stop();
    if (finalSummary) {
      setSummary(finalSummary);
    }
  };

  // Show summary screen
  if (summary && !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-center mb-8">
              Session Complete! 🎉
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {summary.questionsAttempted}
                </div>
                <div className="text-sm text-gray-600 mt-1">Questions</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {summary.questionsCorrect}
                </div>
                <div className="text-sm text-gray-600 mt-1">Correct</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {(summary.accuracy * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Accuracy</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {(summary.averageResponseTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg Time</div>
              </div>
            </div>

            {/* Detailed Problem List */}
            {summary.attemptDetails && summary.attemptDetails.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Problem Details</h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Problem
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Your Answer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Correct Answer
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.attemptDetails.map((attempt, index) => (
                        <tr key={index} className={attempt.isCorrect ? 'bg-green-50' : 'bg-red-50'}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {attempt.question.content.expression || 
                             `${attempt.question.content.operands?.[0]} ${attempt.question.content.operator} ${attempt.question.content.operands?.[1]}`}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {attempt.userAnswer}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {attempt.question.correctAnswer}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                            {(attempt.responseTime / 1000).toFixed(1)}s
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center">
                            {attempt.isCorrect ? (
                              <span className="text-green-600 font-bold text-lg">✓</span>
                            ) : (
                              <span className="text-red-600 font-bold text-lg">✗</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Progress Grid */}
            {summary.progressEntries.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Mastery Progress</h3>
                <ProgressGrid entries={summary.progressEntries} />
              </div>
            )}

            {/* Mastery Achieved */}
            {summary.masteryAchieved.length > 0 && (
              <div className="mb-8 p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  🌟 Mastery Achieved!
                </h3>
                <p className="text-green-700">
                  You've mastered {summary.masteryAchieved.length} questions in this session!
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={onEnd}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Practice Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{track.name}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Timer for timed mode */}
            {mode === 'timed' && timeRemaining !== null && (
              <div className={`text-lg font-mono ${
                timeRemaining <= 3 ? 'text-red-600 animate-pulse' : 'text-gray-700'
              }`}>
                ⏱️ {timeRemaining}s
              </div>
            )}
            
            {/* Progress indicator */}
            {progress && (
              <div className="text-sm text-gray-600">
                Question {progress.questionsAttempted + 1} of {track.totalQuestions}
              </div>
            )}
            
            {/* Control buttons */}
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            
            {mode !== 'assessment' && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            )}
            
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Question Display with Inline Input */}
        <div className="mb-8">
          <QuestionDisplay
            question={currentQuestion}
            onSubmit={handleInlineSubmit}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            disabled={isPaused}
            showHint={mode === 'learn'}
            mode="inline"
          />
        </div>

        {/* Additional Input Methods */}
        {!isPaused && (
          <div className="mb-8">
            {/* Touchpad as supplementary input */}
            <details className="group">
              <summary className="cursor-pointer text-center text-sm text-gray-600 hover:text-gray-800 transition-colors">
                <span className="inline-block group-open:hidden">Need a number pad? Click here ▼</span>
                <span className="hidden group-open:inline-block">Hide number pad ▲</span>
              </summary>
              <div className="mt-4">
                <TouchpadInput
                  onSubmit={handleTouchpadSubmit}
                  disabled={isAnswered || isPaused}
                  showFeedback={isAnswered}
                  isCorrect={isCorrect}
                />
              </div>
            </details>
            
            {mode === 'fluency' && (
              <div className="text-center mt-4 text-sm text-gray-600">
                🎤 Voice input is active - speak your answer!
              </div>
            )}
          </div>
        )}

        {/* Paused overlay */}
        {isPaused && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">⏸️</div>
              <h3 className="text-2xl font-semibold mb-2">Session Paused</h3>
              <p className="text-gray-600 mb-4">Take your time!</p>
              <button
                onClick={handlePause}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="mt-8">
            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Session Progress</span>
                <span>{progress.questionsCorrect} correct</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-400 to-purple-600 h-3 rounded-full transition-all"
                  style={{ 
                    width: `${(progress.questionsAttempted / track.totalQuestions) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
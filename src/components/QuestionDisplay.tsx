import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../engine/types/core';

interface QuestionDisplayProps {
  question: Question;
  onSubmit: (answer: number) => void;
  isAnswered: boolean;
  isCorrect: boolean;
  disabled?: boolean;
  showHint?: boolean;
  onHintClick?: () => void;
  mode?: 'inline' | 'below'; // inline shows input next to =, below shows TouchpadInput separately
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  onSubmit,
  isAnswered,
  isCorrect,
  disabled = false,
  showHint = false,
  onHintClick,
  mode = 'inline'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when question changes
  useEffect(() => {
    if (!isAnswered && inputRef.current && mode === 'inline') {
      inputRef.current.focus();
    }
    setInputValue('');
  }, [question.id, isAnswered, mode]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (inputValue && !disabled) {
      const numValue = parseInt(inputValue, 10);
      if (!isNaN(numValue)) {
        onSubmit(numValue);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
    // Only allow numbers and backspace
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  if (mode === 'inline') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        {/* Inline Equation Display */}
        <div className="flex items-center justify-center text-5xl font-bold text-gray-800">
          <span>{question.content.expression}</span>
          <span className="mx-4">=</span>
          
          {!isAnswered ? (
            <div className="relative inline-block">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                placeholder=""
                className={`
                  w-32 px-4 py-2 text-5xl font-bold text-center
                  border-b-4 border-blue-400 bg-transparent
                  focus:outline-none focus:border-blue-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  ${inputValue ? 'text-blue-600' : 'text-gray-400'}
                `}
                style={{
                  caretColor: 'transparent' // Hide default caret
                }}
              />
              {/* Custom blinking cursor */}
              {!inputValue && !disabled && (
                <span 
                  className={`
                    absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    text-5xl font-normal text-blue-500
                    ${showCursor ? 'opacity-100' : 'opacity-0'}
                    transition-opacity duration-100
                    pointer-events-none
                  `}
                >
                  |
                </span>
              )}
              {/* Submit button appears when input has value */}
              {inputValue && !disabled && (
                <button
                  onClick={handleSubmit}
                  className="absolute -right-16 top-1/2 -translate-y-1/2 p-2 text-green-600 hover:text-green-700 transition-colors"
                  title="Submit answer"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <span className={`${isCorrect ? 'text-green-600' : 'text-red-600'} font-bold`}>
              {question.correctAnswer}
            </span>
          )}
        </div>

        {/* Feedback Message */}
        {isAnswered && (
          <div className={`mt-6 text-3xl font-semibold ${
            isCorrect ? 'text-green-600' : 'text-red-600'
          }`}>
            {isCorrect ? '✓ Correct!' : `✗ The answer is ${question.correctAnswer}`}
          </div>
        )}

        {/* Hint Button */}
        {showHint && !isAnswered && (
          <button 
            onClick={onHintClick}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            💡 Need a hint?
          </button>
        )}

        {/* Input helper text */}
        {!isAnswered && !disabled && (
          <div className="mt-4 text-sm text-gray-500">
            Type your answer and press Enter
          </div>
        )}
      </div>
    );
  }

  // Fallback to original layout with ? for 'below' mode
  return (
    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
      <div className="text-5xl font-bold mb-4 text-gray-800">
        {question.content.expression} = ?
      </div>
      
      {isAnswered && (
        <div className={`mt-6 text-3xl font-semibold ${
          isCorrect ? 'text-green-600' : 'text-red-600'
        }`}>
          {isCorrect ? '✓ Correct!' : `✗ The answer is ${question.correctAnswer}`}
        </div>
      )}
      
      {showHint && !isAnswered && (
        <button 
          onClick={onHintClick}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          💡 Need a hint?
        </button>
      )}
    </div>
  );
};
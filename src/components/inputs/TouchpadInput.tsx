import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface TouchpadInputProps {
  onSubmit: (value: number) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  isCorrect?: boolean;
  className?: string;
}

export const TouchpadInput: React.FC<TouchpadInputProps> = ({
  onSubmit,
  disabled = false,
  showFeedback = false,
  isCorrect = false,
  className
}) => {
  const [value, setValue] = useState('');
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string>('');

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key >= '0' && e.key <= '9') {
        setValue(prev => prev + e.key);
      } else if (e.key === 'Enter' && value) {
        handleSubmit();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setValue(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setValue('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [value, disabled]);

  const handleNumber = (num: number) => {
    if (disabled) return;
    setValue(prev => prev + num);
  };

  const handleClear = () => {
    setValue('');
  };

  const handleDelete = () => {
    setValue(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (value && !disabled) {
      const numValue = parseInt(value, 10);
      setLastSubmittedValue(value);
      onSubmit(numValue);
      setValue('');
    }
  };

  // Reset feedback when value changes
  useEffect(() => {
    if (value !== lastSubmittedValue) {
      setLastSubmittedValue('');
    }
  }, [value]);

  const buttonClass = "p-4 text-xl font-bold bg-white border-2 rounded-lg transition-all duration-200 select-none";
  const numberButtonClass = clsx(
    buttonClass,
    "border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100",
    disabled && "opacity-50 cursor-not-allowed"
  );
  
  const actionButtonClass = clsx(
    buttonClass,
    "border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200",
    disabled && "opacity-50 cursor-not-allowed"
  );

  const submitButtonClass = clsx(
    buttonClass,
    "col-span-2",
    disabled ? "opacity-50 cursor-not-allowed border-gray-300" : 
    showFeedback && lastSubmittedValue ? 
      (isCorrect ? "bg-green-100 border-green-500 hover:bg-green-200" : "bg-red-100 border-red-500 hover:bg-red-200") :
      "border-green-500 bg-green-50 hover:bg-green-100 hover:border-green-600 active:bg-green-200"
  );

  return (
    <div className={clsx("max-w-sm mx-auto", className)}>
      {/* Display */}
      <div className={clsx(
        "mb-4 p-4 text-2xl font-mono text-center bg-gray-100 rounded-lg border-2",
        showFeedback && lastSubmittedValue ? 
          (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") :
          "border-gray-300"
      )}>
        {value || (showFeedback && lastSubmittedValue) || '0'}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1: 1-2-3 */}
        {[1, 2, 3].map(num => (
          <button
            key={num}
            onClick={() => handleNumber(num)}
            disabled={disabled}
            className={numberButtonClass}
          >
            {num}
          </button>
        ))}

        {/* Row 2: 4-5-6 */}
        {[4, 5, 6].map(num => (
          <button
            key={num}
            onClick={() => handleNumber(num)}
            disabled={disabled}
            className={numberButtonClass}
          >
            {num}
          </button>
        ))}

        {/* Row 3: 7-8-9 */}
        {[7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumber(num)}
            disabled={disabled}
            className={numberButtonClass}
          >
            {num}
          </button>
        ))}

        {/* Row 4: Clear-0-Delete */}
        <button
          onClick={handleClear}
          disabled={disabled}
          className={actionButtonClass}
        >
          Clear
        </button>
        
        <button
          onClick={() => handleNumber(0)}
          disabled={disabled}
          className={numberButtonClass}
        >
          0
        </button>
        
        <button
          onClick={handleDelete}
          disabled={disabled}
          className={actionButtonClass}
        >
          ←
        </button>

        {/* Row 5: Submit (spans 2 columns) */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !value}
          className={submitButtonClass}
        >
          Enter
        </button>
      </div>

      {/* Feedback message */}
      {showFeedback && lastSubmittedValue && (
        <div className={clsx(
          "mt-4 p-3 text-center rounded-lg",
          isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        )}>
          {isCorrect ? '✓ Correct!' : '✗ Try again'}
        </div>
      )}
    </div>
  );
};
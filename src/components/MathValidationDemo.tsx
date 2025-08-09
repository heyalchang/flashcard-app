import React, { useState } from 'react';
import { EnhancedMathPlugin, ValidationOptions } from '../engine/plugins/EnhancedMathPlugin';
import { Question } from '../engine/types/core';

interface MathContent {
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '×' | '÷';
}

/**
 * Demo component to test and showcase the enhanced math validation
 */
export const MathValidationDemo: React.FC = () => {
  const [plugin] = useState(() => new EnhancedMathPlugin({
    useDynamicCalculation: true,
    useOperationSpecificTolerance: true,
    debugMode: true
  }));

  const [options, setOptions] = useState<ValidationOptions>({
    useDynamicCalculation: true,
    useOperationSpecificTolerance: true,
    debugMode: true
  });

  const [testResults, setTestResults] = useState<Array<{
    question: string;
    userAnswer: number;
    isCorrect: boolean;
    details: string;
  }>>([]);

  const testCases: Array<{
    question: Question<MathContent>;
    testAnswers: number[];
  }> = [
    {
      question: {
        id: '1',
        type: 'math',
        content: { operand1: 7, operand2: 8, operator: '×' },
        correctAnswer: 56 // This will be ignored if dynamic calculation is on
      },
      testAnswers: [56, 55, 57, 56.0, 55.99]
    },
    {
      question: {
        id: '2',
        type: 'math',
        content: { operand1: 15, operand2: 3, operator: '÷' },
        correctAnswer: 5
      },
      testAnswers: [5, 5.0, 4.99, 5.01, 4.95]
    },
    {
      question: {
        id: '3',
        type: 'math',
        content: { operand1: 12, operand2: 7, operator: '+' },
        correctAnswer: 19
      },
      testAnswers: [19, 19.0, 18.99, 19.01, 20]
    },
    {
      question: {
        id: '4',
        type: 'math',
        content: { operand1: 20, operand2: 8, operator: '-' },
        correctAnswer: 12
      },
      testAnswers: [12, 12.0, 11.99, 12.01, 11]
    },
    {
      question: {
        id: '5',
        type: 'math',
        content: { operand1: 17, operand2: 4, operator: '÷' },
        correctAnswer: 4.25
      },
      testAnswers: [4.25, 4.24, 4.26, 4.2, 4.3, 4]
    }
  ];

  const runTests = () => {
    const results: typeof testResults = [];

    // Update plugin options
    plugin.setOptions(options);

    testCases.forEach(({ question, testAnswers }) => {
      const { operand1, operand2, operator } = question.content;
      const questionStr = `${operand1} ${operator} ${operand2}`;

      testAnswers.forEach(userAnswer => {
        const isCorrect = plugin.validateAnswerWithQuestion(userAnswer, question);
        
        results.push({
          question: questionStr,
          userAnswer,
          isCorrect,
          details: `Dynamic calc: ${options.useDynamicCalculation}, Op-specific tolerance: ${options.useOperationSpecificTolerance}`
        });
      });
    });

    setTestResults(results);
  };

  const testVoiceInput = () => {
    const voiceInputs = [
      'twenty-five',
      'thirty one',
      'negative ten',
      'minus five',
      '42',
      'one hundred',
      'ninety-nine'
    ];

    console.log('Testing voice input parsing:');
    voiceInputs.forEach(input => {
      const parsed = plugin.parseAnswer(input);
      console.log(`  "${input}" → ${parsed}`);
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Math Validation Testing</h1>
      
      {/* Options Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Validation Options</h2>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.useDynamicCalculation}
              onChange={(e) => setOptions({...options, useDynamicCalculation: e.target.checked})}
              className="w-4 h-4"
            />
            <span>Use Dynamic Calculation (calculate answers on-the-fly)</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.useOperationSpecificTolerance}
              onChange={(e) => setOptions({...options, useOperationSpecificTolerance: e.target.checked})}
              className="w-4 h-4"
            />
            <span>Use Operation-Specific Tolerance</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.debugMode}
              onChange={(e) => setOptions({...options, debugMode: e.target.checked})}
              className="w-4 h-4"
            />
            <span>Debug Mode (check console for detailed logs)</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <span>Custom Tolerance:</span>
            <input
              type="number"
              step="0.001"
              placeholder="Default"
              value={options.tolerance ?? ''}
              onChange={(e) => setOptions({
                ...options, 
                tolerance: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              className="border rounded px-2 py-1 w-24"
            />
          </label>
        </div>
        
        <div className="mt-6 space-x-4">
          <button
            onClick={runTests}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Run Validation Tests
          </button>
          
          <button
            onClick={testVoiceInput}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Test Voice Input (Check Console)
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Question</th>
                  <th className="text-left p-2">User Answer</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-left p-2">Settings</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, i) => (
                  <tr key={i} className={`border-b ${result.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                    <td className="p-2 font-mono">{result.question}</td>
                    <td className="p-2">{result.userAnswer}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        result.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {result.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-gray-600">{result.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-sm">
              <strong>Summary:</strong> {testResults.filter(r => r.isCorrect).length} correct out of {testResults.length} tests
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Note: Check the browser console for detailed debug information when Debug Mode is enabled.
            </p>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">How It Works</h3>
        <ul className="space-y-2 text-sm">
          <li>• <strong>Dynamic Calculation:</strong> Calculates the correct answer from operands rather than using pre-stored answers</li>
          <li>• <strong>Operation-Specific Tolerance:</strong> Uses exact matching for +, -, × and 0.01 tolerance for ÷</li>
          <li>• <strong>Voice Input Support:</strong> Converts word numbers like "twenty-five" to numeric values</li>
          <li>• <strong>Debug Mode:</strong> Logs detailed validation steps to the console for troubleshooting</li>
        </ul>
      </div>
    </div>
  );
};
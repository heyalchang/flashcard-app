import React, { useState, useEffect } from 'react';
import './App.css';
import FlashCard from './components/FlashCard';
import PostLog from './components/PostLog';
import { TouchpadInput } from './components/inputs/TouchpadInput';
import { PracticeEngineDemo } from './components/PracticeEngineDemo';
import { Dashboard } from './components/Dashboard';
import { MathValidationDemo } from './components/MathValidationDemo';
import VoiceMode from './components/VoiceMode';
import { useWebSocket } from './hooks/useWebSocket';
import { generateQuestion } from './utils/questionGenerator';
import { Question, LogEntry } from './types';

function App() {
  const [appMode, setAppMode] = useState<'classic' | 'demo' | 'dashboard' | 'validation'>('dashboard');
  const [currentQuestion, setCurrentQuestion] = useState<Question>(generateQuestion());
  const [previousQuestion, setPreviousQuestion] = useState<Question | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<number | undefined>();
  // In production with monolithic deployment, use relative URLs
  const getWebSocketUrl = () => {
    if (process.env.REACT_APP_WS_URL && process.env.REACT_APP_WS_URL !== '') {
      return process.env.REACT_APP_WS_URL;
    }
    // If no env var or empty string, use relative URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  };
  
  const wsUrl = getWebSocketUrl();
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const { isConnected, lastMessage, clearLastMessage } = useWebSocket(wsUrl);

  useEffect(() => {
    console.log('Effect running, lastMessage:', lastMessage?.timestamp);
    if (lastMessage && lastMessage.payload) {
      
      // Check for both 'answer' and 'number' fields
      const receivedAnswer = lastMessage.payload.answer ?? lastMessage.payload.number;
      
      // Debug logging
      console.log('Current question:', currentQuestion.expression, '=', currentQuestion.answer);
      console.log('Received answer:', receivedAnswer);
      console.log('Type of received:', typeof receivedAnswer);
      console.log('Type of expected:', typeof currentQuestion.answer);
      
      // Ensure both are numbers for comparison
      const numericAnswer = Number(receivedAnswer);
      const isAnswerCorrect = numericAnswer === currentQuestion.answer;
      
      const newEntry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: lastMessage.timestamp,
        payload: {
          ...lastMessage.payload,
          _effectRun: new Date().toISOString(),
          _messageTimestamp: lastMessage.timestamp
        },
        isCorrect: isAnswerCorrect
      };

      setLogEntries((prev) => [...prev, newEntry]);
      
      // Clear any existing feedback first
      setIsAnswered(false);
      setIsCorrect(false);
      setLastAnswer(undefined);
      setPreviousQuestion(null);
      
      // Store the current question before generating new one
      setPreviousQuestion(currentQuestion);
      
      // Show new feedback
      setLastAnswer(numericAnswer);
      setIsAnswered(true);
      setIsCorrect(isAnswerCorrect);

      // Generate new question immediately
      setCurrentQuestion(generateQuestion());

      // Clear the message after processing to prevent duplicates
      clearLastMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, currentQuestion.answer, clearLastMessage]);

  // Handle manual input from TouchpadInput
  const handleManualAnswer = (answer: number) => {
    console.log('Manual answer submitted:', answer);
    const isAnswerCorrect = answer === currentQuestion.answer;
    
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload: {
        answer,
        source: 'manual'
      },
      isCorrect: isAnswerCorrect
    };

    setLogEntries((prev) => [...prev, newEntry]);
    
    // Store the current question before generating new one
    setPreviousQuestion(currentQuestion);
    
    // Show feedback
    setLastAnswer(answer);
    setIsAnswered(true);
    setIsCorrect(isAnswerCorrect);

    // Generate new question after a delay
    setTimeout(() => {
      setCurrentQuestion(generateQuestion());
      setIsAnswered(false);
      setIsCorrect(false);
      setLastAnswer(undefined);
    }, 1500);
  };

  // Show Dashboard (main app)
  if (appMode === 'dashboard') {
    return (
      <div className="App">
        <Dashboard onStartAssessment={() => console.log('Start assessment')} />
        <div className="fixed bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setAppMode('validation')}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
          >
            Test Validation
          </button>
          <button
            onClick={() => setAppMode('classic')}
            className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            Classic Mode
          </button>
        </div>
      </div>
    );
  }

  // Show Validation Demo
  if (appMode === 'validation') {
    return (
      <div className="App">
        <MathValidationDemo />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setAppMode('dashboard')}
            className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show Practice Engine Demo
  if (appMode === 'demo') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Practice Engine Demo</h1>
          <button
            onClick={() => setAppMode('dashboard')}
            className="text-sm underline"
          >
            Back to Dashboard
          </button>
        </header>
        <PracticeEngineDemo />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Math Flash Cards</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">● Connected</span>
          ) : (
            <span className="disconnected">● Disconnected</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAppMode('demo')}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Engine Demo
          </button>
          <button
            onClick={() => setAppMode('dashboard')}
            className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Dashboard
          </button>
        </div>
      </header>
      
      <main className="App-main">
        <div className="flashcard-container">
          <FlashCard 
            question={currentQuestion} 
            isAnswered={isAnswered} 
            isCorrect={isCorrect}
            lastAnswer={lastAnswer}
            previousQuestion={previousQuestion}
          />
          
          {/* Voice Mode Integration */}
          <div className="voice-mode-section mt-8">
            <VoiceMode />
          </div>
          
          {/* TouchPad Input Component as fallback */}
          <div className="mt-8">
            <TouchpadInput 
              onSubmit={handleManualAnswer}
              disabled={isAnswered}
              showFeedback={isAnswered}
              isCorrect={isCorrect}
            />
          </div>
          
          {/* Webhook info for manual testing */}
          {process.env.NODE_ENV === 'development' && (
            <div className="webhook-info mt-8 text-sm text-gray-600">
              <p>Voice agent not configured? Manual webhook available:</p>
              <code className="text-xs">{apiUrl}/webhook</code>
              <p className="text-xs mt-1">Format: {`{ "answer": <number> }`}</p>
            </div>
          )}
        </div>
        
        <div className="log-container">
          <PostLog entries={logEntries} />
        </div>
      </main>
    </div>
  );
}

export default App;
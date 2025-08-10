import React, { useState, useEffect } from 'react';
import './App.css';
import FlashCard from './components/FlashCard';
import PostLog from './components/PostLog';
import VoiceModeMinimal from './components/VoiceModeMinimal';
import { useWebSocket } from './hooks/useWebSocket';
import { generateQuestion } from './utils/questionGenerator';
import { Question, LogEntry } from './types';

/**
 * Minimal App - Simplified version with minimal voice integration
 */
function AppMinimal() {
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
  const { isConnected, lastMessage, clearLastMessage } = useWebSocket(wsUrl);

  // Process webhook messages
  useEffect(() => {
    if (lastMessage && lastMessage.payload) {
      const receivedAnswer = lastMessage.payload.answer ?? lastMessage.payload.number;
      
      if (receivedAnswer !== undefined) {
        const numericAnswer = Number(receivedAnswer);
        const isAnswerCorrect = numericAnswer === currentQuestion.answer;
        
        // Log the entry
        setLogEntries(prev => [...prev, {
          id: `${Date.now()}`,
          timestamp: lastMessage.timestamp,
          payload: lastMessage.payload,
          isCorrect: isAnswerCorrect
        }]);
        
        // Update UI
        setPreviousQuestion(currentQuestion);
        setLastAnswer(numericAnswer);
        setIsAnswered(true);
        setIsCorrect(isAnswerCorrect);
        
        // Generate new question
        setCurrentQuestion(generateQuestion());
        
        // Clear message
        clearLastMessage();
      }
    }
  }, [lastMessage, currentQuestion, clearLastMessage]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Math Flash Cards (Minimal)</h1>
        <div className="connection-status">
          WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </header>
      
      <main className="App-main">
        <div className="main-content">
          <div className="flashcard-section">
            <FlashCard 
              question={currentQuestion} 
              isAnswered={isAnswered} 
              isCorrect={isCorrect}
              lastAnswer={lastAnswer}
              previousQuestion={previousQuestion}
            />
            
            {/* Minimal Voice Integration */}
            <VoiceModeMinimal />
          </div>
          
          <div className="log-container">
            <PostLog entries={logEntries} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppMinimal;
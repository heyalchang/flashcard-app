import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import FlashCard from './components/FlashCard';
import PostLog from './components/PostLog';
import VoiceAgent from './components/VoiceAgent';
import { useWebSocket } from './hooks/useWebSocket';
import { generateQuestion } from './utils/questionGenerator';
import { pipecatService } from './services/pipecatService';
import { Question, LogEntry } from './types';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState<Question>(generateQuestion());
  const [previousQuestion, setPreviousQuestion] = useState<Question | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<number | undefined>();
  const [voiceConnected, setVoiceConnected] = useState(false);
  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3051';
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3051';
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
            
            {/* Voice Agent Integration */}
            {pipecatService.isConfigured() && (
              <div className="voice-agent-section">
                <VoiceAgent 
                  onConnectionChange={setVoiceConnected}
                  enableAutoJoin={false}
                />
              </div>
            )}
            
            {/* Fallback webhook info if voice agent not configured */}
            {!pipecatService.isConfigured() && (
              <div className="webhook-info">
                <p>Voice agent not configured. Manual webhook available:</p>
                <code>{apiUrl}/webhook</code>
                <p>Expected format:</p>
                <pre>{`{ "answer": <number> }
or
{ "number": <number> }`}</pre>
              </div>
            )}
          </div>
          
          <div className="log-container">
            <PostLog entries={logEntries} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
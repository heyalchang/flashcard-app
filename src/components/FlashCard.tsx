import React from 'react';
import { Question } from '../types';

interface FlashCardProps {
  question: Question;
  isAnswered: boolean;
  isCorrect: boolean;
  lastAnswer?: number;
  previousQuestion?: Question | null;
}

const FlashCard: React.FC<FlashCardProps> = ({ question, isAnswered, isCorrect, lastAnswer, previousQuestion }) => {
  // Use previous question for feedback if available, otherwise current
  const feedbackQuestion = previousQuestion || question;
  
  return (
    <div className="flash-card">
      <h2 className="question-text">
        {question.expression} = ?
      </h2>
      {isAnswered && (
        <div className={isCorrect ? "success-message" : "error-message"}>
          {isCorrect ? (
            <>✓ Correct! {feedbackQuestion.expression} = {feedbackQuestion.answer}</>
          ) : (
            <>✗ Incorrect. {feedbackQuestion.expression} = {feedbackQuestion.answer} (you answered {lastAnswer})</>
          )}
        </div>
      )}
    </div>
  );
};

export default FlashCard;
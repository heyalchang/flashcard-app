import { Question } from '../types';

export function generateQuestion(): Question {
  let operand1: number;
  let operand2: number;
  let operator: '+' | '-' | '×' | '÷';
  let answer: number;
  let expression: string;

  // Keep generating until we get an answer between 0 and 99
  do {
    // Choose random operator
    const operatorChoice = Math.floor(Math.random() * 4);
    
    switch (operatorChoice) {
      case 0: // Addition
        operator = '+';
        operand1 = Math.floor(Math.random() * 50); // 0-49
        operand2 = Math.floor(Math.random() * 50); // 0-49
        answer = operand1 + operand2;
        expression = `${operand1} ${operator} ${operand2}`;
        break;
        
      case 1: // Subtraction
        operator = '-';
        operand1 = Math.floor(Math.random() * 100); // 0-99
        operand2 = Math.floor(Math.random() * operand1 + 1); // 0 to operand1
        answer = operand1 - operand2;
        expression = `${operand1} ${operator} ${operand2}`;
        break;
        
      case 2: // Multiplication
        operator = '×';
        operand1 = Math.floor(Math.random() * 10); // 0-9
        operand2 = Math.floor(Math.random() * 11); // 0-10
        answer = operand1 * operand2;
        expression = `${operand1} ${operator} ${operand2}`;
        break;
        
      case 3: // Division
        operator = '÷';
        // Generate a multiplication first, then reverse it for clean division
        operand2 = Math.floor(Math.random() * 9) + 1; // 1-9 (no divide by 0)
        answer = Math.floor(Math.random() * 11); // 0-10
        operand1 = operand2 * answer; // This ensures clean division
        expression = `${operand1} ${operator} ${operand2}`;
        break;
        
      default:
        operator = '+';
        operand1 = 0;
        operand2 = 0;
        answer = 0;
        expression = '0 + 0';
    }
  } while (answer < 0 || answer > 99);

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    expression,
    answer,
    operator: operator as any, // Type assertion needed due to expanded operators
    operand1,
    operand2
  };
}
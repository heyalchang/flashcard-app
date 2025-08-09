# Answer Verification Flow Documentation

## Answer Verification Architecture

The app has a **multi-layered answer verification system** with the following flow:

```
User Input → PracticeEngine → Plugin Validation → Result
```

## 1. PRIMARY VERIFICATION POINT

### **PracticeEngine.ts** (Lines 120-140)
This is the **main verification hub** for all answers:

```typescript
// Line 127-140: Main validation logic
let isCorrect: boolean;
if ('validateAnswerWithQuestion' in this.config.plugin) {
  // Enhanced validation with full question context
  isCorrect = plugin.validateAnswerWithQuestion(answer, question);
} else {
  // Standard validation
  isCorrect = plugin.validateAnswer(answer, question.correctAnswer);
}
```

## 2. PLUGIN VALIDATION METHODS

### **MathPlugin.tsx** (Lines 45-51)
Basic math validation with floating point tolerance:

```typescript
validateAnswer(answer: number, correct: number): boolean {
  // Handle floating point precision for division
  if (Math.abs(answer - correct) < 0.01) {
    return true;
  }
  return answer === correct;
}
```

**Features:**
- Tolerance of 0.01 for floating point operations
- Exact match for integers
- Simple and fast

### **EnhancedMathPlugin.tsx** (Lines 100-129)
Advanced validation with dynamic calculation:

```typescript
validateAnswerWithQuestion(answer: number, question: Question): boolean {
  // Can calculate correct answer dynamically
  const correctAnswer = this.options.useDynamicCalculation
    ? this.calculateAnswer(operand1, operand2, operator)
    : question.correctAnswer;
    
  // Operation-specific tolerance
  const tolerance = this.getTolerance(operator);
  
  // Check if within tolerance
  return Math.abs(answer - correctAnswer) <= tolerance;
}
```

**Features:**
- Dynamic answer calculation option
- Operation-specific tolerances:
  - Addition/Subtraction/Multiplication: Exact match (0 tolerance)
  - Division: 0.01 tolerance for floating point
- Debug mode for logging validation details

## 3. ANSWER FLOW BY COMPONENT

### **PracticeSession Component**
```
1. User submits answer via QuestionDisplay/TouchpadInput
2. Answer goes to PracticeEngine (via touchHandler)
3. PracticeEngine.handleAnswer() called (Line 120)
4. MathPlugin.validateAnswer() verifies (Line 136)
5. Result recorded in ProgressTracker (Line 143)
6. UI updated via onAnswerSubmit callback
```

### **Assessment Component**
```
1. User submits answer
2. Answer goes to PracticeEngine (same as above)
3. Uses same validation pipeline
4. Results tracked for placement calculation
```

## 4. VERIFICATION FEATURES

### Tolerance Handling
- **Integer operations** (+ - ×): Exact match required
- **Division operations** (÷): 0.01 tolerance for floating point
- **Configurable per operation** in EnhancedMathPlugin

### Input Parsing (MathPlugin Lines 53-86)
Before verification, answers are parsed:
- Voice input: "twenty-one" → 21
- Text input: "21" → 21
- Handles compound numbers
- Cleans and normalizes input

### Dynamic Calculation Option
EnhancedMathPlugin can:
- Use pre-calculated answers from question object
- OR calculate answers on-the-fly
- Useful for ensuring consistency

## 5. KEY FILES AND LINE NUMBERS

### Core Verification
- `PracticeEngine.ts:127-140` - Main verification decision point
- `PracticeEngine.ts:143-147` - Recording verification results

### Plugin Validators
- `MathPlugin.tsx:45-51` - Basic validation method
- `EnhancedMathPlugin.tsx:100-129` - Enhanced validation
- `EnhancedMathPlugin.tsx:67-95` - Tolerance calculation

### Result Handling
- `PracticeEngine.ts:151` - Notify UI of result
- `ProgressTracker.ts:48-82` - Record attempt with result

## 6. VERIFICATION DECISION TREE

```
Answer Submitted
    ↓
Is Enhanced Plugin?
    ├─ Yes → validateAnswerWithQuestion()
    │         ├─ Calculate/Get correct answer
    │         ├─ Get operation tolerance
    │         └─ Check: |answer - correct| ≤ tolerance
    │
    └─ No → validateAnswer()
              └─ Check: |answer - correct| < 0.01 OR exact match
    ↓
Return: true/false
    ↓
Update Progress & UI
```

## 7. IMPORTANT NOTES

1. **Single Source of Truth**: All verification goes through PracticeEngine
2. **Plugin Flexibility**: Different plugins can have different validation rules
3. **Tolerance Control**: Can be adjusted per operation type
4. **Debug Support**: EnhancedMathPlugin has detailed logging
5. **Type Safety**: All answers converted to numbers before verification

## Future Improvements
- Add support for multiple correct answers
- Add partial credit scoring
- Add explanation generation for wrong answers
- Add adaptive tolerance based on user level
# Input Flow and Question Storage Documentation

## 1. WHERE QUESTIONS ARE STORED/GENERATED

Questions are **dynamically generated** at runtime, not stored in a database. Here's where they come from:

### Question Generation Points:

1. **PracticeSession Component** (`src/components/PracticeSession.tsx`)
   - Function: `generateQuestionsForTrack(track: Track)` (Line 18)
   - Generates 20-25 questions based on the selected track
   - Track types:
     - `addition-basics`: Random addition problems (0-10)
     - `subtraction-basics`: Random subtraction problems
     - `multiplication-intro`: Multiplication tables (2x, 5x, 10x)
     - `mixed-operations`: Mix of all operations

2. **Assessment Component** (`src/components/Assessment.tsx`)
   - Function: `generateAssessmentQuestions()` (Line 15)
   - Generates progressive difficulty questions:
     - Easy (0-5 range)
     - Medium (5-15 range)
     - Hard (15+ range)
   - Used for placement tests

3. **Dashboard Component** (`src/components/Dashboard.tsx`)
   - Passes track info to PracticeSession
   - Track selection determines which questions get generated

## 2. SINGLE POINT OF ENTRY FOR USER INPUT

The architecture has **multiple input methods** but they all funnel through a **single handler** pattern:

### Input Flow:

```
User Input Sources:
├── QuestionDisplay Component (Line 45: handleSubmit)
│   ├── Inline text input (Line 86: onChange)
│   ├── Keyboard events (Line 54: handleKeyPress)
│   └── Submit button click
│
├── TouchpadInput Component (Line 55: handleSubmit)
│   ├── On-screen number pad
│   ├── Keyboard input (Line 24: handleKeyPress)
│   └── Submit button
│
└── Voice Input (via WebSocket)
    └── Coming from webhook endpoint
```

### The Single Handler Pattern:

All input methods eventually call the **same onSubmit callback**:

1. **In PracticeSession.tsx** (Line 130-145):
```typescript
const handleAnswer = (answer: number) => {
  // Single point where all answers are processed
  const isCorrect = checkAnswer(currentQuestion, answer);
  // Update progress, move to next question, etc.
}
```

2. **In Assessment.tsx** (Line 118-130):
```typescript
const handleAnswer = (answer: number) => {
  // Another single handler for assessment mode
  const isCorrect = currentQuestion.correctAnswer === answer;
  // Track performance, calculate placement
}
```

## 3. COMPLETE DATA FLOW

```
1. Question Generation
   Dashboard → PracticeSession → generateQuestionsForTrack()
                                          ↓
                                    Question Array

2. Question Display
   Question Array → QuestionDisplay Component
                           ↓
                    Shows question + input

3. User Input
   Multiple Input Methods → onSubmit(answer)
                                ↓
                          handleAnswer()

4. Answer Processing
   handleAnswer() → Check correctness
                 → Update progress
                 → Move to next question
```

## 4. KEY FILES AND LINE NUMBERS

### Question Generation:
- `PracticeSession.tsx:18-90` - Main question generation
- `Assessment.tsx:15-95` - Assessment questions
- `Dashboard.tsx:125-180` - Track definitions

### Input Handling:
- `QuestionDisplay.tsx:45-52` - Submit handler
- `QuestionDisplay.tsx:54-70` - Keyboard/change handlers
- `TouchpadInput.tsx:24-40` - Keyboard listener
- `TouchpadInput.tsx:55-60` - Submit handler

### Answer Processing:
- `PracticeSession.tsx:130-145` - Main answer handler
- `Assessment.tsx:118-130` - Assessment answer handler

## 5. IMPORTANT NOTES

1. **No Database**: Questions are generated on-the-fly, not stored
2. **Single Handler**: Despite multiple input methods, there's always one handler function
3. **Type Safety**: All answers are converted to numbers before processing
4. **Validation**: Input is validated (numeric only) before submission
5. **Disabled State**: Input can be disabled during processing/feedback

## Future Considerations:
- Could add a question bank/database for consistency
- Could add voice input integration point
- Could add answer history tracking
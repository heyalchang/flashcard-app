# Assessment vs PracticeSession Component Comparison

## Overview
Both components use similar architecture but have significant redundancy that could be consolidated.

## Redundant Code (Nearly Identical)

### 1. **Component State Variables** 
Both components have identical state management:
```typescript
// Both components have:
const [engine, setEngine] = useState<PracticeEngine | null>(null);
const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
const [isAnswered, setIsAnswered] = useState(false);
const [isCorrect, setIsCorrect] = useState(false);
const [summary, setSummary] = useState<SessionSummary | null>(null);
```

### 2. **Engine Initialization**
Nearly identical PracticeEngine setup:
```typescript
// Both use:
const practiceEngine = createPracticeEngine(
  mode,
  mathPlugin,
  questions,
  {
    inputHandler: touchHandler,
    onQuestionChange: (question) => { /* same */ },
    onAnswerSubmit: (answer, correct) => { /* same */ },
    onSessionComplete: (sessionSummary) => { /* same */ },
    onProgressUpdate: (progressUpdate) => { /* slight difference */ }
  }
);
```

### 3. **Question Display HTML** (100% Identical)
```jsx
// Both components:
<div className="bg-white rounded-2xl shadow-xl p-12 text-center">
  <div className="text-5xl font-bold mb-4 text-gray-800">
    {currentQuestion.content.expression} = ?
  </div>
  
  {isAnswered && (
    <div className={`mt-6 text-3xl font-semibold ${
      isCorrect ? 'text-green-600' : 'text-red-600'
    }`}>
      {isCorrect ? '✓ Correct!' : `✗ The answer is ${currentQuestion.correctAnswer}`}
    </div>
  )}
</div>
```

### 4. **TouchpadInput Integration**
Identical implementation:
```jsx
// Both use:
<TouchpadInput
  onSubmit={handleTouchpadSubmit}
  disabled={isAnswered}
  showFeedback={isAnswered}
  isCorrect={isCorrect}
/>

// With identical handler:
const handleTouchpadSubmit = (value: number) => {
  touchHandler.handleTouchInput(value);
};
```

### 5. **Loading State**
Nearly identical loading spinner:
```jsx
// Both have similar:
if (!currentQuestion) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

## Unique Features

### Assessment Component Only:
1. **Multi-stage Flow**
   - `stage: 'intro' | 'testing' | 'complete'`
   - Intro screen with instructions
   - Complete screen with placement results

2. **Placement Calculation**
   ```typescript
   calculatePlacement(summary): PlacementResult {
     // Complex scoring by difficulty & category
     // Returns skill level, strengths, weaknesses
     // Recommends learning tracks
   }
   ```

3. **Fixed Question Set**
   - Generates 13 specific assessment questions
   - Difficulty progression (easy → medium → hard)
   - Multiple categories tested

4. **Results Screen**
   - Skill level visualization (0-100%)
   - Detailed scores by category
   - Strengths/weaknesses analysis
   - Track recommendations

### PracticeSession Component Only:
1. **Multiple Practice Modes**
   - Supports: learn, practice, timed, fluency
   - Mode-specific features (timer, hints, voice)

2. **Session Controls**
   ```jsx
   // Header with controls
   <button onClick={handlePause}>Pause</button>
   <button onClick={handleSkip}>Skip</button>
   <button onClick={handleEndSession}>End Session</button>
   ```

3. **Timer for Timed Mode**
   ```jsx
   {mode === 'timed' && timeRemaining !== null && (
     <div className={timeRemaining <= 3 ? 'text-red-600 animate-pulse' : ''}>
       ⏱️ {timeRemaining}s
     </div>
   )}
   ```

4. **Pause Functionality**
   - Full-screen pause overlay
   - Resume/pause state management

5. **Voice Input Support**
   ```typescript
   if (mode === 'fluency') {
     inputHandler = new MultiInputHandler([voiceHandler, touchHandler]);
   }
   ```

6. **Progress Bar**
   - Real-time session progress
   - Question count display

7. **Hint System** (Learn mode)
   ```jsx
   {mode === 'learn' && !isAnswered && (
     <button>💡 Need a hint?</button>
   )}
   ```

## Redundancy Analysis

### Highly Redundant (Could be Shared):
1. **Question Display Component** - 100% identical HTML/CSS
2. **TouchpadInput Integration** - Identical usage
3. **Engine Setup** - 90% identical
4. **State Management** - 80% identical variables
5. **Answer Feedback** - Identical correct/incorrect display

### Calculation:
- **Assessment.tsx**: ~500 lines
- **PracticeSession.tsx**: ~466 lines
- **Redundant Code**: ~200-250 lines (20-25% of total)

## Consolidation Recommendations

### 1. **Extract Shared Question Display Component**
```typescript
// New: QuestionCard.tsx
export const QuestionCard: React.FC<{
  question: Question;
  isAnswered: boolean;
  isCorrect: boolean;
  showHint?: boolean;
  onHintClick?: () => void;
}> = ({ question, isAnswered, isCorrect, showHint, onHintClick }) => {
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
        <button onClick={onHintClick} className="mt-4 text-sm text-blue-600">
          💡 Need a hint?
        </button>
      )}
    </div>
  );
};
```

### 2. **Create Base Practice Component**
```typescript
// New: BasePracticeSession.tsx
export const BasePracticeSession = ({
  mode,
  questions,
  onSessionComplete,
  renderHeader,
  renderControls,
  children
}) => {
  // Shared state
  const [engine, setEngine] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Shared engine setup
  // Shared TouchpadInput
  // Shared question display using QuestionCard
  
  return (
    <div>
      {renderHeader?.()}
      <QuestionCard {...sharedProps} />
      <TouchpadInput {...sharedProps} />
      {renderControls?.()}
      {children}
    </div>
  );
};
```

### 3. **Refactor Components to Use Base**
```typescript
// Assessment.tsx becomes:
export const Assessment = () => {
  if (stage === 'intro') return <IntroScreen />;
  if (stage === 'complete') return <ResultsScreen />;
  
  return (
    <BasePracticeSession
      mode="assessment"
      questions={generateAssessmentQuestions()}
      onSessionComplete={handleComplete}
    />
  );
};

// PracticeSession.tsx becomes:
export const PracticeSession = ({ track, mode }) => {
  return (
    <BasePracticeSession
      mode={mode}
      questions={generateQuestionsForTrack(track)}
      renderHeader={() => <SessionHeader />}
      renderControls={() => <SessionControls />}
    >
      {mode === 'timed' && <Timer />}
      {mode === 'fluency' && <VoiceIndicator />}
    </BasePracticeSession>
  );
};
```

## Benefits of Consolidation

1. **Reduce Code by ~200 lines** (20% reduction)
2. **Single source of truth** for question display
3. **Easier maintenance** - fix bugs in one place
4. **Consistent UX** - guaranteed identical behavior
5. **Easier to add new modes** - extend base component
6. **Better testing** - test shared components once

## Migration Path

1. **Phase 1**: Extract QuestionCard component
2. **Phase 2**: Extract shared state logic into custom hook
3. **Phase 3**: Create BasePracticeSession component
4. **Phase 4**: Refactor Assessment to use base
5. **Phase 5**: Refactor PracticeSession to use base
6. **Phase 6**: Remove redundant code

## Conclusion

While Assessment and PracticeSession serve different purposes, they share **~25% redundant code** that could be extracted into shared components. The main redundancies are:
- Question display (100% identical)
- TouchpadInput usage (100% identical)  
- State management (80% similar)
- Engine setup (90% similar)

Consolidation would improve maintainability while preserving each component's unique features.
# Question Display Architecture

## Overview
The flashcard-app uses a unified component structure to display questions across all practice modes, with specialized handling for Assessment mode.

## Component Hierarchy

```
Dashboard
├── Assessment (special case)
│   └── Question Display (inline)
└── PracticeSession (all other modes)
    ├── Question Display (inline)
    ├── TouchpadInput
    └── ProgressGrid (summary)
```

## Practice Mode Routing

### 1. **Assessment Mode**
- **Component**: `Assessment.tsx`
- **Launch**: Direct component render when `showAssessment === true`
- **Special Features**: 
  - Adaptive difficulty
  - Skill level calculation
  - Placement results

### 2. **All Other Modes (Learn, Practice, Timed, Fluency)**
- **Component**: `PracticeSession.tsx`
- **Launch**: When `isSessionActive === true` and mode is selected
- **Shared Features**:
  - Same question display layout
  - TouchpadInput for answers
  - Progress tracking
  - Session summary

## Question Display Components

### Main Question Display (Lines 387-407 in PracticeSession.tsx)
```jsx
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

### Key Components Used

#### 1. **PracticeSession.tsx** (Main Container)
- **Location**: `/src/components/PracticeSession.tsx`
- **Purpose**: Orchestrates the entire practice session
- **Responsibilities**:
  - Question generation based on track
  - Practice engine initialization
  - Mode-specific configurations
  - Session state management
  - Progress tracking

#### 2. **TouchpadInput.tsx** (Answer Input)
- **Location**: `/src/components/inputs/TouchpadInput.tsx`
- **Purpose**: Numeric keypad for answer input
- **Features**:
  - Visual number pad (0-9)
  - Keyboard support
  - Clear/Delete buttons
  - Submit button with feedback
  - Color-coded feedback (green/red)

#### 3. **Assessment.tsx** (Special Mode)
- **Location**: `/src/components/Assessment.tsx`
- **Purpose**: Placement test with adaptive difficulty
- **Unique Features**:
  - Multi-stage flow (intro → assessment → complete)
  - Skill level calculation
  - Track recommendations
  - Strengths/weaknesses analysis

#### 4. **ProgressGrid.tsx** (Progress Visualization)
- **Location**: `/src/components/ProgressGrid.tsx`
- **Purpose**: Visual grid showing mastery levels
- **Used In**: Session summary screen

## Data Flow

### 1. Question Generation
```typescript
// PracticeSession.tsx (lines 17-108)
function generateQuestionsForTrack(track: Track): Question[] {
  switch (track.id) {
    case 'addition-basics':
      // Generate addition questions
    case 'subtraction-basics':
      // Generate subtraction questions
    case 'multiplication-intro':
      // Generate multiplication questions
  }
}
```

### 2. Question Structure
```typescript
interface Question {
  id: string;
  type: 'arithmetic';
  content: {
    expression: string;      // "7 + 8"
    operands: number[];      // [7, 8]
    operator: string;        // "+"
    operand1?: number;       // 7
    operand2?: number;       // 8
  };
  correctAnswer: number;     // 15
  metadata?: {
    difficulty: 'easy' | 'medium' | 'hard';
    trackId: string;
  };
}
```

### 3. Answer Submission Flow
```
User Input → TouchpadInput → handleTouchpadSubmit → 
TouchInputHandler → PracticeEngine → validateAnswer →
Update State → Show Feedback → Next Question
```

## Mode-Specific Features

### Learn Mode
- Unlimited time per question
- Hints available (button shown, not fully implemented)
- Sequential question order
- No time pressure

### Practice Mode
- Random question order
- Standard practice without time limits
- Progress tracking
- Can skip questions

### Timed Mode
- **Timer Display**: Shows countdown (e.g., "⏱️ 10s")
- **Auto-skip**: Moves to next question when time expires
- **Visual Warning**: Timer turns red and pulses at 3 seconds
- **Adaptive Timing**: Based on question difficulty

### Fluency Mode
- **Voice Input**: Active microphone indicator
- **Multi-input**: Both voice and touchpad supported
- **Speed Focus**: Emphasizes quick responses
- **Uses**: `MultiInputHandler` with voice and touch

### Assessment Mode
- **Separate Component**: Uses Assessment.tsx
- **Multi-stage**: Intro → Test → Results
- **Adaptive**: Adjusts difficulty based on performance
- **Placement**: Determines starting track

## UI Layout

### Header Section
```jsx
<div className="bg-white shadow-sm">
  <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <h2>{track.name}</h2>
      <span>{mode} Mode</span>
    </div>
    <div className="flex items-center gap-4">
      {/* Timer (if timed mode) */}
      {/* Progress indicator */}
      {/* Control buttons (Pause, Skip, End) */}
    </div>
  </div>
</div>
```

### Main Content Area
```jsx
<div className="max-w-4xl mx-auto p-8">
  {/* Question Display */}
  <div className="mb-8">
    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
      {/* Question text */}
      {/* Feedback (if answered) */}
      {/* Hint button (if learn mode) */}
    </div>
  </div>
  
  {/* Input Section */}
  <TouchpadInput />
  
  {/* Progress Bar */}
  <div className="mt-8">
    {/* Session progress visualization */}
  </div>
</div>
```

## Session States

### Active Session
1. **Loading**: Shows spinner while loading questions
2. **Question Display**: Main practice interface
3. **Paused**: Overlay with resume button
4. **Complete**: Summary screen with statistics

### Session Summary
- Questions attempted
- Correct answers
- Accuracy percentage
- Average response time
- Progress grid visualization
- Mastery achievements
- Options to return or practice again

## Engine Integration

### PracticeEngine Configuration
```typescript
const practiceEngine = createPracticeEngine(
  mode,                    // 'learn' | 'practice' | 'timed' | 'fluency'
  mathPlugin,              // Domain plugin for math
  questions,               // Generated questions array
  {
    inputHandler,          // Touch or Multi-input handler
    onQuestionChange,      // Update current question
    onAnswerSubmit,        // Handle answer feedback
    onSessionComplete,     // Show summary
    onProgressUpdate       // Update progress tracking
  }
);
```

## Visual Styling

### Color Scheme
- **Default**: White background with gray borders
- **Correct Answer**: Green (`text-green-600`, `bg-green-50`)
- **Incorrect Answer**: Red (`text-red-600`, `bg-red-50`)
- **Timer Warning**: Red with pulse animation
- **Mode Badge**: Blue background (`bg-blue-100`)

### Typography
- **Question Text**: `text-5xl font-bold`
- **Feedback Text**: `text-3xl font-semibold`
- **Header Text**: `text-xl font-semibold`
- **Progress Text**: `text-sm text-gray-600`

### Layout
- **Max Width**: `max-w-4xl` for content area
- **Card Style**: `rounded-2xl shadow-xl`
- **Padding**: `p-12` for question display
- **Spacing**: `mb-8` between sections

## Summary

The question display architecture uses a unified approach with `PracticeSession.tsx` handling most modes, while `Assessment.tsx` provides specialized placement testing. All modes share:

1. **Consistent Visual Layout**: Same card-based question display
2. **TouchpadInput Component**: Unified answer input method
3. **Progress Tracking**: Real-time session statistics
4. **Feedback System**: Immediate correct/incorrect indication
5. **Session Management**: Pause, skip, and end controls

The modular design allows for easy extension and maintenance while providing a consistent user experience across all practice modes.
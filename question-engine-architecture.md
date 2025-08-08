# Question Engine Architecture

## Overview
The **Question Engine** is a multi-modal question/answer system that presents questions to users and accepts answers through various input methods including voice, keyboard, and touchpad interfaces.

## Core Concept
This is NOT just a "practice" engine - it's a comprehensive **Question Presentation and Response System** that can be used for:
- 📚 Learning (educational questions)
- 🎯 Assessment (placement tests)
- 🏃 Training (skill development)
- 🎮 Gaming (quiz games)
- 📊 Surveying (data collection)
- 🧪 Testing (knowledge evaluation)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Question Engine                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Question Presentation Layer             │  │
│  │                                                     │  │
│  │  • Display question content                        │  │
│  │  • Show multimedia (images, audio, video)          │  │
│  │  • Provide hints and explanations                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Multi-Modal Input Layer                │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Voice   │  │ Keyboard │  │ Touchpad │        │  │
│  │  │  Input   │  │  Input   │  │  Input   │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  │       🎤            ⌨️            🔢               │  │
│  └─────────────────────────────────────────────────────┘  │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Answer Validation Layer                │  │
│  │                                                     │  │
│  │  • Parse input (voice → text → number)            │  │
│  │  • Validate against correct answer                 │  │
│  │  • Apply domain-specific rules                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                           ↓                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Progress & Analytics Layer             │  │
│  │                                                     │  │
│  │  • Track response times                            │  │
│  │  • Calculate accuracy                              │  │
│  │  • Measure mastery/fluency                         │  │
│  │  • Generate reports                                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Question Engine Core (`QuestionEngine.ts`)
The central orchestrator that manages the entire question/answer flow.

**Responsibilities:**
- Session lifecycle (start, pause, resume, stop)
- Question sequencing
- Answer routing
- Progress tracking
- Event coordination

**Key Methods:**
```typescript
class QuestionEngine {
  start(): void                    // Begin a question session
  stop(): SessionSummary           // End session and get results
  pause(): void                    // Pause current session
  resume(): void                   // Resume from pause
  skipQuestion(): void             // Skip to next question
  requestHint(): void              // Get hint for current question
  handleAnswer(answer): void       // Process any type of answer
}
```

### 2. Input Handlers (Multi-Modal Input System)

#### Voice Input Handler
```typescript
class VoiceInputHandler {
  // Converts speech to answers
  startListening(): void
  stopListening(): void
  onTranscript(text: string): void
}
```

#### Keyboard Input Handler
```typescript
class KeyboardInputHandler {
  // Captures typed answers
  handleKeyPress(key: string): void
  handleSubmit(): void
}
```

#### Touchpad Input Handler
```typescript
class TouchpadInputHandler {
  // Visual numeric keypad
  handleNumber(num: number): void
  handleClear(): void
  handleSubmit(): void
}
```

### 3. Question Providers (Content Management)

Different strategies for serving questions:

```typescript
interface QuestionProvider {
  getNext(): Question | null
  hasMore(): boolean
  reset(): void
}

// Implementations:
SimpleQuestionProvider      // Sequential or random order
AdaptiveQuestionProvider    // Adjusts difficulty based on performance
SpacedRepetitionProvider    // Returns questions based on memory curve
CustomSequenceProvider      // User-defined question order
```

### 4. Domain Plugins (Subject Matter Expertise)

Plugins make the engine work with any type of content:

```typescript
interface DomainPlugin {
  // Core functionality
  validateAnswer(answer: any, correct: any): boolean
  parseAnswer(input: string): any
  
  // Display
  renderQuestion(question: Question): ReactNode
  formatAnswer(answer: any): string
  
  // Learning support
  getHint(question: Question, attempt: number): string
  getExplanation(question: Question): string
  
  // Progress
  calculateMastery(progress: ProgressEntry): number
}
```

**Example Plugins:**
- `MathPlugin` - Mathematical operations
- `LanguagePlugin` - Vocabulary, grammar
- `SciencePlugin` - Scientific concepts
- `HistoryPlugin` - Historical facts
- `CodingPlugin` - Programming challenges

### 5. Progress Trackers (Analytics)

Track and analyze user performance:

```typescript
interface ProgressTracker {
  recordAttempt(question, answer, isCorrect, time): void
  getSummary(): SessionSummary
  getQuestionProgress(questionId): ProgressEntry
  getMastery(): number
}
```

## Input Flow Examples

### Voice Input Flow
```
User speaks "twenty five"
    ↓
VoiceInputHandler captures audio
    ↓
Speech-to-text: "twenty five"
    ↓
Plugin.parseAnswer(): "twenty five" → 25
    ↓
Plugin.validateAnswer(25, correctAnswer)
    ↓
Progress recorded
    ↓
Feedback displayed
```

### Keyboard Input Flow
```
User types "2" "5" "Enter"
    ↓
KeyboardInputHandler buffers: "25"
    ↓
On Enter: submit("25")
    ↓
Plugin.parseAnswer(): "25" → 25
    ↓
Plugin.validateAnswer(25, correctAnswer)
    ↓
Progress recorded
    ↓
Feedback displayed
```

### Touchpad Input Flow
```
User taps [2] [5] [Submit]
    ↓
TouchpadInputHandler builds: "25"
    ↓
On Submit: handleTouchInput(25)
    ↓
Plugin.validateAnswer(25, correctAnswer)
    ↓
Progress recorded
    ↓
Feedback displayed
```

## Session Modes

The Question Engine supports different modes, but these are just **configurations**, not fundamental changes:

### Learn Mode
- **Question Order**: Sequential
- **Feedback Duration**: Extended (3s for incorrect)
- **Features**: Hints available, unlimited time
- **Use Case**: First exposure to material

### Practice Mode
- **Question Order**: Random
- **Feedback Duration**: Standard (1.5s)
- **Features**: Skip button, progress tracking
- **Use Case**: Reinforcement learning

### Timed Mode
- **Question Order**: Random
- **Feedback Duration**: Quick (1s)
- **Features**: Countdown timer, auto-skip
- **Use Case**: Speed training

### Fluency Mode
- **Question Order**: Adaptive
- **Feedback Duration**: Minimal (500ms)
- **Features**: Voice priority, instant feedback
- **Use Case**: Mastery development

### Assessment Mode
- **Question Order**: Fixed sequence
- **Feedback Duration**: Standard
- **Features**: No skipping, detailed analytics
- **Use Case**: Skill evaluation

## Benefits of "Question Engine" Naming

1. **Clarity**: Immediately understood as Q&A system
2. **Flexibility**: Not limited to "practice" scenarios
3. **Extensibility**: Can add survey, quiz, test modes
4. **Professional**: Sounds like enterprise software
5. **Accurate**: Reflects multi-modal input capability

## Use Cases Beyond Practice

### Educational Assessment
```typescript
const assessmentEngine = new QuestionEngine({
  plugin: new MathPlugin(),
  questions: standardizedTestQuestions,
  mode: 'assessment'
});
```

### Language Learning
```typescript
const languageEngine = new QuestionEngine({
  plugin: new SpanishPlugin(),
  inputHandler: new VoiceInputHandler(), // Practice pronunciation
  mode: 'fluency'
});
```

### Corporate Training
```typescript
const trainingEngine = new QuestionEngine({
  plugin: new CompliancePlugin(),
  questions: companyPolicyQuestions,
  mode: 'learn'
});
```

### Interactive Surveys
```typescript
const surveyEngine = new QuestionEngine({
  plugin: new SurveyPlugin(),
  inputHandler: new MultiInputHandler([voice, keyboard, touch]),
  mode: 'survey'
});
```

## Future Enhancements

### Additional Input Methods
- 📷 **Camera Input**: Solve by showing written work
- 🎨 **Drawing Input**: Draw the answer
- 🎮 **Gesture Input**: Motion-based answers
- 👁️ **Eye Tracking**: Look at the answer
- 🧠 **Brain-Computer Interface**: Think the answer

### Advanced Features
- **Multi-language support**: Questions in any language
- **Collaborative mode**: Multiple users answer together
- **AI-generated questions**: Dynamic content creation
- **Real-time adaptation**: Difficulty adjusts mid-session
- **Emotion detection**: Adjust based on frustration level

## Conclusion

The **Question Engine** is a comprehensive, multi-modal question and answer system that goes far beyond simple "practice" functionality. By supporting voice, keyboard, and touchpad inputs, it provides an accessible and flexible platform for any question-based interaction, from education to assessment to gaming.
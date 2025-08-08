# Flashcard Development Guide

## Architecture Overview

This flashcard app uses a React frontend with a Node.js/Express backend connected via WebSockets for real-time communication. Voice agents send answers via webhook to the backend, which forwards them to the frontend.

```
Voice Agent → POST /webhook → Express Server → WebSocket → React App
```

## Key Lessons from Development

### 1. Message Handling Pattern

**❌ BAD: Persistent Message State**
```typescript
// Messages stay in state after processing
const [lastMessage, setLastMessage] = useState(null);

useEffect(() => {
  if (lastMessage) {
    processMessage(lastMessage);
    // Message remains in state, can be reprocessed!
  }
}, [lastMessage, someOtherDep]);
```

**✅ GOOD: Clear After Consuming**
```typescript
const { lastMessage, clearLastMessage } = useWebSocket();

useEffect(() => {
  if (lastMessage) {
    processMessage(lastMessage);
    clearLastMessage(); // Prevent reprocessing
  }
}, [lastMessage, clearLastMessage]);
```

### 2. React Dependency Arrays

**Critical Rule**: Be extremely careful what you put in dependency arrays. Object references matter!

```typescript
// This re-runs when currentQuestion object changes (new reference)
useEffect(() => {}, [currentQuestion]);

// This only re-runs when the answer value changes
useEffect(() => {}, [currentQuestion.answer]);
```

### 3. State Updates and Re-renders

Every state update causes a re-render. Multiple state updates = multiple re-renders = multiple effect runs.

```typescript
// Each setState causes a re-render
setIsAnswered(true);      // Re-render 1
setIsCorrect(true);        // Re-render 2  
setLastAnswer(answer);     // Re-render 3
```

If your effect depends on state and doesn't clear consumed data, each re-render can reprocess the same data.

### 4. WebSocket Design Principles

1. **Messages are events, not state** - They should be processed once and discarded
2. **Add message deduplication** - Use timestamps or IDs to prevent double-processing
3. **Consider callbacks over state** - `onMessage: (msg) => {}` instead of `lastMessage` state

### 5. Debugging Strategy

When facing duplicate processing:

1. **Add console logs at the start of effects** to see how often they run
2. **Log what triggers the effect** - which dependency changed?
3. **Check for state that persists across renders** - this is usually the culprit
4. **Trace the component lifecycle** - what causes re-renders?

### 6. Common Pitfalls

- **Forgetting to clear consumed messages/events**
- **Including entire objects in dependency arrays instead of specific properties**
- **Not considering how new features increase re-render frequency**
- **Assuming effects only run when you expect them to**

## Best Practices

### WebSocket Hook Design

```typescript
// Good: Provides control over message lifecycle
export function useWebSocket(url) {
  const [lastMessage, setLastMessage] = useState(null);
  
  const clearLastMessage = useCallback(() => {
    setLastMessage(null);
  }, []);

  // ... websocket setup ...

  return { lastMessage, clearLastMessage, isConnected };
}
```

### Message Processing

```typescript
// Good: Defensive programming
useEffect(() => {
  if (!lastMessage) return;
  
  // Process message
  handleMessage(lastMessage);
  
  // Always clear after processing
  clearLastMessage();
}, [lastMessage, clearLastMessage]);
```

### State Management

```typescript
// Good: Batch related state updates
const handleAnswer = (answer) => {
  // Process answer first
  const isCorrect = answer === currentQuestion.answer;
  
  // Then update all state at once
  setAnswerState({
    isAnswered: true,
    isCorrect,
    lastAnswer: answer
  });
};
```

## Testing Considerations

1. **Test with rapid re-renders** - Add temporary state changes to force re-renders
2. **Test with delayed messages** - Ensure old messages aren't reprocessed
3. **Test reconnection scenarios** - WebSocket reconnects shouldn't replay messages
4. **Monitor console logs** - Effects should run predictably

## Summary

The most important lesson: **Events should be consumed, not stored**. When building real-time features:

1. Process messages immediately
2. Clear them after processing
3. Be extremely careful with effect dependencies
4. Expect components to re-render often
5. Design with re-renders in mind

Remember: A bug that only appears when you add features means the bug was always there - the new features just exposed it.
# Practice Modes Layout - 3 Row Design

## Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│                     Choose Practice Mode                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Row 1: Initial Learning & Evaluation                         │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  📊 Assessment       │  │  📚 Learn           │           │
│  │  Test your current  │  │  Step-by-step       │           │
│  │  skill level        │  │  introduction       │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                                │
│  Row 2: Core Practice Modes                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  🎯 Practice        │  │  ⏱️ Timed           │           │
│  │  Practice at your   │  │  Beat the clock     │           │
│  │  own pace           │  │  challenge          │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                                │
│  Row 3: Advanced Mastery                                      │
│  ┌──────────────────────────────────────────────┐           │
│  │        🌟 RECOMMENDED FOR MASTERY             │           │
│  │  ┌────────────────────────────────────────┐  │           │
│  │  │       🎤 Fluency Test                   │  │           │
│  │  │  Master automatic recall with voice     │  │           │
│  │  └────────────────────────────────────────┘  │           │
│  └──────────────────────────────────────────────┘           │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Design Rationale

### Row 1: Initial Learning & Evaluation (Blue when selected)
- **Assessment**: Entry point for new users to understand their level
- **Learn**: Structured introduction for beginners

### Row 2: Core Practice (Green when selected)
- **Practice**: Standard self-paced practice
- **Timed**: Adds time pressure for skill building

### Row 3: Mastery Focus (Purple gradient, always prominent)
- **Fluency Test**: The ultimate goal - automatic recall with voice input
- Full-width design emphasizes importance
- "RECOMMENDED FOR MASTERY" badge draws attention
- Purple-to-pink gradient makes it stand out

## Color Scheme

- **Default**: White background with gray border
- **Row 1 Selected**: Blue (#3B82F6)
- **Row 2 Selected**: Green (#10B981)
- **Row 3**: Purple-to-pink gradient (always colored)
- **Row 3 Selected**: Darker purple-to-pink gradient

## Features by Mode

### Assessment (Row 1)
- Evaluates current skill level
- Adaptive difficulty
- Comprehensive results
- Identifies strengths and weaknesses

### Learn (Row 1)
- Step-by-step introduction
- Questions presented in order
- Unlimited time per question
- Hints available

### Practice (Row 2)
- Random question order
- Practice until mastery
- Track progress
- Build confidence

### Timed (Row 2)
- Time pressure increases difficulty
- Improve speed and accuracy
- Adaptive time targets
- Great for fluency building

### Fluency Test (Row 3)
- **Voice-activated responses** for hands-free practice
- **Build instant recall** - answer in under 3 seconds
- **Track fluency progress** through 6 mastery levels
- **Adaptive difficulty** based on performance
- **Real-time feedback** with accuracy tracking

## User Flow

1. **New Users**: Start with Assessment → Learn → Practice
2. **Returning Users**: Practice → Timed → Fluency Test
3. **Advanced Users**: Focus on Fluency Test for mastery

## Implementation Details

### Component Structure
```typescript
const practiceModes = [
  // Row 1
  { mode: 'assessment', row: 1, ... },
  { mode: 'learn', row: 1, ... },
  // Row 2
  { mode: 'practice', row: 2, ... },
  { mode: 'timed', row: 2, ... },
  // Row 3
  { mode: 'fluency', row: 3, isMain: true, ... }
];
```

### Responsive Design
- Rows 1 & 2: 2-column grid
- Row 3: Full-width single column
- Mobile: All cards stack vertically
- Hover effects: scale-102 with shadow
- Selected state: scale-105 with enhanced shadow

## Benefits of This Layout

1. **Clear Progression**: Visual hierarchy shows learning path
2. **Emphasis on Mastery**: Fluency Test is prominently featured
3. **Balanced Layout**: Symmetric 2-2-1 grid structure
4. **Color Coding**: Different colors help distinguish mode categories
5. **Accessibility**: Large touch targets, clear labels
6. **Engagement**: Interactive hover and selection states
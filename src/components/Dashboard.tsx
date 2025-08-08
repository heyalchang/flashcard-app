import React, { useState, useEffect } from 'react';
import { Track, PracticeMode, PlacementResult, Question, ProgressEntry } from '../engine/types/core';
import { PracticeSession } from './PracticeSession';
import { Assessment } from './Assessment';
import { LearningGrid } from './LearningGrid';
import { PracticeTimeTracker } from './PracticeTimeTracker';

// Mock tracks data - in production, this would come from a database
const mockTracks: Track[] = [
  {
    id: 'addition-basics',
    name: 'Addition Basics',
    description: 'Master single-digit addition',
    icon: '➕',
    totalQuestions: 20,
    masteredQuestions: 0,
    locked: false
  },
  {
    id: 'subtraction-basics',
    name: 'Subtraction Basics',
    description: 'Learn single-digit subtraction',
    icon: '➖',
    totalQuestions: 20,
    masteredQuestions: 0,
    locked: false
  },
  {
    id: 'multiplication-intro',
    name: 'Multiplication Introduction',
    description: 'Introduction to multiplication',
    icon: '✖️',
    totalQuestions: 25,
    masteredQuestions: 0,
    locked: true,
    prerequisites: ['addition-basics']
  },
  {
    id: 'division-intro',
    name: 'Division Introduction',
    description: 'Learn basic division',
    icon: '➗',
    totalQuestions: 25,
    masteredQuestions: 0,
    locked: true,
    prerequisites: ['multiplication-intro']
  }
];

const practiceModes: { mode: PracticeMode; label: string; description: string; icon: string; row: number; isMain?: boolean }[] = [
  // Row 1
  { mode: 'assessment', label: 'Assessment', description: 'Test your current skill level', icon: '📊', row: 1 },
  { mode: 'learn', label: 'Learn', description: 'Step-by-step introduction', icon: '📚', row: 1 },
  // Row 2
  { mode: 'practice', label: 'Practice', description: 'Practice at your own pace', icon: '🎯', row: 2 },
  { mode: 'timed', label: 'Timed', description: 'Beat the clock challenge', icon: '⏱️', row: 2 },
  // Row 3
  { mode: 'fluency', label: 'Fluency Test', description: 'Master automatic recall with voice', icon: '🎤', row: 3, isMain: true }
];

interface DashboardProps {
  onStartAssessment?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartAssessment }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [tracks, setTracks] = useState<Track[]>(mockTracks);
  const [trackQuestions, setTrackQuestions] = useState<Question[]>([]);
  const [trackProgress, setTrackProgress] = useState<Map<string, ProgressEntry>>(new Map());
  const [dailyMinutes, setDailyMinutes] = useState(0);

  const handleTrackSelect = (track: Track) => {
    if (!track.locked) {
      setSelectedTrack(track);
      setSelectedMode(null);
    }
  };

  const handleModeSelect = (mode: PracticeMode) => {
    if (!selectedTrack) return;
    
    // Special handling for assessment mode
    if (mode === 'assessment') {
      setShowAssessment(true);
      return;
    }
    
    // For all other modes, immediately start the session
    setSelectedMode(mode);
    setIsSessionActive(true);
  };

  const handleStartSession = () => {
    if (selectedTrack && selectedMode) {
      setIsSessionActive(true);
    }
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setSelectedMode(null);
  };

  const handleAssessmentComplete = (result: PlacementResult) => {
    // Unlock recommended tracks
    const updatedTracks = tracks.map(track => {
      if (result.recommendedTracks.includes(track.id)) {
        return { ...track, locked: false };
      }
      return track;
    });
    setTracks(updatedTracks);
    setShowAssessment(false);
  };

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  // Generate questions for the selected track
  useEffect(() => {
    if (!selectedTrack) return;

    const questions: Question[] = [];
    const progress = new Map<string, ProgressEntry>();

    // Generate math questions based on track (for demo)
    if (selectedTrack.id === 'addition-basics') {
      for (let i = 0; i <= 9; i++) {
        for (let j = 0; j <= 9; j++) {
          const questionId = `add-${i}-${j}`;
          questions.push({
            id: questionId,
            type: 'arithmetic',
            content: {
              expression: `${i} + ${j}`,
              operands: [i, j],
              operator: '+',
              operand1: i,
              operand2: j
            },
            correctAnswer: i + j
          });

          // Mock progress data
          progress.set(questionId, {
            questionId,
            attempts: Math.floor(Math.random() * 5),
            correctCount: Math.floor(Math.random() * 3),
            incorrectCount: Math.floor(Math.random() * 2),
            averageTime: Math.random() * 5000,
            lastAttempt: new Date(),
            mastery: Math.random(),
            streak: Math.floor(Math.random() * 3)
          });
        }
      }
    } else if (selectedTrack.id === 'multiplication-intro') {
      for (let i = 1; i <= 10; i++) {
        for (let j = 1; j <= 10; j++) {
          const questionId = `mul-${i}-${j}`;
          questions.push({
            id: questionId,
            type: 'arithmetic',
            content: {
              expression: `${i} × ${j}`,
              operands: [i, j],
              operator: '×',
              operand1: i,
              operand2: j
            },
            correctAnswer: i * j
          });

          progress.set(questionId, {
            questionId,
            attempts: Math.floor(Math.random() * 5),
            correctCount: Math.floor(Math.random() * 3),
            incorrectCount: Math.floor(Math.random() * 2),
            averageTime: Math.random() * 5000,
            lastAttempt: new Date(),
            mastery: Math.random(),
            streak: Math.floor(Math.random() * 3)
          });
        }
      }
    }

    setTrackQuestions(questions);
    setTrackProgress(progress);
  }, [selectedTrack]);

  // Show assessment if requested
  if (showAssessment) {
    return (
      <Assessment
        onComplete={handleAssessmentComplete}
        onCancel={() => setShowAssessment(false)}
      />
    );
  }

  // If session is active, show the practice session
  if (isSessionActive && selectedTrack && selectedMode) {
    return (
      <PracticeSession
        track={selectedTrack}
        mode={selectedMode}
        onEnd={handleEndSession}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Learning Tracks */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <h2 className="text-2xl font-bold mb-2">Learning Tracks</h2>
          <p className="text-sm opacity-90">Choose your learning path</p>
        </div>
        
        <div className="p-4">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              disabled={track.locked}
              className={`w-full text-left p-4 mb-3 rounded-lg transition-all ${
                track.locked 
                  ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                  : selectedTrack?.id === track.id
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">{track.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{track.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{track.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{track.masteredQuestions}/{track.totalQuestions}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${(track.masteredQuestions / track.totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {track.locked && (
                    <div className="mt-2 text-xs text-orange-600">
                      🔒 Complete prerequisites first
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New User Assessment */}
        <div className="p-4 border-t">
          <button
            onClick={handleStartAssessment}
            className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            <div className="flex items-center justify-center">
              <span className="text-xl mr-2">🎓</span>
              <span className="font-semibold">Take Placement Test</span>
            </div>
            <p className="text-sm mt-1 opacity-90">Find your starting level</p>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedTrack ? selectedTrack.name : 'Select a Learning Track'}
            </h1>
            {selectedTrack && (
              <p className="text-gray-600 mt-2">{selectedTrack.description}</p>
            )}
          </div>
        </div>

        {/* Main Content with Grid and Practice Modes */}
        {selectedTrack && (
          <div className="flex-1 flex">
            {/* Left side: Grid and Practice Modes */}
            <div className="flex-1 p-8">
              {/* Learning Grid */}
              <div className="mb-8">
                <LearningGrid
                  questions={trackQuestions}
                  progress={trackProgress}
                  gridConfig={{
                    type: 'multiplication-table',
                    showEmptyCells: false
                  }}
                  targetMastery={0.8}
                />
              </div>

              {/* Practice Mode Selection */}
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-1">Choose Practice Mode</h2>
                <p className="text-sm text-gray-600">Click any mode to start practicing immediately</p>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Row 1: Assessment & Learn */}
                <div className="grid grid-cols-2 gap-4">
                  {practiceModes.filter(m => m.row === 1).map(({ mode, label, description, icon }) => (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`p-5 rounded-xl transition-all relative cursor-pointer ${
                        selectedMode === mode
                          ? 'bg-blue-500 text-white shadow-lg scale-105'
                          : 'bg-white hover:shadow-lg hover:scale-105 border-2 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">{icon}</div>
                        <div className="text-left">
                          <h3 className={`font-semibold text-lg ${
                            selectedMode === mode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {label}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            selectedMode === mode ? 'text-white opacity-90' : 'text-gray-600'
                          }`}>
                            {description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Row 2: Practice & Timed */}
                <div className="grid grid-cols-2 gap-4">
                  {practiceModes.filter(m => m.row === 2).map(({ mode, label, description, icon }) => (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`p-5 rounded-xl transition-all relative cursor-pointer ${
                        selectedMode === mode
                          ? 'bg-green-500 text-white shadow-lg scale-105'
                          : 'bg-white hover:shadow-lg hover:scale-105 border-2 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">{icon}</div>
                        <div className="text-left">
                          <h3 className={`font-semibold text-lg ${
                            selectedMode === mode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {label}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            selectedMode === mode ? 'text-white opacity-90' : 'text-gray-600'
                          }`}>
                            {description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Row 3: Fluency Test (Full Width) */}
                <div className="grid grid-cols-1">
                  {practiceModes.filter(m => m.row === 3).map(({ mode, label, description, icon, isMain }) => (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`p-6 rounded-xl transition-all relative cursor-pointer transform ${
                        selectedMode === mode
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl scale-105'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl hover:scale-105 border-2 border-purple-400 hover:from-purple-600 hover:to-pink-600'
                      }`}
                    >
                      {isMain && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                          🌟 RECOMMENDED FOR MASTERY
                        </div>
                      )}
                      <div className="flex items-center justify-center">
                        <div className="text-4xl mr-4">{icon}</div>
                        <div className="text-center">
                          <h3 className="font-bold text-2xl text-white mb-2">
                            {label}
                          </h3>
                          <p className="text-white opacity-90">
                            {description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
          </div>

          {/* Right side: Time Tracker */}
          <div className="w-80 p-8 border-l">
            <PracticeTimeTracker
              userId="user-123"
              config={{
                dailyGoalMinutes: 15,
                minGoalMinutes: 5,
                maxGoalMinutes: 60,
                showEstimatedCompletion: true
              }}
              totalDailyMinutes={dailyMinutes}
              estimatedCompletionDays={selectedTrack ? 
                Math.round((selectedTrack.totalQuestions - selectedTrack.masteredQuestions) / 5) : 0
              }
              onGoalReached={() => {
                console.log('Daily goal reached!');
              }}
              onGoalChanged={(newGoal) => {
                console.log(`Daily goal changed to ${newGoal} minutes`);
              }}
            />
          </div>
        </div>
        )}

        {/* Empty State */}
        {!selectedTrack && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">👈</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Select a Learning Track
              </h2>
              <p className="text-gray-500">
                Choose a track from the sidebar to begin practicing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
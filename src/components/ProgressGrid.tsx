import React from 'react';
import { ProgressEntry } from '../engine/types/core';

interface ProgressGridProps {
  entries: ProgressEntry[];
  showDetails?: boolean;
}

export const ProgressGrid: React.FC<ProgressGridProps> = ({ entries, showDetails = false }) => {
  // Calculate grid size
  const gridSize = Math.ceil(Math.sqrt(entries.length));
  
  // Color based on mastery level
  const getMasteryColor = (mastery: number): string => {
    if (mastery >= 1) return 'bg-green-500';
    if (mastery >= 0.8) return 'bg-green-400';
    if (mastery >= 0.6) return 'bg-yellow-400';
    if (mastery >= 0.4) return 'bg-orange-400';
    if (mastery >= 0.2) return 'bg-red-400';
    return 'bg-gray-300';
  };

  // Get tooltip text
  const getTooltipText = (entry: ProgressEntry): string => {
    const accuracy = entry.attempts > 0 
      ? ((entry.correctCount / entry.attempts) * 100).toFixed(0)
      : '0';
    
    return `Question ${entry.questionId}
Attempts: ${entry.attempts}
Correct: ${entry.correctCount}
Accuracy: ${accuracy}%
Mastery: ${(entry.mastery * 100).toFixed(0)}%
Avg Time: ${(entry.averageTime / 1000).toFixed(1)}s`;
  };

  return (
    <div className="bg-white rounded-lg p-4">
      {/* Grid visualization */}
      <div 
        className="grid gap-2 mb-4"
        style={{ 
          gridTemplateColumns: `repeat(${Math.min(gridSize, 10)}, minmax(0, 1fr))` 
        }}
      >
        {entries.map((entry, index) => (
          <div
            key={entry.questionId}
            className="relative group"
          >
            <div
              className={`aspect-square rounded-lg ${getMasteryColor(entry.mastery)} 
                transition-all hover:scale-110 cursor-pointer relative`}
              title={getTooltipText(entry)}
            >
              {/* Streak indicator */}
              {entry.streak >= 3 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-xs">🔥</span>
                </div>
              )}
              
              {/* Mastery star */}
              {entry.mastery >= 1 && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xl">
                  ⭐
                </div>
              )}
            </div>
            
            {/* Hover tooltip */}
            <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded-lg p-2 
              bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-pre-line min-w-max">
              {getTooltipText(entry)}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span>Learning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>Practicing</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Mastered</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span>🔥 Streak</span>
          <span>⭐ Mastered</span>
        </div>
      </div>

      {/* Detailed view */}
      {showDetails && entries.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold mb-3">Detailed Progress</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entries.map(entry => {
              const accuracy = entry.attempts > 0 
                ? ((entry.correctCount / entry.attempts) * 100).toFixed(0)
                : '0';
              
              return (
                <div key={entry.questionId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded ${getMasteryColor(entry.mastery)}`}></div>
                    <div>
                      <div className="text-sm font-medium">Question {entry.questionId}</div>
                      <div className="text-xs text-gray-500">
                        {entry.attempts} attempts • {accuracy}% accuracy
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {entry.streak >= 3 && <span>🔥{entry.streak}</span>}
                    {entry.mastery >= 1 && <span>⭐</span>}
                    <div className="text-sm font-medium">
                      {(entry.mastery * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
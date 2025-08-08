import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { useDesignTokens } from '../styles/design-tokens';

export interface TimeTrackerConfig {
  dailyGoalMinutes?: number;
  minGoalMinutes?: number;
  maxGoalMinutes?: number;
  showEstimatedCompletion?: boolean;
  customMetrics?: {
    label: string;
    value: number | string;
    icon?: React.ReactNode;
    color?: string;
  }[];
}

interface PracticeTimeTrackerProps {
  userId: string;
  config?: TimeTrackerConfig;
  currentSessionMinutes?: number;
  totalDailyMinutes?: number;
  estimatedCompletionDays?: number;
  onGoalReached?: () => void;
  onGoalChanged?: (newGoal: number) => void;
  className?: string;
}

export const PracticeTimeTracker: React.FC<PracticeTimeTrackerProps> = ({
  userId,
  config = {
    dailyGoalMinutes: 15,
    minGoalMinutes: 5,
    maxGoalMinutes: 60,
    showEstimatedCompletion: true
  },
  currentSessionMinutes = 0,
  totalDailyMinutes = 0,
  estimatedCompletionDays: initialEstimatedDays = 0,
  onGoalReached,
  onGoalChanged,
  className = ''
}) => {
  const tokens = useDesignTokens();
  const [sessionTime, setSessionTime] = useState(currentSessionMinutes);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(config.dailyGoalMinutes || 15);
  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasReachedDailyGoal, setHasReachedDailyGoal] = useState(false);
  
  // Calculate estimated completion days based on daily goal
  const calculatedEstimatedDays = React.useMemo(() => {
    // Assume 100 problems total for estimation (can be adjusted)
    const totalProblemsRemaining = 100;
    const averageProblemsPerMinute = 2; // Assume 2 problems per minute
    const problemsPerDay = dailyGoal * averageProblemsPerMinute;
    return Math.ceil(totalProblemsRemaining / problemsPerDay);
  }, [dailyGoal]);

  // Start/stop session timer
  useEffect(() => {
    if (isSessionActive && !timerRef.current) {
      sessionStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - sessionStartRef.current!) / 60000; // Convert to minutes
        setSessionTime(currentSessionMinutes + elapsed);
      }, 1000);
    } else if (!isSessionActive && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSessionActive, currentSessionMinutes]);

  // Check for goal achievements
  useEffect(() => {
    const dailyTotal = totalDailyMinutes + sessionTime;

    if (dailyTotal >= dailyGoal && !hasReachedDailyGoal) {
      setHasReachedDailyGoal(true);
      onGoalReached?.();
    }
  }, [sessionTime, totalDailyMinutes, dailyGoal, hasReachedDailyGoal, onGoalReached]);

  const dailyProgress = Math.min(100, ((totalDailyMinutes + sessionTime) / dailyGoal) * 100);

  const handleGoalChange = (newGoal: number) => {
    const clampedGoal = Math.max(
      config.minGoalMinutes || 5,
      Math.min(config.maxGoalMinutes || 60, newGoal)
    );
    setDailyGoal(clampedGoal);
    onGoalChanged?.(clampedGoal);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.floor(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDays = (days: number): string => {
    if (days === 0) return 'Complete!';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  };

  return (
    <div style={{
      backgroundColor: tokens.colors.background.paper,
      borderRadius: tokens.borderRadius.lg,
      boxShadow: tokens.shadows.md,
      padding: tokens.spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.md
    }} className={className}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{
          fontSize: tokens.typography.fontSize.lg,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm
        }}>
          <Clock style={{ color: tokens.colors.primary[500], width: '20px', height: '20px' }} />
          Practice Time
        </h3>
      </div>

      {/* Daily Goal with Adjustment - Always Visible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs
          }}>
            <Target style={{ color: tokens.colors.primary[400], width: '16px', height: '16px' }} />
            Daily Goal
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            <button
              onClick={() => handleGoalChange(dailyGoal - 5)}
              disabled={dailyGoal <= (config.minGoalMinutes || 5)}
              style={{
                padding: '4px 10px',
                backgroundColor: dailyGoal <= (config.minGoalMinutes || 5) 
                  ? tokens.colors.gray[100] 
                  : tokens.colors.gray[200],
                border: 'none',
                borderRadius: tokens.borderRadius.sm,
                cursor: dailyGoal <= (config.minGoalMinutes || 5) ? 'not-allowed' : 'pointer',
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: dailyGoal <= (config.minGoalMinutes || 5)
                  ? tokens.colors.gray[400]
                  : tokens.colors.text.primary,
                transition: 'all 0.2s ease'
              }}
            >
              −
            </button>
            <span style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              fontSize: tokens.typography.fontSize.base,
              minWidth: '60px',
              textAlign: 'center',
              color: tokens.colors.text.primary
            }}>
              {dailyGoal} min
            </span>
            <button
              onClick={() => handleGoalChange(dailyGoal + 5)}
              disabled={dailyGoal >= (config.maxGoalMinutes || 60)}
              style={{
                padding: '4px 10px',
                backgroundColor: dailyGoal >= (config.maxGoalMinutes || 60)
                  ? tokens.colors.gray[100]
                  : tokens.colors.gray[200],
                border: 'none',
                borderRadius: tokens.borderRadius.sm,
                cursor: dailyGoal >= (config.maxGoalMinutes || 60) ? 'not-allowed' : 'pointer',
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: dailyGoal >= (config.maxGoalMinutes || 60)
                  ? tokens.colors.gray[400]
                  : tokens.colors.text.primary,
                transition: 'all 0.2s ease'
              }}
            >
              +
            </button>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: tokens.typography.fontSize.xs,
          color: tokens.colors.text.secondary,
          marginTop: '-4px'
        }}>
          <span>Progress: {formatTime(totalDailyMinutes + sessionTime)}</span>
          <span>Goal: {formatTime(dailyGoal)}</span>
        </div>
        <div style={{
          position: 'relative',
          height: '8px',
          backgroundColor: tokens.colors.gray[200],
          borderRadius: tokens.borderRadius.full,
          overflow: 'hidden'
        }}>
          <div 
            style={{
              height: '100%',
              background: dailyProgress >= 100 
                ? `linear-gradient(to right, ${tokens.colors.success.light}, ${tokens.colors.success.main})`
                : `linear-gradient(to right, ${tokens.colors.primary[400]}, ${tokens.colors.primary[600]})`,
              width: `${dailyProgress}%`,
              transition: `width ${tokens.transitions.slow}`
            }}
          />
          {dailyProgress >= 100 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle style={{ color: 'white', width: '12px', height: '12px' }} />
            </div>
          )}
        </div>
      </div>

      {/* Estimated Completion */}
      {config.showEstimatedCompletion && (
        <div style={{
          paddingTop: tokens.spacing.md,
          borderTop: `1px solid ${tokens.colors.gray[200]}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs
            }}>
              <TrendingUp style={{ color: tokens.colors.primary[400], width: '16px', height: '16px' }} />
              Est. Completion
            </span>
            <span style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.fontSize.sm
            }}>
              {formatDays(calculatedEstimatedDays)}
            </span>
          </div>
          {calculatedEstimatedDays > 0 && calculatedEstimatedDays <= 7 && (
            <div style={{
              marginTop: tokens.spacing.xs,
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.success.main,
              textAlign: 'right'
            }}>
              Almost there! Keep going! 🎯
            </div>
          )}
          <div style={{
            marginTop: tokens.spacing.xs,
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.text.secondary,
            fontStyle: 'italic',
            opacity: 0.7
          }}>
            Based on {dailyGoal} min/day at ~{dailyGoal * 2} problems/day
          </div>
        </div>
      )}

      {/* Custom Metrics */}
      {config.customMetrics && config.customMetrics.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          {config.customMetrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                {metric.icon}
                {metric.label}
              </span>
              <span className={`font-medium ${metric.color || 'text-gray-700'}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Session Control (for demo purposes) */}
      <div className="pt-2 border-t">
        <button
          onClick={() => setIsSessionActive(!isSessionActive)}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isSessionActive
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isSessionActive ? 'End Session' : 'Start Session'}
        </button>
        {isSessionActive && (
          <div className="mt-2 text-center text-sm text-gray-600">
            Current session: {formatTime(sessionTime)}
          </div>
        )}
      </div>
    </div>
  );
};
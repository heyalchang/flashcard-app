import React, { useState, useEffect, useMemo } from 'react';
import { Question, ProgressEntry } from '../engine/types/core';
import { useDesignTokens } from '../styles/design-tokens';

// Domain-agnostic interface for grid data
export interface GridCell {
  id: string;
  row: number | string;
  col: number | string;
  value?: any;
  metadata?: Record<string, any>;
}

export interface GridConfig {
  type: 'multiplication-table' | 'custom' | 'matrix';
  showEmptyCells?: boolean;
  emptyPattern?: 'diagonal' | 'upper-triangle' | 'lower-triangle' | 'custom';
  customEmptyCheck?: (row: number, col: number) => boolean;
}

interface LearningGridProps {
  questions: Question[];
  progress: Map<string, ProgressEntry>;
  gridConfig: GridConfig;
  onCellClick?: (cell: GridCell) => void;
  getRowLabel?: (question: Question) => string | number;
  getColLabel?: (question: Question) => string | number;
  getCellValue?: (questions: Question[]) => any;
  targetMastery?: number;
  className?: string;
}

export const LearningGrid: React.FC<LearningGridProps> = ({
  questions,
  progress,
  gridConfig,
  onCellClick,
  getRowLabel,
  getColLabel,
  getCellValue,
  targetMastery = 0.8,
  className = ''
}) => {
  const tokens = useDesignTokens();
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [selectedCellProgress, setSelectedCellProgress] = useState<ProgressEntry | null>(null);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCells, setTotalCells] = useState(0);

  // Build grid data structure
  const gridData = useMemo(() => {
    const grid: Map<string, Map<string, Question[]>> = new Map();
    const rows = new Set<string | number>();
    const cols = new Set<string | number>();

    questions.forEach(question => {
      const rowKey = getRowLabel ? getRowLabel(question) : question.content.operand1;
      const colKey = getColLabel ? getColLabel(question) : question.content.operand2;
      
      rows.add(rowKey);
      cols.add(colKey);

      if (!grid.has(String(rowKey))) {
        grid.set(String(rowKey), new Map());
      }
      const rowMap = grid.get(String(rowKey))!;
      
      if (!rowMap.has(String(colKey))) {
        rowMap.set(String(colKey), []);
      }
      rowMap.get(String(colKey))!.push(question);
    });

    return {
      grid,
      rows: Array.from(rows).sort((a, b) => Number(a) - Number(b)),
      cols: Array.from(cols).sort((a, b) => Number(a) - Number(b))
    };
  }, [questions, getRowLabel, getColLabel]);

  // Calculate mastery progress
  useEffect(() => {
    let mastered = 0;
    let total = 0;

    gridData.rows.forEach(row => {
      gridData.cols.forEach(col => {
        const cellQuestions = gridData.grid.get(String(row))?.get(String(col));
        if (cellQuestions && cellQuestions.length > 0) {
          total++;
          
          // Check if all questions in cell are mastered
          const allMastered = cellQuestions.every(q => {
            const entry = progress.get(q.id);
            return entry && entry.mastery >= targetMastery;
          });
          
          if (allMastered) mastered++;
        }
      });
    });

    setMasteredCount(mastered);
    setTotalCells(total);
  }, [gridData, progress, targetMastery]);

  // Determine cell color based on progress using design tokens
  const getCellStyle = (cellQuestions: Question[] | undefined): React.CSSProperties => {
    let backgroundColor = tokens.colors.gray[50];
    let hoverColor = tokens.colors.gray[100];

    if (!cellQuestions || cellQuestions.length === 0) {
      return { backgroundColor };
    }

    // Calculate average mastery for the cell
    let totalMastery = 0;
    let count = 0;

    cellQuestions.forEach(q => {
      const entry = progress.get(q.id);
      if (entry) {
        totalMastery += entry.mastery;
        count++;
      }
    });

    if (count === 0) {
      backgroundColor = tokens.colors.progress.notStarted;
      return { backgroundColor };
    }

    const avgMastery = totalMastery / count;

    // Use design token colors based on mastery level
    if (avgMastery >= 1) {
      backgroundColor = tokens.colors.progress.mastered;
    } else if (avgMastery >= 0.8) {
      backgroundColor = tokens.colors.progress.nearMastery;
    } else if (avgMastery >= 0.6) {
      backgroundColor = tokens.colors.progress.improving;
    } else if (avgMastery >= 0.4) {
      backgroundColor = tokens.colors.progress.practicing;
    } else if (avgMastery >= 0.2) {
      backgroundColor = tokens.colors.progress.learning;
    } else {
      backgroundColor = tokens.colors.progress.notStarted;
    }

    return { 
      backgroundColor,
      transition: `all ${tokens.transitions.normal}`
    };
  };

  // Get fluency level label based on mastery
  const getFluencyLevel = (mastery: number): string => {
    if (mastery >= 1) return 'Mastered';
    if (mastery >= 0.8) return 'Fluency 3s-2s';
    if (mastery >= 0.6) return 'Fluency 6s';
    if (mastery >= 0.4) return 'Accuracy';
    if (mastery >= 0.2) return 'Learning';
    return 'Not Started';
  };

  // Check if cell should be empty based on configuration
  const isCellEmpty = (row: number | string, col: number | string): boolean => {
    if (!gridConfig.showEmptyCells) return false;
    
    const rowNum = Number(row);
    const colNum = Number(col);
    
    if (gridConfig.customEmptyCheck) {
      return gridConfig.customEmptyCheck(rowNum, colNum);
    }

    switch (gridConfig.emptyPattern) {
      case 'diagonal':
        return rowNum === colNum;
      case 'upper-triangle':
        return rowNum < colNum;
      case 'lower-triangle':
        return rowNum > colNum;
      default:
        return false;
    }
  };

  const progressPercentage = totalCells > 0 ? (masteredCount / totalCells) * 100 : 0;

  return (
    <div 
      className={className}
      style={{
        backgroundColor: tokens.colors.background.paper,
        borderRadius: tokens.borderRadius.lg,
        boxShadow: tokens.shadows.md,
        padding: tokens.spacing.md
      }}
    >
      {/* Progress Bar */}
      <div style={{ marginBottom: tokens.spacing.sm }}>
        <h2 style={{
          fontSize: tokens.typography.fontSize.lg,
          fontWeight: tokens.typography.fontWeight.bold,
          background: `linear-gradient(to right, ${tokens.colors.primary[600]}, ${tokens.colors.secondary[600]})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: tokens.spacing.xs
        }}>
          Track Progress
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          <div style={{
            flex: 1,
            height: '6px',
            backgroundColor: tokens.colors.gray[200],
            borderRadius: tokens.borderRadius.full,
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: tokens.colors.success.main,
                transition: `width ${tokens.transitions.slow}`
              }}
            />
          </div>
          <span style={{
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.text.secondary,
            minWidth: '4rem',
            textAlign: 'right'
          }}>
            {masteredCount}/{totalCells} facts
          </span>
        </div>
      </div>

      {/* Grid Display */}
      <div style={{ display: 'flex', gap: tokens.spacing.md }}>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
          <h3 style={{
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.bold,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs
          }}>Facts Grid</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            {[
              { color: tokens.colors.progress.notStarted, label: 'Not Started' },
              { color: tokens.colors.progress.learning, label: 'Learning' },
              { color: tokens.colors.progress.practicing, label: 'Accuracy' },
              { color: tokens.colors.progress.improving, label: 'Fluency 6s' },
              { color: tokens.colors.progress.nearMastery, label: 'Fluency 3s-2s' },
              { color: tokens.colors.progress.mastered, label: 'Mastered' }
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: tokens.borderRadius.full,
                  backgroundColor: color,
                  border: `1px solid ${tokens.colors.gray[300]}`
                }} />
                <span style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: tokens.colors.text.secondary
                }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1 }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: tokens.components.grid.maxSize,
            aspectRatio: '1',
            margin: '0 auto'
          }}>
            <div style={{ width: '100%', height: '100%' }}>
              <div 
                style={{
                  display: 'grid',
                  gap: tokens.components.grid.gap,
                  height: '100%',
                  gridTemplateColumns: `1.2rem repeat(${gridData.cols.length}, 1fr)`,
                  gridTemplateRows: `1.2rem repeat(${gridData.rows.length}, 1fr)`
                }}
              >
                {/* Header row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.typography.fontSize.xs,
                  fontWeight: tokens.typography.fontWeight.medium,
                  color: tokens.colors.text.secondary
                }}>
                  {/* Empty corner cell */}
                </div>
                {gridData.cols.map(col => (
                  <div key={col} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: tokens.typography.fontWeight.medium,
                    color: tokens.colors.text.secondary
                  }}>
                    {col}
                  </div>
                ))}

                {/* Data rows */}
                {gridData.rows.map(row => (
                  <React.Fragment key={row}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: tokens.typography.fontWeight.medium,
                      color: tokens.colors.text.secondary
                    }}>
                      {row}
                    </div>
                    {gridData.cols.map(col => {
                      const cellQuestions = gridData.grid.get(String(row))?.get(String(col));
                      const isEmpty = isCellEmpty(row, col);
                      
                      if (isEmpty) {
                        return <div key={col} style={{ backgroundColor: tokens.colors.gray[50] }} />;
                      }

                      return (
                        <button
                          key={col}
                          style={{
                            ...getCellStyle(cellQuestions),
                            width: '100%',
                            height: '100%',
                            borderRadius: tokens.borderRadius.sm,
                            border: 'none',
                            cursor: cellQuestions?.length ? 'pointer' : 'default',
                            transform: 'scale(1)',
                            outline: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (cellQuestions?.length) {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = tokens.shadows.sm;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => {
                            if (cellQuestions?.length) {
                              const cell: GridCell = {
                                id: `${row}-${col}`,
                                row,
                                col,
                                value: getCellValue ? getCellValue(cellQuestions) : cellQuestions[0].correctAnswer,
                                metadata: { questions: cellQuestions }
                              };
                              setSelectedCell(cell);
                              
                              // Get progress for the first question in the cell (they should all be similar)
                              const firstQuestion = cellQuestions[0];
                              const progressEntry = progress.get(firstQuestion.id);
                              setSelectedCellProgress(progressEntry || null);
                              
                              if (onCellClick) {
                                onCellClick(cell);
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Cell Modal with Details */}
      {selectedCell && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: tokens.colors.background.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => {
            setSelectedCell(null);
            setSelectedCellProgress(null);
          }}
        >
          <div 
            style={{
              backgroundColor: tokens.colors.background.paper,
              borderRadius: tokens.borderRadius.lg,
              boxShadow: tokens.shadows.xl,
              padding: tokens.spacing.xl,
              minWidth: '320px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Equation */}
            <div style={{
              fontSize: tokens.typography.fontSize['3xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              textAlign: 'center',
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.lg
            }}>
              {selectedCell.row} × {selectedCell.col} = {selectedCell.value}
            </div>

            {/* Details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.sm,
              marginBottom: tokens.spacing.lg,
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.gray[50],
              borderRadius: tokens.borderRadius.md
            }}>
              {/* Fluency Level */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.secondary
                }}>
                  Fluency Level:
                </span>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.text.primary,
                  padding: `2px 8px`,
                  backgroundColor: selectedCellProgress 
                    ? (() => {
                        const mastery = selectedCellProgress.mastery;
                        if (mastery >= 1) return tokens.colors.progress.mastered;
                        if (mastery >= 0.8) return tokens.colors.progress.nearMastery;
                        if (mastery >= 0.6) return tokens.colors.progress.improving;
                        if (mastery >= 0.4) return tokens.colors.progress.practicing;
                        if (mastery >= 0.2) return tokens.colors.progress.learning;
                        return tokens.colors.progress.notStarted;
                      })()
                    : tokens.colors.progress.notStarted,
                  borderRadius: tokens.borderRadius.sm
                }}>
                  {selectedCellProgress ? getFluencyLevel(selectedCellProgress.mastery) : 'Not Started'}
                </span>
              </div>

              {/* Last Answered */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.secondary
                }}>
                  Last Answered:
                </span>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.primary
                }}>
                  {selectedCellProgress?.lastAttempt 
                    ? new Date(selectedCellProgress.lastAttempt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Never'}
                </span>
              </div>

              {/* Response Time */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.secondary
                }}>
                  Response Time:
                </span>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.primary
                }}>
                  {selectedCellProgress?.averageTime 
                    ? `${(selectedCellProgress.averageTime / 1000).toFixed(1)}s`
                    : 'N/A'}
                </span>
              </div>

              {/* Attempts */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.secondary
                }}>
                  Total Attempts:
                </span>
                <span style={{
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text.primary
                }}>
                  {selectedCellProgress?.attempts || 0}
                </span>
              </div>

              {/* Accuracy */}
              {selectedCellProgress && selectedCellProgress.attempts > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: tokens.typography.fontSize.sm,
                    color: tokens.colors.text.secondary
                  }}>
                    Accuracy:
                  </span>
                  <span style={{
                    fontSize: tokens.typography.fontSize.sm,
                    color: tokens.colors.text.primary
                  }}>
                    {((selectedCellProgress.correctCount / selectedCellProgress.attempts) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedCell(null);
                setSelectedCellProgress(null);
              }}
              style={{
                marginTop: tokens.spacing.sm,
                padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                backgroundColor: tokens.colors.primary[500],
                color: tokens.colors.text.inverse,
                borderRadius: tokens.borderRadius.md,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                fontSize: tokens.typography.fontSize.base,
                fontWeight: tokens.typography.fontWeight.medium,
                transition: `background-color ${tokens.transitions.fast}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[600];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[500];
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
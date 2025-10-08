"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme-type') === 'dark';
};

interface VoteData {
  academicYear: number;
  rotationNumber: string;
  rotationName: string;
  counts: Record<string, number>;
  total: number;
  percentages: Record<string, number>;
}

interface AnswerVotingProps {
  questionId: string;
  isAnswerConfirmed: boolean;
}

export function AnswerVoting({ questionId, isAnswerConfirmed }: AnswerVotingProps) {
  const [canVote, setCanVote] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [currentVotes, setCurrentVotes] = useState<VoteData | null>(null);
  const [historicalVotes, setHistoricalVotes] = useState<VoteData[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = isDarkMode();

  const fetchVotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.warn('🗳️ [VOTING] Fetching votes for question:', questionId);
      const res = await fetch(`/api/questions/${questionId}/votes`);
      console.warn('🗳️ [VOTING] Response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.warn('🗳️ [VOTING] Error response:', errorText);
        throw new Error("Failed to fetch votes");
      }
      const data = await res.json();
      console.warn('🗳️ [VOTING] Vote data received:', {
        canVote: data.canVote,
        userVote: data.userVote,
        hasCurrentVotes: !!data.currentVotes,
        currentVotesTotal: data.currentVotes?.total,
        historicalCount: data.historicalVotes?.length || 0
      });
      setCanVote(data.canVote);
      setUserVote(data.userVote);
      setCurrentVotes(data.currentVotes);
      setHistoricalVotes(data.historicalVotes || []);
    } catch (err) {
      console.error("Error fetching votes:", err);
      setError("Unable to load voting data");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  // Fetch votes on mount
  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  async function handleVote(answer: string) {
    if (!canVote || voting) return;
    
    try {
      setVoting(true);
      setError(null);
      const res = await fetch(`/api/questions/${questionId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAnswer: answer }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit vote");
      }

      // Refresh votes
      await fetchVotes();
    } catch (err) {
      console.error("Error voting:", err);
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setVoting(false);
    }
  }

  async function handleCancelVote() {
    if (!canVote || voting || !userVote) return;
    
    const confirmCancel = window.confirm("Are you sure you want to cancel your vote? You can vote again later.");
    if (!confirmCancel) return;
    
    try {
      setVoting(true);
      setError(null);
      const res = await fetch(`/api/questions/${questionId}/votes`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to cancel vote");
      }

      // Refresh votes
      await fetchVotes();
    } catch (err) {
      console.error("Error cancelling vote:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel vote");
    } finally {
      setVoting(false);
    }
  }

  function toggleHistory(periodKey: string) {
    setExpandedHistory(prev => ({ ...prev, [periodKey]: !prev[periodKey] }));
  }

  if (loading) {
    return (
      <div 
        className="mt-6 rounded-2xl border p-4"
        style={{ 
          borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
          backgroundColor: isDark ? '#000000' : '#ffffff'
        }}
      >
        <div className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
          Loading voting data...
        </div>
      </div>
    );
  }

  // Don't show voting section if answer is confirmed
  if (isAnswerConfirmed) {
    return null;
  }

  return (
    <div 
      className="mt-6 rounded-2xl border p-6"
      style={{ 
        borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
        backgroundColor: isDark ? '#000000 !important' : '#ffffff',
        color: isDark ? '#ffffff' : 'inherit',
        isolation: 'isolate'
      }}
    >
      <div className="text-lg font-bold mb-4 flex items-center gap-2">
        <span style={{ 
          filter: 'none',
          WebkitTextFillColor: 'initial',
          backgroundClip: 'border-box'
        }}>📊</span>
        <span
          style={{
            ...(isDark ? {
              color: '#ffffff'
            } : {
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            })
          }}
        >
          Student Answer Voting
        </span>
      </div>
      
      {error && (
        <div 
          className="mb-4 p-3 rounded-xl text-sm"
          style={{ 
            backgroundColor: isDark ? '#991b1b' : '#fee2e2',
            color: '#ffffff',
            border: isDark ? '1px solid #dc2626' : 'none'
          }}
        >
          {error}
        </div>
      )}

      {/* No voting data message */}
      {!canVote && !currentVotes && historicalVotes.length === 0 && (
        <div 
          className="p-4 rounded-xl text-center"
          style={{ 
            backgroundColor: isDark ? '#374151' : '#f9fafb',
            color: isDark ? '#d1d5db' : '#6b7280',
            border: isDark ? '1px solid #4b5563' : 'none'
          }}
        >
          <p className="text-sm">
            No voting data available. Make sure:
          </p>
          <ul className="text-xs mt-2 space-y-1">
            <li>• You have set your rotation number in your profile</li>
            <li>• An admin has created an active rotation period</li>
            <li>• The rotation period matches your current rotation</li>
          </ul>
        </div>
      )}

      {/* Current Rotation Voting */}
      {canVote && (
        <div 
          className="mb-6 p-4 rounded-xl border"
          style={{ 
            borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
            backgroundColor: isDark ? '#000000' : '#ffffff'
          }}
        >
          <div 
            className="text-sm font-semibold mb-3"
            style={{
              ...(isDark ? {
                color: '#ffffff'
              } : {
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              })
            }}
          >
            {currentVotes?.rotationName || 'Current Rotation'} {currentVotes?.rotationNumber || ''} {currentVotes?.academicYear ? `(${currentVotes.academicYear})` : ''} - {currentVotes ? 'Current Voting' : 'Be the First to Vote!'}
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {['A', 'B', 'C', 'D', 'E'].map((choice) => (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={voting}
                className="py-3 px-2 rounded-lg font-bold transition-all"
                style={{
                  backgroundColor: userVote === choice 
                    ? 'var(--color-primary)'
                    : (isDark ? '#1f2937' : '#f3f4f6'),
                  color: userVote === choice 
                    ? '#ffffff'
                    : (isDark ? '#ffffff' : '#111827'),
                  opacity: voting ? 0.6 : 1,
                  cursor: voting ? 'wait' : 'pointer',
                  border: userVote === choice 
                    ? `2px solid var(--color-primary-hover)`
                    : (isDark ? '1px solid #4b5563' : '1px solid #d1d5db')
                }}
              >
                {choice}
              </button>
            ))}
          </div>
          
          {/* Live vote counts and percentages */}
          <div className="space-y-2">
            {['A', 'B', 'C', 'D', 'E'].map((choice) => {
              const count = currentVotes?.counts[choice] || 0;
              const percentage = currentVotes?.percentages[choice] || 0;
              return (
                <div key={choice} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    {choice}:
                  </span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ 
                    backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
                    border: isDark ? '1px solid #374151' : 'none'
                  }}>
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: 'var(--color-primary)'
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    {percentage}% ({count})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cancel Vote Button */}
          {userVote && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
              <button
                onClick={handleCancelVote}
                disabled={voting}
                className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-80"
                style={{
                  backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
                  color: isDark ? '#fecaca' : '#991b1b',
                  border: isDark ? '1px solid #991b1b' : '1px solid #fca5a5',
                  opacity: voting ? 0.6 : 1,
                  cursor: voting ? 'wait' : 'pointer'
                }}
              >
                {voting ? 'Processing...' : '🗑️ Cancel My Vote'}
              </button>
              <p className="text-xs mt-2 text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                You can change your vote anytime before the rotation period ends
              </p>
            </div>
          )}
        </div>
      )}

      {/* View-only for non-eligible users */}
      {!canVote && currentVotes && (
        <div 
          className="mb-6 p-4 rounded-xl border"
          style={{ 
            borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
            backgroundColor: isDark ? '#000000' : '#ffffff'
          }}
        >
          <div className="text-sm font-semibold mb-3" style={{ color: isDark ? '#ffffff' : '#374151' }}>
            {currentVotes.rotationName} {currentVotes.rotationNumber} ({currentVotes.academicYear}) - View Only
          </div>
          <div className="space-y-2">
            {['A', 'B', 'C', 'D', 'E'].map((choice) => {
              const count = currentVotes.counts[choice] || 0;
              const percentage = currentVotes.percentages[choice] || 0;
              return (
                <div key={choice} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    {choice}:
                  </span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ 
                    backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
                    border: isDark ? '1px solid #374151' : 'none'
                  }}>
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isDark ? '#6b7280' : '#9ca3af'
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    {percentage}% ({count})
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            You can only vote on questions matching your current rotation
          </div>
        </div>
      )}

      {/* Historical Votes (Expandable) */}
      {historicalVotes.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-3" style={{ color: isDark ? '#ffffff' : '#374151' }}>
            Previous Rotation Votes
          </div>
          <div className="space-y-2">
            {historicalVotes.map((vote) => {
              const periodKey = `${vote.academicYear}-${vote.rotationNumber}-${vote.rotationName}`;
              const isExpanded = expandedHistory[periodKey];
              const topChoice = Object.entries(vote.percentages).reduce((a, b) => 
                b[1] > a[1] ? b : a
              );
              
              return (
                <div 
                  key={periodKey}
                  className="rounded-xl border overflow-hidden"
                  style={{ 
                    borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
                    backgroundColor: isDark ? '#000000' : '#ffffff'
                  }}
                >
                  <button
                    onClick={() => toggleHistory(periodKey)}
                    className="w-full p-3 flex items-center justify-between transition-colors hover:opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                        {vote.rotationName} {vote.rotationNumber} ({vote.academicYear})
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ 
                        backgroundColor: isDark ? '#065f46' : '#d1fae5',
                        color: isDark ? '#a7f3d0' : '#065f46',
                        border: isDark ? '1px solid #059669' : 'none'
                      }}>
                        {topChoice[1]}% chose {topChoice[0]}
                      </span>
                    </div>
                    {isExpanded ? 
                      <ChevronUp size={20} style={{ color: isDark ? '#ffffff' : '#111827' }} /> : 
                      <ChevronDown size={20} style={{ color: isDark ? '#ffffff' : '#111827' }} />
                    }
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {['A', 'B', 'C', 'D', 'E'].map((choice) => {
                        const percentage = vote.percentages[choice] || 0;
                        return (
                          <div key={choice} className="flex items-center gap-3">
                            <span className="text-xs font-bold w-6" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                              {choice}:
                            </span>
                            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ 
                              backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
                              border: isDark ? '1px solid #374151' : 'none'
                            }}>
                              <div 
                                className="h-full transition-all duration-300"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: isDark ? '#10b981' : '#059669'
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold w-12 text-right" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                              {percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!canVote && !currentVotes && historicalVotes.length === 0 && (
        <div className="text-center py-4 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          No voting data available for this question yet
        </div>
      )}
    </div>
  );
}

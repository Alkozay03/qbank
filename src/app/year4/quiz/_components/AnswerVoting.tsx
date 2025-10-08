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

  function toggleHistory(periodKey: string) {
    setExpandedHistory(prev => ({ ...prev, [periodKey]: !prev[periodKey] }));
  }

  if (loading) {
    return (
      <div 
        className="mt-6 rounded-2xl border p-4"
        style={{ 
          borderColor: isDark ? '#333333' : 'var(--color-primary)',
          backgroundColor: isDark ? '#000000' : '#ffffff'
        }}
      >
        <div className="text-center py-4" style={{ color: isDark ? '#ffffff' : '#64748b' }}>
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
        borderColor: isDark ? '#333333' : 'var(--color-primary)',
        backgroundColor: isDark ? '#000000' : '#ffffff'
      }}
    >
      <div className="text-lg font-bold mb-4" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>
        📊 Student Answer Voting
      </div>
      
      {error && (
        <div 
          className="mb-4 p-3 rounded-xl text-sm"
          style={{ 
            backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
            color: isDark ? '#ffffff' : '#991b1b'
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
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
            color: isDark ? '#9ca3af' : '#6b7280'
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
      {canVote && currentVotes && (
        <div 
          className="mb-6 p-4 rounded-xl border"
          style={{ 
            borderColor: isDark ? '#1e3a8a' : '#dbeafe',
            backgroundColor: isDark ? '#1e3a8a' : '#eff6ff'
          }}
        >
          <div className="text-sm font-semibold mb-3" style={{ color: isDark ? '#ffffff' : '#1e40af' }}>
            {currentVotes.rotationName} {currentVotes.rotationNumber} ({currentVotes.academicYear}) - Current Voting
          </div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {['A', 'B', 'C', 'D', 'E'].map((choice) => (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={voting}
                className={`py-3 px-2 rounded-lg font-bold transition-all ${
                  userVote === choice 
                    ? (isDark ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-600') 
                    : ''
                }`}
                style={{
                  backgroundColor: userVote === choice 
                    ? (isDark ? '#3b82f6' : '#2563eb')
                    : (isDark ? '#1f2937' : '#f3f4f6'),
                  color: userVote === choice 
                    ? '#ffffff'
                    : (isDark ? '#ffffff' : '#111827'),
                  opacity: voting ? 0.6 : 1,
                  cursor: voting ? 'wait' : 'pointer'
                }}
              >
                {choice}
              </button>
            ))}
          </div>
          
          {/* Live vote counts and percentages */}
          <div className="space-y-2">
            {['A', 'B', 'C', 'D', 'E'].map((choice) => {
              const count = currentVotes.counts[choice] || 0;
              const percentage = currentVotes.percentages[choice] || 0;
              return (
                <div key={choice} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    {choice}:
                  </span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isDark ? '#3b82f6' : '#2563eb'
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
        </div>
      )}

      {/* View-only for non-eligible users */}
      {!canVote && currentVotes && (
        <div 
          className="mb-6 p-4 rounded-xl border"
          style={{ 
            borderColor: isDark ? '#374151' : '#e5e7eb',
            backgroundColor: isDark ? '#1f2937' : '#f9fafb'
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
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
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
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    backgroundColor: isDark ? '#111827' : '#ffffff'
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
                        color: isDark ? '#ffffff' : '#065f46'
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
                            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
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

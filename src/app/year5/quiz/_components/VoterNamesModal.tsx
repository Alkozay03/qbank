"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme-type') === 'dark';
};

interface VoterInfo {
  firstName: string | null;
  lastName: string | null;
}

interface VoterNamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  answer: string;
  voters: VoterInfo[];
  rotationInfo: string;
}

export function VoterNamesModal({ 
  isOpen, 
  onClose, 
  answer, 
  voters, 
  rotationInfo 
}: VoterNamesModalProps) {
  const isDark = isDarkMode();

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format voter name
  const formatVoterName = (voter: VoterInfo) => {
    const firstName = voter.firstName || 'Unknown';
    const lastName = voter.lastName || 'User';
    return `${firstName} ${lastName}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {/* Modal */}
        <div 
          className="rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col"
          style={{ 
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: isDark ? '2px solid #4b5563' : '2px solid var(--color-primary)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: isDark ? '#4b5563' : '#e5e7eb' }}
          >
            <div>
              <h2 
                className="text-2xl font-bold"
                style={{ color: isDark ? '#ffffff' : '#111827' }}
              >
                Answer {answer} Voters
              </h2>
              <p 
                className="text-sm mt-1"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {rotationInfo}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-10 transition-all"
              style={{ 
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#ffffff' : '#111827'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Voter List */}
          <div className="flex-1 overflow-y-auto p-6">
            {voters.length === 0 ? (
              <div 
                className="text-center py-8"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                <p className="text-lg font-semibold">No voters yet</p>
                <p className="text-sm mt-2">Be the first to vote for answer {answer}!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {voters.map((voter, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-xl flex items-center gap-3"
                    style={{ 
                      backgroundColor: isDark ? '#374151' : '#f9fafb',
                      border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb'
                    }}
                  >
                    {/* Avatar Circle */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {(voter.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    {/* Name */}
                    <div className="flex-1">
                      <p 
                        className="font-semibold"
                        style={{ color: isDark ? '#ffffff' : '#111827' }}
                      >
                        {formatVoterName(voter)}
                      </p>
                    </div>
                    {/* Number badge */}
                    <div 
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
                        color: isDark ? '#9ca3af' : '#6b7280'
                      }}
                    >
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="p-4 border-t text-center"
            style={{ borderColor: isDark ? '#4b5563' : '#e5e7eb' }}
          >
            <p 
              className="text-sm font-semibold"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              Total: {voters.length} {voters.length === 1 ? 'voter' : 'voters'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

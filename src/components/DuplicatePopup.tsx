import React from 'react';

// Component for duplicate question popup with animation
export default function DuplicatePopup({ 
  isOpen, 
  onClose, 
  questionId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  questionId: string | number | null;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-fadeIn">
      <div 
        className="rounded-2xl bg-white p-6 shadow-lg max-w-md w-full border-2 border-red-500 animate-scaleIn"
        style={{ maxWidth: '400px' }}
      >
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-2">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Question Already Exists!</h2>
          
          {questionId && (
            <p className="text-lg font-medium text-slate-700 mb-6">
              Question #{questionId}
            </p>
          )}
          
          <p className="text-sm text-slate-600 mb-6">
            This question has already been added to the database.
            Please check the existing question or make changes to create a unique question.
          </p>
          
          <button
            onClick={onClose}
            className="rounded-xl bg-[#2F6F8F] px-6 py-2 font-semibold text-white hover:opacity-90 btn-hover color-smooth"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

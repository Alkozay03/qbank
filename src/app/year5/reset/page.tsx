// src/app/year5/reset/page.tsx
"use client";

import { useState } from "react";
import Shell from "@/components/Shell";

export default function Reset() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleResetData = async () => {
    setShowConfirmDialog(false);

    setIsResetting(true);
    setResetStatus(null);

    try {
      const response = await fetch('/api/reset-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResetStatus({
          type: 'success',
          message: 'Your data has been successfully reset! All question progress has been cleared.'
        });
      } else {
        setResetStatus({
          type: 'error',
          message: data.error || 'Failed to reset data'
        });
      }
    } catch {
      setResetStatus({
        type: 'error',
        message: 'Network error occurred while resetting data'
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Shell title="Reset Your Data" pageName="Reset">
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            ⚠️ Important Information
          </h2>
          <div className="text-yellow-700 space-y-2">
            <p>
              By clicking the &ldquo;Reset My Data!&rdquo; button below, the following will happen:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All questions you have solved will become tagged as &ldquo;unanswered&rdquo;</li>
              <li>Any progress you have in previous tests will be reset and deleted</li>
              <li>All marked/flagged questions will be unmarked</li>
              <li>Your quiz history and performance data will be cleared</li>
            </ul>
            <p className="mt-3 font-medium">
              Your profile information (name, email, etc.) will remain unchanged, but it will be as if you are logging in for the first time.
            </p>
          </div>
        </div>

        {resetStatus && (
          <div className={`rounded-lg p-4 ${
            resetStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {resetStatus.message}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            {isResetting ? 'Resetting Data...' : 'Reset My Data!'}
          </button>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          This action cannot be undone. Please make sure you really want to reset all your progress.
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Confirm Reset
            </h3>
            <p className="text-secondary mb-6">
              Are you sure you want to reset our data? You will not be able to retrieve it.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-secondary hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

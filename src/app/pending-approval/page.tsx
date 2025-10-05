"use client";

import ForceBlueTheme from "@/components/ForceBlueTheme";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { getGradientTextClasses } from "@/utils/gradients";

export default function PendingApproval() {
  return (
    <ForceBlueTheme>
      <BackgroundWrapper />
      <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
        {/* Top left brand - same as login page */}
        <div className="fixed top-4 left-4 bg-white rounded-xl px-5 py-2.5 shadow-lg">
          <div className={`brand-title text-3xl font-extrabold tracking-tight ${getGradientTextClasses()}`}>
            Clerkship
          </div>
        </div>

        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-7 text-center">
          <div className="mb-5">
            <div className="w-18 h-18 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-9 h-9 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className={`text-2xl font-extrabold mb-4 ${getGradientTextClasses()}`}>
            Account Awaiting Approval
          </h1>

          {/* Light sky blue text */}
          <p className="text-sky-400 mb-5 text-base leading-snug">
            Your account has been created successfully, but it needs to be approved by an administrator before you can access the system.
          </p>

          {/* White text with gradient background */}
          <div className="bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg p-4 mb-5">
            <p className="text-sm text-white leading-relaxed">
              <strong className="text-base">What happens next?</strong>
              <br />
              <br />
              Once an admin approves your account, you&apos;ll receive an email with a login link. After that, you&apos;ll be able to log in and out freely.
            </p>
          </div>

          {/* Light sky blue text */}
          <p className="text-sm text-sky-400">
            If you have any questions, please contact the system administrator.
          </p>

          <div className="mt-6">
            <a
              href="/login"
              className="inline-block text-sky-500 hover:text-sky-600 font-semibold transition-colors text-base"
            >
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </ForceBlueTheme>
  );
}

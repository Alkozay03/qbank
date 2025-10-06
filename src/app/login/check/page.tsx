// src/app/login/check/page.tsx
"use client";

import BackgroundWrapper from "@/components/BackgroundWrapper";
import ForceBlueTheme from "@/components/ForceBlueTheme";
import { getGradientTextClasses } from "@/utils/gradients";

export default function CheckEmail() {
  return (
    <ForceBlueTheme>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        {/* Top left brand - same as login page */}
        <div className="fixed top-4 left-4 bg-white rounded-xl px-5 py-2.5 shadow-lg">
          <div className={`brand-title text-3xl font-extrabold tracking-tight ${getGradientTextClasses()}`}>
            Clerkship
          </div>
        </div>

        {/* Main content with white background */}
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-10 sm:p-12 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-sky-500 mb-4">
            Check your university email inbox for the access link.
          </p>
          <p className="text-sky-400 text-lg">
            (Once received close this page)
          </p>
        </div>
      </main>
    </ForceBlueTheme>
  );
}

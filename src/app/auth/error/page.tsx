// src/app/auth/error/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ForceBlueTheme from "@/components/ForceBlueTheme";

export default function AuthError() {
  return (
    <ForceBlueTheme>
      <Suspense fallback={null}>
        <AuthErrorInner />
      </Suspense>
    </ForceBlueTheme>
  );
}

function AuthErrorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; message: string }> = {
    Verification: {
      title: "Login Link Invalid",
      message: "This login link has already been used or has expired. Each magic link can only be used once for security.",
    },
    Configuration: {
      title: "Configuration Error",
      message: "There's a problem with the authentication setup. Please contact support.",
    },
    AccessDenied: {
      title: "Access Denied",
      message: "You don't have permission to access this resource.",
    },
    Default: {
      title: "Authentication Error",
      message: "Something went wrong during authentication. Please try again.",
    },
  };

  const errorInfo = errorMessages[error || ""] || errorMessages.Default;

  return (
    <main className="min-h-screen pt-14 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-red-200 bg-white shadow-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-slate-800 text-center mb-2">
            {errorInfo.title}
          </h1>
          
          <p className="text-center text-sm text-slate-600 mb-6">
            {errorInfo.message}
          </p>

          {error === "Verification" && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> Make sure to click the magic link only once. 
                If you see a security warning, click through it but don&apos;t refresh or go back.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Request New Login Link
            </button>
            
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>

          {error && (
            <p className="mt-6 text-center text-xs text-slate-400">
              Error code: {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

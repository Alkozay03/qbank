"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { getGradientTextClasses } from "@/utils/gradients";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect logged-in users to /years
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push("/years");
    }
  }, [status, session, router]);

  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="text-center bg-white rounded-3xl shadow-2xl p-16 max-w-2xl mx-auto">
          {/* Brand - Large with gradient text */}
          <h1 className={`brand-title text-7xl font-extrabold tracking-tight mb-4 ${getGradientTextClasses()}`}>
            Clerkship
          </h1>

          {/* Tagline */}
          <p className="text-2xl text-gray-600 mb-12 font-medium">
            Your guide to success!
          </p>

          {/* Sign-in button */}
          <button
            onClick={() => router.push("/login")}
            className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-xl px-12 py-5 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out"
            style={{ transform: 'scale(1)', transition: 'all 0.3s ease-in-out' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            aria-label="Sign in"
          >
            Sign in
          </button>
        </div>
      </main>
    </>
  );
}

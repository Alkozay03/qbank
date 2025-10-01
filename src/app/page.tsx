"use client";

import { useRouter } from "next/navigation";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function Home() {
  const router = useRouter();

  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex items-center justify-center px-4 relative z-20">
        <div className="text-center gradient-card p-12 max-w-md mx-auto backdrop-blur-sm">
        {/* Brand */}
        <h1 className="brand-title-main mb-6">
          Clerkship
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl text-readable-light mb-10 font-medium">
          Your guide to success!
        </p>

        {/* Sign-in button */}
        <button
          onClick={() => router.push("/login")}
          className="gradient-btn-primary text-lg px-8 py-4"
          aria-label="Sign in"
        >
          Sign-in
        </button>
      </div>
    </main>
    </>
  );
}

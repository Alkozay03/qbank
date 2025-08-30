"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main
      className="
        min-h-screen
        flex items-center justify-center
        px-4
        bg-gradient-to-b from-[#F3F9FC] via-[#CCE3F0] to-[#FFFFFF]
      "
    >
      <div className="text-center">
        {/* Brand */}
        <h1
          className="
            text-7xl sm:text-6x1 font-extrabold
            tracking-tight
            text-[#56A2CD]
            drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]
          "
        >
          Clerkship
        </h1>

        {/* Tagline */}
        <p className="mt-3 text-base sm:text-2xl text-[#7DB8D9]/80">
          Your guide to success
        </p>

        {/* Sign-in button */}
        <button
          onClick={() => router.push("/login")}
          className="
            mt-8 inline-flex items-center justify-center
            rounded-2xl
            px-8 py-3
            font-semibold
            text-white
            bg-[#7DB8D9]
            shadow
            transition
            duration-200
            ease-out
            hover:scale-[1.04] hover:bg-[#56A2CD]
            active:scale-[0.99]
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A5CDE4]
          "
          aria-label="Sign in"
        >
          Sign-in
        </button>
      </div>
    </main>
  );
}

// src/app/years/page.tsx
"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function Years() {
  const router = useRouter();

  async function handleLogout() {
    try {
      try { localStorage.removeItem("clerkshipRemember"); } catch {}
      await signOut({ redirect: true, callbackUrl: "/login" });
    } catch {
      window.location.href = "/login";
    }
  }

  function goProfile() {
    try {
      // make sure Save on /profile returns here
      sessionStorage.setItem("profileBackTo", "/years");
    } catch {}
    router.push("/profile");
  }

  return (
    <>
      <BackgroundWrapper />
      <main className="min-h-screen flex flex-col items-center justify-center relative z-20">
      {/* Top-right icons (match portal style + tooltip) */}
      <div className="absolute right-8 top-6 flex items-center gap-6">
        {/* Profile */}
        <button
          onClick={goProfile}
          aria-label="Profile"
          className="gradient-btn-icon group relative btn-hover color-smooth"
        >
          <User size={28} />
          <Tooltip>Profile Settings</Tooltip>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="gradient-btn-icon group relative btn-hover color-smooth"
        >
          <LogOut size={28} />
          <Tooltip>Log Out</Tooltip>
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-md mb-12">
        <h1 className="brand-title-main mb-0">
          Clerkship
        </h1>
      </div>

      <div className="mt-4 flex items-center gap-8">
        <Link
          href="/year4"
          className="year-btn text-xl px-10 py-5 w-48 text-center transition-all duration-300"
          title="Enter Year 4 content"
        >
          Year 4
        </Link>

        <div
          className="year-btn text-xl px-10 py-5 w-48 text-center cursor-not-allowed relative opacity-60"
          onMouseMove={(e) => {
            const tip = document.getElementById("coming-soon-tip");
            if (!tip) return;
            tip.style.left = `${e.clientX + 12}px`;
            tip.style.top = `${e.clientY + 12}px`;
            tip.style.opacity = "1";
          }}
          onMouseLeave={() => {
            const tip = document.getElementById("coming-soon-tip");
            if (!tip) return;
            tip.style.opacity = "0";
          }}
        >
          Year 5
        </div>

        {/* Floating tooltip for "Coming Soon" (unchanged) */}
        <div
          id="coming-soon-tip"
          className="pointer-events-none fixed z-50 rounded-md bg-[#21526E] px-2 py-1 text-sm text-white font-medium opacity-0 transition-opacity shadow-md"
        >
          Coming Soon!
        </div>
      </div>
    </main>
    </>
  );
}

/** Match portal tooltip style */
function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="
        pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
        whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium
        bg-white text-[#21526E] shadow-md
        opacity-0 translate-y-1 transition-all duration-200
        group-hover:opacity-100 group-hover:translate-y-0
        border border-[#A5CDE4]/30
      "
    >
      {children}
    </span>
  );
}

// src/app/years/page.tsx
"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#F3F9FC] via-[#CCE3F0] to-[#FFFFFF]">
      {/* Top-right icons (match portal style + tooltip) */}
      <div className="absolute right-8 top-6 flex items-center gap-6">
        {/* Profile */}
        <button
          onClick={goProfile}
          aria-label="Profile"
          className="group relative p-2 rounded-full transition active:scale-95 hover:bg-[#EAF4FA] text-[#3B82A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5CDE4]"
          title="Profile settings"
        >
          <User size={28} />
          <Tooltip>Profile</Tooltip>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="group relative p-2 rounded-full transition active:scale-95 hover:bg-[#EAF4FA] text-[#3B82A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5CDE4]"
          title="Log out"
        >
          <LogOut size={28} />
          <Tooltip>Log out</Tooltip>
        </button>
      </div>

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

      <div className="mt-8 flex items-center gap-8">
        <Link
          href="/year4"
          className="rounded-3xl px-10 py-5 text-white font-bold text-lg"
          style={{ backgroundColor: "#7DB8D9", boxShadow: "0 6px 22px rgba(0,0,0,.12)" }}
        >
          Year 4
        </Link>

        <div
          className="rounded-3xl px-10 py-5 text-lg font-semibold select-none cursor-not-allowed relative"
          style={{ color: "#7DB8D9", backgroundColor: "#E6F0F7" }}
          title="Coming Soon"
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
          className="pointer-events-none fixed z-50 rounded-md bg-[#22323A] px-2 py-1 text-sm text-white opacity-0 transition-opacity"
        >
          Coming Soon!
        </div>
      </div>
    </main>
  );
}

/** Match portal tooltip style */
function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="
        pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
        whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-medium
        bg-[#F3F9FC] text-[#2F6F8F] shadow
        opacity-0 translate-y-1 transition
        group-hover:opacity-100 group-hover:translate-y-0
      "
    >
      {children}
    </span>
  );
}

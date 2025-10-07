// src/app/years/page.tsx
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import ForceBlueTheme from "@/components/ForceBlueTheme";
import { getGradientTextClasses } from "@/utils/gradients";
import { Icon } from "@/components/Icons";

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
    <ForceBlueTheme>
      <BackgroundWrapper />
      <main className="min-h-screen flex flex-col items-center justify-center relative z-20">
        {/* Top-right icons - custom styling for years page */}
        <div className="absolute top-0 right-6 z-[400] h-14 flex items-center gap-2">
          {/* Profile */}
          <div className="group relative">
            <button
              onClick={goProfile}
              aria-label="Profile"
              className="p-2 rounded-full transition active:scale-95 text-white hover:bg-white hover:text-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icon.User />
            </button>
            {/* Custom tooltip - white background, blue text */}
            <span className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium bg-white text-sky-500 shadow-lg opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 border border-sky-200">
              Profile
            </span>
          </div>

          {/* Logout */}
          <div className="group relative">
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="p-2 rounded-full transition active:scale-95 text-white hover:bg-white hover:text-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icon.Logout />
            </button>
            {/* Custom tooltip - white background, blue text */}
            <span className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium bg-white text-sky-500 shadow-lg opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 border border-sky-200">
              Sign out
            </span>
          </div>
        </div>

        {/* Brand title - bigger and centered */}
        <div className="bg-white rounded-3xl px-16 py-8 shadow-2xl mb-12">
          <h1 className={`brand-title text-7xl font-extrabold tracking-tight ${getGradientTextClasses()}`}>
            Clerkship
          </h1>
        </div>

        {/* Year buttons */}
        <div className="mt-4 flex items-center gap-8">
          {/* Year 4 button - white background, sky blue text, pill-shaped */}
          <Link
            href="/year4"
            className="bg-white text-sky-500 font-semibold text-2xl px-12 py-5 w-56 text-center rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out"
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
            title="Enter Year 4 content"
          >
            Year 4
          </Link>

          {/* Year 5 button - white background, sky blue text, pill-shaped */}
          <Link
            href="/year5"
            className="bg-white text-sky-500 font-semibold text-2xl px-12 py-5 w-56 text-center rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out"
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
            title="Enter Year 5 content"
          >
            Year 5
          </Link>
        </div>
      </main>
    </ForceBlueTheme>
  );
}

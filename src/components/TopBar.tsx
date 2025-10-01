// src/components/TopBar.tsx
"use client";


import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { MenuIcon, UserIcon, LogOutIcon, SunIcon, MoonIcon } from "./LightweightIcons";

type TopBarProps = {
  // React 19/Next 15: only allow function props that are clearly client-side
  // and not treated as Server Actions by naming convention.
  // Rename to end with `Action` to satisfy IDE diagnostics when imported
  // from server components.
  onHamburgerAction?: () => void;
  showHamburger?: boolean;
};

export default function TopBar({ onHamburgerAction, showHamburger = true }: TopBarProps) {
  const { data: session } = useSession();
  

  const [isDark, setIsDark] = useState<boolean>(true);

  // simple theme persistence (no next-themes)
  useEffect(() => {
    const saved = localStorage.getItem("theme") ?? "dark";
    const dark = saved === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3">
          {showHamburger && (
            <button
              aria-label="Toggle sidebar"
              onClick={onHamburgerAction}
              className="inline-flex items-center justify-center p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md"
              title="Toggle sidebar"
            >
              {/* minimalist, thicker icon, no outer box */}
              <MenuIcon />
            </button>
          )}

          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:opacity-90 color-smooth"
          >
            Clerkship
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme icon */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none icon-hover color-smooth"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Profile (if authenticated go to profile/settings; otherwise to login) */}
          <Link
            href={session ? "/profile" : "/login"}
            title={session ? "Profile" : "Sign in"}
            className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none icon-hover color-smooth"
          >
            <UserIcon />
          </Link>

          {/* Logout icon (only if session) */}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
              className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none icon-hover color-smooth"
            >
              <LogOutIcon />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

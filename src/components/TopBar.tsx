// src/components/TopBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Menu, Palette, User, LogOut, Sun, Moon } from "lucide-react";

type TopBarProps = {
  onHamburger?: () => void;
  showHamburger?: boolean;
};

export default function TopBar({ onHamburger, showHamburger = true }: TopBarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

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
              onClick={onHamburger}
              className="inline-flex items-center justify-center p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md"
              title="Toggle sidebar"
            >
              {/* minimalist, thicker icon, no outer box */}
              <Menu size={28} strokeWidth={2.75} />
            </button>
          )}

          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:opacity-90"
          >
            Clerkship
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Theme icon */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Profile (if authenticated go to profile/settings; otherwise to login) */}
          <Link
            href={session ? "/profile" : "/login"}
            title={session ? "Profile" : "Sign in"}
            className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
          >
            <User size={20} />
          </Link>

          {/* Logout icon (only if session) */}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
              className="rounded-lg p-2 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

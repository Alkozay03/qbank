"use client";

import { useEffect, useState } from "react";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");

  // hydrate from localStorage
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  // close on click away
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.("#theme-menu, #theme-button")) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const applyTheme = (v: Theme) => {
    const root = document.documentElement;
    if (v === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", v);
    }
  };

  const choose = (v: Theme) => {
    setTheme(v);
    localStorage.setItem("theme", v);
    applyTheme(v);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        id="theme-button"
        onClick={() => setOpen((x) => !x)}
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Theme
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          id="theme-menu"
          className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg overflow-hidden z-50"
          role="menu"
        >
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => choose(t)}
              className={`block w-full text-left px-3 py-2 hover:bg-slate-50 ${theme === t ? "font-semibold" : ""}`}
              role="menuitem"
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

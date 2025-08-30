// src/components/Shell.tsx
"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopRightBar from "./TopRightBar";
import clsx from "clsx";

export default function Shell({
  title,
  pageName,
  children,
}: {
  title: string;
  pageName?: string; // e.g. "Dashboard", "Performance", etc.
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  useLayoutEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      const path = window.location.pathname;
      if (!path.startsWith("/profile")) {
        localStorage.setItem("last-page", path);
      }
    } catch {}
  }, []);

  // match Sidebar widths so the page glides with it
  const leftPad = collapsed ? 64 : 288;

  return (
    <div className="min-h-screen bg-[#F7FBFF] overflow-x-hidden">
      {/* Sidebar (keeps its own animation & brand) */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} /> {/* :contentReference[oaicite:1]{index=1} */}

      {/* Header row (NOT fixed). It hosts the pageName on the left and the icons on the right. */}
      <header
        className={clsx(
          "relative flex items-center h-14",
          "transition-[padding-left] duration-400 ease-in-out"
        )}
        style={{ paddingLeft: leftPad, paddingRight: 16 }}
      >
        {/* Big page name near the sidebar (optional) */}
        {pageName ? (
          <div
            className="pointer-events-none select-none font-extrabold tracking-tight"
            style={{
              color: "#2F6F8F",
              fontSize: "28px",
              letterSpacing: "-0.02em",
              marginLeft: 16, // small breathing room from the sidebar edge
              transition: "transform 400ms ease-in-out",
            }}
          >
            {pageName}
          </div>
        ) : null}

        {/* Right-top icons positioned inside this header so they scroll away with it */}
        <div className="absolute right-0 top-0 h-14 flex items-center">
          <TopRightBar /> {/* uses absolute internally; contained by this relative header */} {/* :contentReference[oaicite:2]{index=2} */}
        </div>
      </header>

      {/* Title bar (your existing 'title' — e.g., “Welcome, Student”) */}
      <div
        className={clsx(
          "transition-[padding-left] duration-400 ease-in-out",
        )}
        style={{ paddingLeft: leftPad }}
      >
        <div className="px-4 py-3">
          {/* No border here (removes faint line) */}
          <div className="text-xl font-semibold text-[#2F6F8F]">{title}</div>
        </div>
      </div>

      {/* Page content */}
      <main
        className={clsx(
          "transition-[padding-left] duration-400 ease-in-out"
        )}
        style={{ paddingLeft: leftPad }}
      >
        <div
          className="mx-auto px-4 pb-10"
          style={{
            maxWidth: 1024,
            width: "100%",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

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
  pageName?: string;
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

  const leftPad = collapsed ? 64 : 288; // px

  return (
    <div className="min-h-screen bg-[#F7FBFF] overflow-x-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Top row: icons scroll with content on Year 4 pages */}
      <div
        className="h-14 transition-[padding] duration-400 ease-in-out flex justify-end items-center"
        style={{ paddingLeft: leftPad }}
      >
        <TopRightBar mode="inline" />
      </div>

      {/* Big page label near the sidebar */}
      {pageName && (
        <div
          className={clsx(
            "fixed top-0 z-20 h-14 flex items-center pointer-events-none select-none",
            "transition-transform duration-400 ease-in-out"
          )}
          style={{ left: 16, transform: `translateX(${leftPad}px)` }}
        >
          <span
            className="font-extrabold tracking-tight"
            style={{ color: "#2F6F8F", fontSize: "28px", letterSpacing: "-0.02em" }}
          >
            {pageName}
          </span>
        </div>
      )}

      {/* Content area */}
      <main
        className="pb-10 transition-[padding] duration-400 ease-in-out overflow-x-hidden"
        style={{ paddingLeft: leftPad }}
      >
        {/* Subtitle/title bar (per page) */}
        <div className="px-4 py-3 border-b border-[#E6F0F7] bg-[#F7FBFF]/80 backdrop-blur">
          <div className="text-xl font-semibold text-[#2F6F8F]">{title}</div>
        </div>

        <div
          className="mx-auto px-4 pt-6"
          style={{ maxWidth: 1024, width: "100%" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

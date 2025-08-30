// src/components/YearSelector.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function YearSelector() {
  // Tooltip follows the cursor while hovering over Year 5
  const [showTip, setShowTip] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const onEnter = () => setShowTip(true);
    const onLeave = () => setShowTip(false);
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX + 12, y: e.clientY + 12 }); // small offset
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="relative flex flex-col sm:flex-row gap-6 justify-center items-center">
      {/* Year 4 */}
      <Link
        href="/year4"
        className="group relative inline-flex items-center justify-center rounded-2xl px-10 py-5 text-lg font-semibold
                   bg-[var(--primary)] text-white shadow-md transition-transform duration-200 ease-out
                   hover:scale-[1.03] hover:shadow-lg active:scale-[0.99]"
      >
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
        Year 4 QBank
      </Link>

      {/* Year 5 (disabled) */}
      <button
        ref={btnRef}
        type="button"
        aria-disabled="true"
        className="group relative inline-flex items-center justify-center rounded-2xl px-10 py-5 text-lg font-semibold
                   bg-slate-500/40 text-white/70 shadow-md cursor-not-allowed select-none
                   transition-transform duration-200 ease-out hover:scale-[1.01]"
        onClick={(e) => e.preventDefault()}
      >
        <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-white/5" />
        Year 5 QBank
      </button>

      {/* Tiny tooltip that follows the cursor while hovering Year 5 */}
      {showTip && (
        <div
          className="pointer-events-none fixed z-50 text-[10px] leading-none px-2 py-1 rounded-md
                     bg-black/80 text-white shadow"
          style={{ left: pos.x, top: pos.y }}
        >
          Coming Soon
        </div>
      )}
    </div>
  );
}

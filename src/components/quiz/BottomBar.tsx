"use client";

import { Pause, Octagon } from "lucide-react";
import { useState } from "react";

export default function BottomBar({
  lockAnswers,
  setLockAnswers,
  elapsedMs,
  onEnd,
}: {
  lockAnswers: boolean;
  setLockAnswers: (v: boolean) => void;
  elapsedMs: number;
  onEnd: () => void;
}) {
  const [suspended, setSuspended] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 h-12 bg-[var(--surface)] border-t border-[var(--border)] z-40">
        <div className="h-full max-w-6xl mx-auto flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { if (confirm("End block and record your results?")) onEnd(); }}
              className="inline-flex flex-col items-center text-red-600"
              title="End Block"
            >
              <Octagon />
              <span className="text-[10px] -mt-1">End Block</span>
            </button>

            <button
              onClick={() => setSuspended((v) => !v)}
              className="inline-flex flex-col items-center"
              title="Suspend"
            >
              <Pause />
              <span className="text-[10px] -mt-1">Suspend</span>
            </button>
          </div>

          <div className="text-sm">
            Time Elapsed: {formatElapsed(elapsedMs)}
          </div>

          <label className="inline-flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={lockAnswers}
              onChange={(e) => setLockAnswers(e.target.checked)}
            />
            <span className="text-sm">Lock answers after submit</span>
            <span className="inline-flex gap-1 items-center ml-1">
              <span className="text-emerald-600">✔</span>
              <span className="text-red-600">✘</span>
            </span>
          </label>
        </div>
      </footer>

      {suspended && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={() => setSuspended(false)} />
      )}
    </>
  );
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

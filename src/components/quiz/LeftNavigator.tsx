"use client";

import { Check, X, FlagTriangleRight } from "lucide-react";

export default function LeftNavigator({
  open,
  items,
  currentIndex,
  onJump,
}: {
  open: boolean;
  items: {
    id: string;
    order: number;
    flagged: boolean;
    hasResponse: boolean;
    lastChoice: string | null;
    lastCorrect: boolean | null;
  }[];
  currentIndex: number;
  onJump: (i: number) => void;
}) {
  return (
    <aside
      className={`fixed left-0 top-12 bottom-12 z-40 w-56 border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full overflow-y-auto p-2">
        <div className="grid gap-2">
          {items.map((it, i) => {
            const isActive = i === currentIndex;
            return (
              <button
                key={it.id}
                onClick={() => onJump(i)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md border ${
                  isActive
                    ? "bg-[var(--primary-50)] border-[var(--primary)]"
                    : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--primary-50)]"
                }`}
              >
                <span className="font-medium">{it.order}</span>
                <span className="inline-flex items-center gap-1">
                  {it.flagged && <FlagTriangleRight size={14} className="text-red-600" />}
                  {it.hasResponse &&
                    (it.lastCorrect ? (
                      <Check size={16} className="text-emerald-600" />
                    ) : (
                      <X size={16} className="text-red-600" />
                    ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

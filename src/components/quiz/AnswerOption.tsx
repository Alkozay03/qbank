"use client";

import { CheckCircle2, XCircle } from "lucide-react";

export default function AnswerOption({
  label,
  text,
  picked,
  setPicked,
  submitted,
  correctLabel,
  perChoicePercent,
}: {
  label: string;
  text: string;
  picked: string | null;
  setPicked: (s: string) => void;
  submitted: boolean;
  correctLabel: string | null;
  perChoicePercent: Record<string, number>;
}) {
  const isPicked = picked === label;
  const isCorrect = submitted && correctLabel === label;
  const isWrongPick = submitted && isPicked && correctLabel !== label;

  return (
    <label
      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors
      ${
        submitted
          ? isCorrect
            ? "border-emerald-500 bg-emerald-50"
            : isWrongPick
            ? "border-red-500 bg-red-50"
            : "border-[var(--border)] bg-[var(--surface)]"
          : isPicked
          ? "border-[var(--primary)] bg-[var(--primary-50)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--primary-50)]"
      }`}
    >
      <input
        type="radio"
        name="opt"
        value={label}
        className="mt-1 h-4 w-4"
        checked={isPicked}
        onChange={() => setPicked(label)}
        disabled={submitted}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {submitted && isCorrect && <CheckCircle2 className="text-emerald-600" size={18} />}
          {submitted && isWrongPick && <XCircle className="text-red-600" size={18} />}
          <span className="font-semibold">{label}.</span>
          <span>{text}</span>
        </div>
        {submitted && (
          <div className="mt-1 text-xs text-[var(--muted)]">
            {perChoicePercent[label] ?? 0}% chose this
          </div>
        )}
      </div>
    </label>
  );
}

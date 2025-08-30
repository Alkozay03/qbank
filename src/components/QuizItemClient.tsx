"use client";
import React from "react";
import HighlightableText from "@/components/HighlightableText";

type Choice = { id: string; label: string; text: string; isCorrect: boolean };
type Question = { stem: string; choices: Choice[]; explanation?: { text?: string } | null };
type Response = { id: string; chosenLabel: string | null; isCorrect: boolean | null } | null;

export default function QuizItemClient({
  quizId,
  itemId,
  order,
  question,
  initialResponse,
}: {
  quizId: string;
  itemId: string;
  order: number;
  question: Question;
  initialResponse: Response;
}) {
  const [selected, setSelected] = React.useState<string | null>(initialResponse?.chosenLabel ?? null);
  const [locked, setLocked] = React.useState<boolean>(!!initialResponse);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(initialResponse?.isCorrect ?? null);
  const [crossed, setCrossed] = React.useState<Set<string>>(new Set());

  const correctLabel = React.useMemo(
    () => question.choices.find((c) => c.isCorrect)?.label ?? null,
    [question.choices]
  );

  const toggleCross = (choiceId: string, choiceLabel: string) => {
    setCrossed((prev) => {
      const s = new Set(prev);
      if (s.has(choiceId)) s.delete(choiceId);
      else s.add(choiceId);
      // If we cross the currently selected, clear it
      if (selected === choiceLabel && s.has(choiceId)) setSelected(null);
      return s;
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const chosen = selected;
    if (!chosen) return;

    const fd = new FormData();
    fd.append("quizItemId", itemId);
    fd.append("choice", chosen);

    const res = await fetch(`/quiz/${quizId}/submit`, { method: "POST", body: fd });
    if (res.ok) {
      // compute from local data (no full reload)
      const ok = chosen === correctLabel;
      setIsCorrect(ok);
      setLocked(true);
    }
  };

  return (
    <div
      className={`border rounded p-4 ${
        isCorrect === true ? "border-green-500"
        : isCorrect === false ? "border-red-500"
        : "border-gray-200"
      }`}
    >
      <p className="mb-3">
        <strong className="mr-2">Q{order}.</strong>
      </p>

      {/* Highlightable stem */}
      <HighlightableText text={question.stem} />

      <form onSubmit={onSubmit} className="space-y-2 mt-3">
        {question.choices
          .slice()
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((c) => {
            const isCrossed = crossed.has(c.id);
            const disabled = locked || isCrossed;
            return (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <label className={`flex items-start gap-2 flex-1 ${isCrossed ? "line-through opacity-60" : ""}`}>
                  <input
                    type="radio"
                    name={`choice-${itemId}`}
                    value={c.label}
                    className="mt-1"
                    disabled={disabled}
                    checked={selected === c.label}
                    onChange={() => setSelected(c.label)}
                  />
                  <span><strong>{c.label}.</strong> {c.text}</span>
                </label>

                <button
                  type="button"
                  aria-label={isCrossed ? "Uncross answer" : "Cross out answer"}
                  onClick={() => toggleCross(c.id, c.label)}
                  className={`select-none border rounded px-2 py-0.5 text-sm ${
                    isCrossed ? "border-red-600 text-red-600" : "border-gray-300 text-gray-500"
                  } hover:bg-gray-50`}
                >
                  ✕
                </button>
              </div>
            );
          })}

        {!locked && (
          <button className="mt-2 border rounded px-3 py-1">Submit</button>
        )}
      </form>

      {locked && (
        <div className="mt-3 text-sm">
          {isCorrect ? (
            <div className="text-green-700">✅ Correct</div>
          ) : (
            <div className="text-red-700">
              ❌ Incorrect. Correct answer: <strong>{correctLabel}</strong>
            </div>
          )}
        </div>
      )}

      <details className="mt-3" {...(locked ? { open: true } : {})}>
        <summary className="cursor-pointer">Explanation</summary>
        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
          {question.explanation?.text}
        </div>
      </details>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toggleFlag, submitAnswer, endBlock } from "@/app/quiz/actions";
import LeftNavigator from "@/components/quiz/LeftNavigator";
import LabsDrawer from "@/components/quiz/LabsDrawer";
import Calculator from "@/components/quiz/Calculator";
import AnswerOption from "@/components/quiz/AnswerOption";
import BottomBar from "@/components/quiz/BottomBar";
import {
  FlagTriangleRight,
  MoveLeft,
  MoveRight,
  Calculator as CalcIcon,
  Beaker,
  Minus,
  Plus,
  Type,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";

type QuizPayload = {
  id: string;
  items: {
    id: string;
    order: number;
    flagged: boolean;
    hasResponse: boolean;
    lastChoice: string | null;
    lastCorrect: boolean | null;
    question: {
      id: string;
      stem: string;
      subject: string | null;
      system: string | null;
      topic: string | null;
      explanation: string | null;
      choices: { id: string; label: string; text: string; isCorrect: boolean }[];
    };
  }[];
};

export default function QuizRunner({ quiz }: { quiz: QuizPayload }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [labsOpen, setLabsOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  const [fontScale, setFontScale] = useState(1);
  const [lockAnswers, setLockAnswers] = useState(true);

  const [flagged, setFlagged] = useState(quiz.items[0]?.flagged ?? false);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctLabel: string | null;
    perChoicePercent: Record<string, number>;
    percentCorrectOverall: number;
  } | null>(null);

  const [questionStart, setQuestionStart] = useState<number>(() => Date.now());
  const [elapsedTotal, setElapsedTotal] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedTotal((e) => e + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const it = quiz.items[index];
    setPicked(null);
    setSubmitted(false);
    setResult(null);
    setFlagged(it.flagged);
    setQuestionStart(Date.now());
  }, [index, quiz.items]);

  const item = quiz.items[index];
  const total = quiz.items.length;

  async function handleSubmit() {
    if (!picked) return;
    const elapsed = Date.now() - questionStart;
    const r = await submitAnswer({
      quizItemId: item.id,
      questionId: item.question.id,
      chosenLabel: picked,
      elapsedMs: elapsed,
      lockAnswers,
    });
    setSubmitted(true);
    setResult({
      isCorrect: r.isCorrect,
      correctLabel: r.correctLabel,
      perChoicePercent: r.perChoicePercent,
      percentCorrectOverall: r.percentCorrectOverall,
    });
  }

  async function onFlagToggle(next: boolean) {
    setFlagged(next);
    await toggleFlag(item.id, next);
  }

  function go(delta: number) {
    const next = index + delta;
    if (next >= 0 && next < total) setIndex(next);
  }

  function bigger() { setFontScale((v) => Math.min(1.6, +(v + 0.1).toFixed(2))); }
  function smaller() { setFontScale((v) => Math.max(0.8, +(v - 0.1).toFixed(2))); }
  function resetFont() { setFontScale(1); }

  async function finish() {
    const { redirectTo } = await endBlock(quiz.id);
    router.push(redirectTo);
  }

  const contentShiftRight = labsOpen ? "mr-80" : "mr-0";
  const contentShiftLeft = leftOpen ? "ml-56" : "ml-0";

  return (
    <>
      {/* EXAM TOP BAR */}
      <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="h-12 px-2 sm:px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="icon-btn" title="Questions list" onClick={() => setLeftOpen(v => !v)}>
              <Menu size={18} />
            </button>
            <span className="text-sm sm:text-base font-semibold">
              Item {index + 1} / {total}
            </span>

            <label className="ml-4 inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-red-600 h-4 w-4"
                checked={flagged}
                onChange={(e) => onFlagToggle(e.target.checked)}
              />
              <FlagTriangleRight size={16} className="text-red-600" />
              <span className="hidden sm:inline">Flag</span>
            </label>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-[var(--text)]" onClick={() => go(-1)} title="Previous">
              <div className="flex flex-col items-center">
                <MoveLeft />
                <span className="text-xs">Previous</span>
              </div>
            </button>
            <button className="text-[var(--text)]" onClick={() => go(1)} title="Next">
              <div className="flex flex-col items-center">
                <MoveRight />
                <span className="text-xs">Next</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1">
              <button className="icon-btn" title="Smaller text" onClick={smaller}><Minus size={16} /></button>
              <button className="icon-btn" title="Reset size" onClick={resetFont}><Type size={16} /></button>
              <button className="icon-btn" title="Bigger text" onClick={bigger}><Plus size={16} /></button>
            </div>
            <button className="icon-btn" title="Lab values" onClick={() => setLabsOpen(v => !v)}>
              <Beaker size={18} />
            </button>
            <button className="icon-btn" title="Calculator" onClick={() => setCalcOpen(true)}>
              <CalcIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <LeftNavigator
        open={leftOpen}
        items={quiz.items}
        currentIndex={index}
        onJump={(i) => setIndex(i)}
      />
      <LabsDrawer open={labsOpen} onClose={() => setLabsOpen(false)} />

      <div className={`transition-all duration-200 ${contentShiftLeft} ${contentShiftRight}`}>
        <div className="max-w-5xl mx-auto px-4 py-5" style={{ fontSize: `${fontScale}rem` }}>
          <div className="mb-4 whitespace-pre-wrap leading-relaxed">{item.question.stem}</div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (!submitted) handleSubmit(); }}
            className="grid gap-2"
          >
            {item.question.choices.map((c) => (
              <AnswerOption
                key={c.id}
                label={c.label}
                text={c.text}
                picked={picked}
                setPicked={setPicked}
                submitted={submitted}
                correctLabel={result?.correctLabel || null}
                perChoicePercent={result?.perChoicePercent || {}}
              />
            ))}

            <div className="mt-3">
              {!submitted ? (
                <button
                  type="submit"
                  disabled={!picked}
                  className="px-4 py-2 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-600)] disabled:opacity-40"
                >
                  Submit Answer
                </button>
              ) : (
                <div className="text-sm text-[var(--muted)]">Answer recorded.</div>
              )}
            </div>
          </form>

          {submitted && result && (
            <div className="card mt-5 p-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="font-semibold">
                {result.isCorrect ? (
                  <span className="text-emerald-600">Correct</span>
                ) : (
                  <div className="text-red-600">
                    Incorrect
                    {result.correctLabel && (
                      <div className="text-[var(--text)] font-normal">
                        Correct answer <b>{result.correctLabel}</b>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-[var(--text)]">
                {result.percentCorrectOverall}% Answered Correctly
              </div>
              <div className="text-[var(--muted)]">
                Time Spent: {formatMs(Date.now() - questionStart)}
              </div>
            </div>
          )}

          {submitted && item.question.explanation && (
            <div className="card mt-5 p-4">
              <h3 className="font-bold mb-2">Explanation</h3>
              <div className="whitespace-pre-wrap leading-relaxed">
                {item.question.explanation}
              </div>

              <h4 className="mt-6 font-semibold">Educational objective</h4>
              <p className="text-[var(--text)]">
                Understand the key concept behind the correct option and why the other options are incorrect.
              </p>

              <h4 className="mt-4 font-semibold">References</h4>
              <ul className="list-disc pl-6">
                <li>Example reference link – add real URLs in your questions data.</li>
              </ul>
            </div>
          )}

          <div className="mt-6 text-sm text-[var(--muted)] flex gap-6">
            {item.question.subject && <div><b>Subject</b>: {item.question.subject}</div>}
            {item.question.system && <div><b>System</b>: {item.question.system}</div>}
            {item.question.topic && <div><b>Topic</b>: {item.question.topic}</div>}
          </div>
        </div>
      </div>

      <BottomBar
        lockAnswers={lockAnswers}
        setLockAnswers={setLockAnswers}
        elapsedMs={elapsedTotal}
        onEnd={finish}
      />

      {calcOpen && <Calculator onClose={() => setCalcOpen(false)} />}
    </>
  );
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m} min, ${r} sec`;
}

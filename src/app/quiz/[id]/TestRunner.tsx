"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlaskConical,
  Calculator,
  Minus,
  Plus,
  Type,
  Flag,
  Check,
  X,
  Menu,
  PauseCircle,
  Octagon,
} from "lucide-react";
import { LABS, LabEntry } from "./labs";

type Choice = { id: string; label: string; text: string; isCorrect: boolean };
type Item = {
  id: string;
  order: number;
  question: { id: string; stem: string; choices: Choice[]; explanation: string | null };
};
type QuizPayload = { id: string; items: Item[] };

type AnswerMap = Record<
  string,
  { chosen: string; isCorrect: boolean; correctLabel: string; timeSec: number }
>;
type FlagMap = Record<string, boolean>;
type CrossMap = Record<string, Record<string, boolean>>; // by itemId -> label -> crossed

const LEFT_OPEN = 200;   // px
const LEFT_CLOSED = 44;  // px
const LABS_W = 360;      // px

export default function TestRunner({ quiz }: { quiz: QuizPayload }) {
  // Layout
  const [openLeft, setOpenLeft] = useState(true);
  const [openLabs, setOpenLabs] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // Navigation
  const [idx, setIdx] = useState(0);
  const cur = quiz.items[idx];

  // State
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flags, setFlags] = useState<FlagMap>({});
  const [cross, setCross] = useState<CrossMap>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(true);

  // font size + timers
  const [fontScale, setFontScale] = useState(0); // -2..+4
  const [elapsed, setElapsed] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(() => Date.now());

  // Persist per quiz
  useEffect(() => {
    try {
      const a = localStorage.getItem(`q:${quiz.id}:answers`);
      const f = localStorage.getItem(`q:${quiz.id}:flags`);
      const cr = localStorage.getItem(`q:${quiz.id}:cross`);
      if (a) setAnswers(JSON.parse(a));
      if (f) setFlags(JSON.parse(f));
      if (cr) setCross(JSON.parse(cr));
    } catch {}
  }, [quiz.id]);

  useEffect(() => {
    localStorage.setItem(`q:${quiz.id}:answers`, JSON.stringify(answers));
  }, [quiz.id, answers]);
  useEffect(() => {
    localStorage.setItem(`q:${quiz.id}:flags`, JSON.stringify(flags));
  }, [quiz.id, flags]);
  useEffect(() => {
    localStorage.setItem(`q:${quiz.id}:cross`, JSON.stringify(cross));
  }, [quiz.id, cross]);

  // global timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // on question change
  useEffect(() => {
    setPicked(null);
    setStartTime(Date.now());
  }, [idx]);

  const locked = !!answers[cur.id];
  const sideWidth = openLeft ? LEFT_OPEN : LEFT_CLOSED;
  const rightPad = openLabs ? LABS_W : 0;
  const currentScale = `calc(1rem + ${fontScale * 0.06}rem)`;

  // submit
  async function submit() {
    if (!picked || locked) return;
    const timeSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

    try {
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizItemId: cur.id, chosenLabel: picked }),
      }).then((r) => r.json());

      if (res?.ok) {
        setAnswers((prev) => ({
          ...prev,
          [cur.id]: {
            chosen: picked,
            isCorrect: res.isCorrect,
            correctLabel: res.correctLabel,
            timeSec,
          },
        }));
        setPercentages((p) => ({ ...p, [cur.id]: res.percentages || {} }));
      } else {
        alert("Failed to submit.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit. Please try again.");
    }
  }

  // percentages (per item)
  const [percentages, setPercentages] = useState<Record<string, Record<string, number>>>({});

  function fmtTime(sec: number) {
    const s = sec % 60;
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // flag & cross helpers
  function toggleFlag() {
    setFlags((f) => ({ ...f, [cur.id]: !f[cur.id] }));
  }
  function toggleCross(label: string) {
    setCross((c) => {
      const map = { ...(c[cur.id] ?? {}) };
      map[label] = !map[label];
      return { ...c, [cur.id]: map };
    });
    if (picked === label) setPicked(null);
  }

  // calculator
  const [calcExpr, setCalcExpr] = useState("");
  const calcRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  function evalCalc() {
    try {
       
      const out = Function(`"use strict"; return (${calcExpr});`)();
      setCalcExpr(String(out));
    } catch {
      setCalcExpr("Err");
    }
  }

  // labs
  const [labSection, setLabSection] = useState<LabEntry["section"]>("Serum");
  const [labSearch, setLabSearch] = useState("");
  const visibleLabs = useMemo(() => {
    const s = labSearch.trim().toLowerCase();
    return LABS.filter(
      (l) =>
        l.section === labSection &&
        (s.length === 0 || l.name.toLowerCase().includes(s) || (l.unit ?? "").toLowerCase().includes(s))
    );
  }, [labSection, labSearch]);

  // highlight in stem
  const stemRef = useRef<HTMLDivElement | null>(null);
  function tryHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    if (!stemRef.current) return;
    const container = stemRef.current;
    if (!container.contains(sel.anchorNode) || !container.contains(sel.focusNode)) return;

    const range = sel.getRangeAt(0);
    const mark = document.createElement("mark");
    mark.style.background = "#fef08a"; // yellow-200
    try {
      range.surroundContents(mark);
      sel.removeAllRanges();
    } catch {
      // If selection spans multiple nodes, ignore
    }
  }
  function removeHighlight(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === "MARK") {
      const parent = t.parentNode!;
      while (t.firstChild) parent.insertBefore(t.firstChild, t);
      parent.removeChild(t);
    }
  }

  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
  const incorrectCount = Object.values(answers).filter((a) => !a.isCorrect).length;

  return (
    <div className="relative min-h-dvh bg-gray-50">
      {/* TOP BAR */}
      <div
        className="fixed top-0 right-0 left-0 h-14 z-40 border-b bg-white flex items-center"
        style={{ paddingLeft: sideWidth, paddingRight: rightPad }}
      >
        <div className="flex items-center gap-2 px-3 w-full">
          <button
            onClick={() => setOpenLeft((v) => !v)}
            className="p-2 rounded hover:bg-black/5"
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </button>

          <div className="font-semibold">Item {idx + 1} / {quiz.items.length}</div>

          <label className="ml-4 inline-flex items-center gap-2 select-none cursor-pointer">
            <input type="checkbox" checked={!!flags[cur.id]} onChange={toggleFlag} className="size-4" />
            <Flag className="size-4 text-red-500" />
            <span>Flag</span>
          </label>

          <div className="mx-auto flex items-center gap-6">
            <button
              disabled={idx === 0}
              onClick={() => setIdx((n) => Math.max(0, n - 1))}
              className="px-3 py-1 rounded disabled:opacity-40 hover:bg-black/5"
            >
              ←
              <div className="text-xs opacity-70">Previous</div>
            </button>
            <button
              disabled={idx === quiz.items.length - 1}
              onClick={() => setIdx((n) => Math.min(quiz.items.length - 1, n + 1))}
              className="px-3 py-1 rounded disabled:opacity-40 hover:bg-black/5"
            >
              →
              <div className="text-xs opacity-70">Next</div>
            </button>
          </div>

          {/* font size */}
          <div className="flex items-center gap-1">
            <button className="p-2 rounded hover:bg-black/5" onClick={() => setFontScale((v) => Math.max(-2, v - 1))}>
              <Minus className="size-4" />
            </button>
            <button className="p-2 rounded hover:bg-black/5" onClick={() => setFontScale(0)} title="Reset size">
              <Type className="size-4" />
            </button>
            <button className="p-2 rounded hover:bg-black/5" onClick={() => setFontScale((v) => Math.min(4, v + 1))}>
              <Plus className="size-4" />
            </button>
          </div>

          {/* toggle counter */}
          <label className="ml-3 text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={showCounter} onChange={(e) => setShowCounter(e.target.checked)} />
            Show counter
          </label>

          {/* labs + calc */}
          <button onClick={() => setOpenLabs((v) => !v)} className="ml-2 p-2 rounded hover:bg-black/5" title="Lab values">
            <FlaskConical className="size-5" />
          </button>
          <button onClick={() => setCalcOpen((v) => !v)} className="p-2 rounded hover:bg-black/5" title="Calculator">
            <Calculator className="size-5" />
          </button>
        </div>
      </div>

      {/* LEFT NAV */}
      <div
        className="fixed left-0 top-0 bottom-0 border-r bg-white z-30 overflow-y-auto"
        style={{ width: sideWidth }}
      >
        <div className="pt-14 px-2">
          {quiz.items.map((it, i) => {
            const a = answers[it.id];
            const isActive = i === idx;
            const crossedOrFlag = flags[it.id];
            return (
              <button
                key={it.id}
                onClick={() => setIdx(i)}
                className={[
                  "w-full rounded-md border transition-colors",
                  openLeft
                    ? "px-3 py-3 mb-2 flex items-center justify-between"
                    : "h-10 mb-2 flex items-center justify-center px-0",
                  isActive ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50 border-gray-200",
                ].join(" ")}
              >
                {openLeft ? (
                  <>
                    <div className="font-medium">{i + 1}</div>
                    <div className="flex items-center gap-2">
                      {crossedOrFlag ? <Flag className="size-4 text-red-500" /> : null}
                      {a ? (a.isCorrect ? <Check className="size-4 text-green-600" /> : <X className="size-4 text-red-600" />) : null}
                  </div>
                  </>
                ) : (
                  <div className="relative">
                    <span className="font-semibold">{i + 1}</span>
                    {a ? (
                      a.isCorrect ? (
                        <Check className="size-4 text-green-600 absolute -right-5 -top-1" />
                      ) : (
                        <X className="size-4 text-red-600 absolute -right-5 -top-1" />
                      )
                    ) : null}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT LABS (push layout, not overlay) */}
      <div
        className="fixed top-14 bottom-10 right-0 z-30 border-l bg-white transition-[transform] duration-200"
        style={{
          width: LABS_W,
          transform: openLabs ? "translateX(0)" : `translateX(${LABS_W}px)`,
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-3 border-b flex items-center gap-2">
            <FlaskConical className="size-4 text-blue-600" />
            <div className="font-semibold">Lab values</div>
            <button className="ml-auto px-2 py-1 rounded hover:bg-black/5" onClick={() => setOpenLabs(false)}>✕</button>
          </div>
          <div className="p-3 flex gap-2">
            {(["Serum", "Urine", "CSF", "Blood/BMI"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setLabSection(s)}
                className={[
                  "px-3 py-1 rounded border text-sm",
                  labSection === s ? "bg-blue-50 border-blue-300" : "hover:bg-black/5",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="px-3 pb-2">
            <input
              value={labSearch}
              onChange={(e) => setLabSearch(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Search parameter…"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <table className="w-full text-sm">
              <tbody>
                {visibleLabs.map((l) => (
                  <tr key={`${l.section}-${l.name}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 font-medium">{l.name}</td>
                    <td className="py-2 pr-2 text-right">{l.range}</td>
                    <td className="py-2 text-gray-500">{l.unit ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleLabs.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">No results</div>
            )}
          </div>
        </div>
      </div>

      {/* CALCULATOR (draggable) */}
      {calcOpen && (
        <div ref={calcRef} className="fixed z-40 right-4 bottom-24 w-64 rounded-lg border bg-white shadow">
          <div
            className="cursor-move select-none px-3 py-2 border-b flex items-center justify-between"
            onMouseDown={(e) => setDrag({ x: e.clientX, y: e.clientY })}
            onMouseUp={() => setDrag(null)}
            onMouseMove={(e) => {
              if (!drag || !calcRef.current) return;
              const dx = e.clientX - drag.x;
              const dy = e.clientY - drag.y;
              const el = calcRef.current;
              const r = el.getBoundingClientRect();
              el.style.left = r.left + dx + "px";
              el.style.top = r.top + dy + "px";
              setDrag({ x: e.clientX, y: e.clientY });
            }}
          >
            <div className="font-semibold">Calculator</div>
            <button className="px-2 py-1 rounded hover:bg-black/5" onClick={() => setCalcOpen(false)}>✕</button>
          </div>
          <div className="p-3 space-y-2">
            <input
              value={calcExpr}
              onChange={(e) => setCalcExpr(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. (3+7)/2"
            />
            <div className="grid grid-cols-4 gap-2">
              {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","(",")"].map((k) => (
                <button key={k} onClick={() => setCalcExpr((s) => s + k)} className="rounded border py-2 hover:bg-black/5">
                  {k}
                </button>
              ))}
              <button onClick={() => setCalcExpr("")} className="col-span-2 rounded border py-2 hover:bg-black/5">Clear</button>
              <button onClick={() => setCalcExpr((s) => s + "+")} className="rounded border py-2 hover:bg-black/5">+</button>
              <button onClick={evalCalc} className="rounded border py-2 bg-blue-600 text-white hover:brightness-95">=</button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="pt-16 pb-14" style={{ marginLeft: sideWidth, marginRight: rightPad }}>
        <div className="max-w-4xl mx-auto px-4">
          {/* stem (highlightable) */}
          <div
            ref={stemRef}
            className="leading-relaxed mb-5 bg-white rounded border px-4 py-4"
            style={{ fontSize: currentScale }}
            onMouseUp={tryHighlight}
            onClick={removeHighlight}
          >
            {cur.question.stem}
          </div>

          {/* choices with cross-out */}
          <div className="space-y-3">
            {cur.question.choices.map((c) => {
              const after = answers[cur.id];
              const isCorrectChoice = after && c.label === after.correctLabel;
              const isWrongChosen = after && after.chosen === c.label && !after.isCorrect;
              const isCrossed = !!cross[cur.id]?.[c.label];
              const disabled = !!answers[cur.id] || isCrossed;

              return (
                <div
                  key={c.id}
                  className={[
                    "flex items-center gap-3 rounded border px-4 py-3 bg-white",
                    !after ? "hover:bg-gray-50" : "opacity-90",
                    isCorrectChoice ? "border-green-500 bg-green-50/50" : "",
                    isWrongChosen ? "border-red-500 bg-red-50/50" : "",
                    isCrossed ? "line-through text-gray-400 opacity-70" : "",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name={`q-${cur.id}`}
                    className="size-5"
                    disabled={disabled}
                    checked={picked === c.label}
                    onChange={() => setPicked(c.label)}
                  />
                  <span className="font-semibold">{c.label}.</span>
                  <span className="flex-1">{c.text}</span>

                  {/* cross-out button */}
                  <button
                    onClick={() => toggleCross(c.label)}
                    className={[
                      "ml-2 px-2 py-1 rounded border text-sm",
                      isCrossed ? "border-red-500 text-red-600" : "hover:bg-black/5",
                    ].join(" ")}
                    title={isCrossed ? "Uncross" : "Cross out"}
                    disabled={!!answers[cur.id]}
                  >
                    <X className="size-4" />
                  </button>

                  {/* icons & % after submit */}
                  {after ? (
                    <>
                      {isCorrectChoice ? (
                        <Check className="size-5 text-green-600" />
                      ) : isWrongChosen ? (
                        <X className="size-5 text-red-600" />
                      ) : null}

                      {percentages[cur.id]?.[c.label] != null && (
                        <span className="ml-2 text-sm text-gray-600">
                          {percentages[cur.id][c.label]}%
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* submit + result strip */}
          <div className="mt-6">
            {!answers[cur.id] ? (
              <button
                disabled={!picked}
                onClick={submit}
                className="px-5 py-3 rounded bg-blue-600 text-white disabled:opacity-40 hover:brightness-95"
              >
                Submit Answer
              </button>
            ) : null}

            {answers[cur.id] ? (
              <div className="mt-5 rounded border bg-white">
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {answers[cur.id].isCorrect ? (
                      <span className="inline-flex items-center gap-2 text-green-700">
                        <Check className="size-5" /> Chosen {answers[cur.id].chosen}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-red-700">
                        <X className="size-5" /> Chosen {answers[cur.id].chosen} (Correct {answers[cur.id].correctLabel})
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500">Answered correctly</div>
                    <div className="mt-1">
                      {percentages[cur.id]?.[answers[cur.id].correctLabel] ?? 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Time Spent</div>
                    <div className="mt-1">{fmtTime(answers[cur.id].timeSec)}</div>
                  </div>
                </div>

                {cur.question.explanation ? (
                  <div className="px-4 py-4 border-t">
                    <h3 className="font-semibold mb-2">Explanation</h3>
                    <div className="prose max-w-none">{cur.question.explanation}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div
        className="fixed bottom-0 left-0 right-0 h-10 z-40 border-t bg-white flex items-center"
        style={{ paddingLeft: sideWidth, paddingRight: rightPad }}
      >
        <div className="px-3 text-sm">
          <span className="text-gray-600">Time Elapsed:</span>{" "}
          <span className="font-medium">{fmtTime(elapsed)}</span>
        </div>

        <div className="mx-auto text-sm flex items-center gap-4">
          {showCounter && (
            <>
              <span className="inline-flex items-center gap-1 text-green-700">
                <Check className="size-4" /> {correctCount}
              </span>
              <span className="inline-flex items-center gap-1 text-red-700">
                <X className="size-4" /> {incorrectCount}
              </span>
            </>
          )}
        </div>

        <div className="ml-auto pr-3 flex items-center gap-2">
          <button
            onClick={() => alert("Quiz suspended (UI only).")}
            className="inline-flex items-center gap-2 px-3 py-1 rounded border hover:bg-black/5"
            title="Suspend"
          >
            <PauseCircle className="size-4" />
            <span className="hidden sm:inline">Suspend</span>
          </button>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to end this block?")) {
                window.location.href = "/year4";
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white hover:brightness-95"
            title="End Block"
          >
            <Octagon className="size-4" />
            <span className="hidden sm:inline">End Block</span>
          </button>
        </div>
      </div>
    </div>
  );
}

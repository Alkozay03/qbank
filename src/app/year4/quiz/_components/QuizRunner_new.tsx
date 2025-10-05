"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { initHighlight, type HLColor } from "../_utils/highlight";

type Choice = { id: string; text: string; isCorrect: boolean };
type Question = { id: string; customId?: number | null; stem: string; explanation?: string | null; objective?: string | null; choices: Choice[]; tags?: { type: 'SUBJECT'|'SYSTEM'|'TOPIC'|'ROTATION'|'RESOURCE'|'MODE'; value: string }[] };
type Item = {
  id: string;
  order: number | null;
  marked: boolean;
  question: Question;
  responses: { choiceId: string | null; isCorrect: boolean | null }[];
};
type InitialQuiz = {
  id: string;
  status: "Active" | "Suspended" | "Ended";
  items: Item[];
};

const TOP_H = 56;
const BOTTOM_H = 56;

export default function QuizRunner({ initialQuiz }: { initialQuiz: InitialQuiz }) {
  const [items, setItems] = useState<Item[]>(initialQuiz.items);
  const [curIndex, setCurIndex] = useState(0);

  // Sidebar visual width (narrower)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = sidebarOpen ? "7rem" : "0rem";

  // Text scale (only text grows/shrinks)
  const [fontScale, setFontScale] = useState(1);
  const incFont = () => setFontScale((v) => Math.min(1.4, Number((v + 0.1).toFixed(2))));
  const decFont = () => setFontScale((v) => Math.max(0.8, Number((v - 0.1).toFixed(2))));
  const resetFont = () => setFontScale(1);

  // Highlighter
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HLColor>("yellow");
  const paletteRef = useRef<HTMLDivElement | null>(null);
  
  // Section refs for highlighting
  const stemRef = useRef<HTMLDivElement | null>(null);
  const explRef = useRef<HTMLDivElement | null>(null);
  const objRef = useRef<HTMLDivElement | null>(null);

  // Current item & total
  const currentItem = items[curIndex];
  const total = items.length;
  const isAnswered = Boolean(currentItem?.responses?.[0]?.choiceId);

  // Close highlighter palette on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!paletteRef.current) return;
      if (paletteRef.current.contains(e.target as Node)) return;
      setShowHighlighter(false);
    }
    if (showHighlighter) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showHighlighter]);

  // Mount highlighter for question/explanation/objective only
  useEffect(() => {
    const dispose = initHighlight({
      roots: [stemRef.current, explRef.current, objRef.current],
      getColor: () => (showHighlighter ? highlightColor : null),
    });
    return dispose;
  }, [showHighlighter, highlightColor]);

  // Simple quiz functions
  async function markQuestion(marked: boolean) {
    if (!currentItem) return;
    const updatedItems = items.map((item) =>
      item.id === currentItem.id ? { ...item, marked } : item
    );
    setItems(updatedItems);
  }

  async function answerQuestion(choiceId: string) {
    if (!currentItem) return;
    const choice = currentItem.question.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const updatedItems = items.map((item) =>
      item.id === currentItem.id
        ? {
            ...item,
            responses: [{ choiceId: choice.id, isCorrect: choice.isCorrect }],
          }
        : item
    );
    setItems(updatedItems);
  }

  function BarIconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
    return (
      <button
        onClick={onClick}
        title={title}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-accent transition"
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-background text-foreground"
      style={{ "--sbw": sidebarWidth } as React.CSSProperties}
    >
      {/* SIDEBAR (narrow) */}
      <aside
        className={[
          "fixed left-0 top-0 bottom-0 z-40",
          "bg-card border-r border-border overflow-hidden",
          "transition-[width] duration-300 ease-in-out",
        ].join(" ")}
        style={{ width: sidebarWidth }}
      >
        <div className="h-full flex flex-col">
          <div className="px-3 py-4 border-b border-border">
            <div className="text-sm font-bold text-primary">Questions</div>
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-auto">
            {items.map((item, idx) => {
              const answered = Boolean(item.responses?.[0]?.choiceId);
              const correct = answered && item.responses[0]?.isCorrect;
              const isCurrent = idx === curIndex;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurIndex(idx)}
                  className={[
                    "w-full text-left rounded-lg p-2 text-sm transition",
                    isCurrent
                      ? "bg-[#2F6F8F] text-white"
                      : answered
                      ? correct
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                      : "text-[#2F6F8F] hover:bg-[#F3F9FC]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span>Q{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      {item.marked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 2v20H4V2h2Zm2 2h9.5l-2.2 3 2.2 3H8V4Z" fill="#e11d48"/>
                        </svg>
                      )}
                      {answered && (
                        <div
                          className={[
                            "w-2 h-2 rounded-full",
                            correct ? "bg-green-500" : "bg-red-500",
                          ].join(" ")}
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* TOP BAR */}
      <header
        className={[
          "fixed left-0 right-0 top-0 z-30 border-b bg-accent backdrop-blur",
          "border-border h-14",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ paddingLeft: `var(--sbw)` }}
      >
        <div className="flex h-full items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <BarIconBtn title="Toggle sidebar" onClick={() => setSidebarOpen((v) => !v)}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <rect x="3" y="5" width="14" height="2" rx="1" />
                <rect x="3" y="9" width="14" height="2" rx="1" />
                <rect x="3" y="13" width="14" height="2" rx="1" />
              </svg>
            </BarIconBtn>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-[#2F6F8F]">
                Question {curIndex + 1} of {total}
              </div>
              <div className="text-[11px] text-[#2F6F8F]/80">
                ID: {currentItem?.question?.customId ?? '—'}
              </div>
            </div>

            <label className="ml-2 inline-flex items-center gap-2 rounded-xl bg-card px-2 py-1 border border-border">
              <input 
                type="checkbox" 
                checked={Boolean(currentItem?.marked)} 
                onChange={(e) => markQuestion(e.target.checked)} 
              />
              <span className="inline-flex items-center gap-1 text-sm text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#e11d48" d="M6 2v20H4V2h2Zm2 2h9.5l-2.2 3 2.2 3H8V4Z"/>
                </svg>
                Mark
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <BarIconBtn title="Previous" onClick={() => setCurIndex((i) => Math.max(0, i - 1))}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12.5 5l-5 5 5 5" />
              </svg>
            </BarIconBtn>
            <BarIconBtn title="Next" onClick={() => setCurIndex((i) => Math.min(total - 1, i + 1))}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.5 5l5 5-5 5" />
              </svg>
            </BarIconBtn>
          </div>

          <div className="relative flex items-center gap-1" ref={paletteRef}>
            {/* Highlighter */}
            <BarIconBtn
              title="Highlighter"
              onClick={() => setShowHighlighter((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 14l-1 3 3-1 9-9-2-2-9 9zM14 3l3 3" />
              </svg>
            </BarIconBtn>
            
            {showHighlighter && (
              <div className="absolute right-0 top-12 z-40 rounded-2xl border border-border bg-card p-2 shadow">
                <div className="flex items-center gap-2">
                  {[
                    { c: "red" as HLColor, n: "red", hex: "#e11d48" },
                    { c: "green" as HLColor, n: "green", hex: "#16a34a" },
                    { c: "blue" as HLColor, n: "blue", hex: "#56A2CD" },
                    { c: "yellow" as HLColor, n: "yellow", hex: "#ffe066" },
                  ].map((k) => (
                    <button
                      key={k.n}
                      onClick={() => setHighlightColor(k.c)}
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ 
                        backgroundColor: k.hex, 
                        outline: highlightColor === k.c ? "2px solid #A5CDE4" : "none" 
                      }}
                      title={k.n}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Select text in the question / explanation / objective. Release to apply.
                  <br/>Alt+Click a highlight to remove it.
                </div>
              </div>
            )}

            {/* Text size controls */}
            <div className="ml-1 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button 
                onClick={decFont} 
                className="rounded-lg px-2 py-1 text-[#2F6F8F] hover:bg-[#F3F9FC]" 
                title="Smaller"
              >
                −
              </button>
              <button 
                onClick={resetFont} 
                className="rounded-lg px-2 py-1 text-[#2F6F8F] hover:bg-[#F3F9FC]" 
                title="Reset"
              >
                A
              </button>
              <button 
                onClick={incFont} 
                className="rounded-lg px-2 py-1 text-[#2F6F8F] hover:bg-[#F3F9FC]" 
                title="Larger"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main
        className={[
          "absolute left-0 right-0 overflow-auto",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ top: `${TOP_H}px`, bottom: `${BOTTOM_H}px`, paddingLeft: `var(--sbw)` }}
      >
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="quiz-question rounded-2xl border border-border bg-card p-5">
            <div
              ref={stemRef}
              data-section="stem"
              className="prose prose-sm max-w-prose leading-relaxed text-neutral-900"
              style={{ fontSize: `${fontScale}rem` }}
              dangerouslySetInnerHTML={{
                __html: currentItem?.question.stem ?? ""
              }}
            />
          </div>

          <div className="mt-4 space-y-2">
            {currentItem?.question.choices.map((choice, idx) => (
              <button
                key={choice.id}
                onClick={() => answerQuestion(choice.id)}
                className={[
                  "w-full rounded-xl border-2 p-4 text-left transition",
                  isAnswered
                    ? choice.isCorrect
                      ? "border-green-400 bg-green-50 text-green-800"
                      : currentItem.responses[0]?.choiceId === choice.id
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-muted bg-muted text-muted-foreground"
                    : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
                ].join(" ")}
                disabled={isAnswered}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-sm font-medium">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div 
                    className="flex-1"
                    style={{ fontSize: `${fontScale}rem` }}
                    dangerouslySetInnerHTML={{ __html: choice.text }}
                  />
                </div>
              </button>
            ))}
          </div>

          {isAnswered && (
            <>
              <div className="quiz-explanation mt-6 rounded-2xl border border-[#E6F0F7] bg-white p-5">
                <div className="text-lg font-bold text-primary">Explanation:</div>
                <div
                  ref={explRef}
                  data-section="explanation"
                  className="prose prose-sm mt-2 max-w-prose text-neutral-900"
                  style={{ fontSize: `${fontScale}rem` }}
                  dangerouslySetInnerHTML={{
                    __html: currentItem?.question.explanation ?? 
                            "<div class='text-sm text-muted-foreground'>No explanation provided.</div>"
                  }}
                />
              </div>

              <div className="quiz-objective mt-6 rounded-2xl border border-[#E6F0F7] bg-white p-5">
                <div className="text-lg font-bold text-[#2F6F8F]">Educational Objective:</div>
                <div
                  ref={objRef}
                  data-section="objective"
                  className="prose prose-sm mt-2 max-w-prose text-neutral-900"
                  style={{ fontSize: `${fontScale}rem` }}
                  dangerouslySetInnerHTML={{
                    __html: currentItem?.question.objective ?? 
                            "This section summarizes the key takeaway for rapid review."
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* BOTTOM BAR */}
      <footer
        className={[
          "fixed left-0 right-0 bottom-0 z-30 border-t bg-[#E6F0F7] backdrop-blur",
          "border-[#E6F0F7] h-14",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ paddingLeft: `var(--sbw)` }}
      >
        <div className="flex h-full items-center justify-between px-3">
          <div className="text-sm text-[#2F6F8F]">
            {isAnswered ? "Question answered" : "Select an answer"}
          </div>
          
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]">
              End Block
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

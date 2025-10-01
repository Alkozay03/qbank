"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

type Choice = { id: string; text: string; isCorrect: boolean };
type Question = { id: string; stem: string; explanation?: string | null; choices: Choice[] };
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
const DEFAULT_OBJECTIVE = "This section summarizes the key takeaway for rapid review.";

/** Persisted HTML (with highlights) per item and section */
type SectionHTML = { stem: string; explanation: string; objective: string };

export default function QuizRunner({ initialQuiz }: { initialQuiz: InitialQuiz }) {
  const [id] = useState(initialQuiz.id);
  const [items, setItems] = useState<Item[]>(initialQuiz.items);
  const [curIndex, setCurIndex] = useState(0);
  const [status, setStatus] = useState<"Active" | "Suspended" | "Ended">(initialQuiz.status);

  // Sidebar (narrower)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = sidebarOpen ? "7rem" : "0rem";

  // Portal root
  const portalRoot = useMemo(() => {
    if (typeof window === "undefined") return "/years";
    const seg = window.location.pathname.split("/")[1] || "years";
    return `/${seg}`;
  }, []);

  // Text scale
  const [fontScale, setFontScale] = useState(1);
  const incFont = () => setFontScale((v) => Math.min(1.4, Number((v + 0.1).toFixed(2))));
  const decFont = () => setFontScale((v) => Math.max(0.8, Number((v - 0.1).toFixed(2))));
  const resetFont = () => setFontScale(1);

  // Highlighter
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [highlightColor, setHighlightColor] = useState<string>("#ffe066");
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  // Avoid “create then instantly remove” mark on click
  const lastMarkInsertAtRef = useRef<number>(0);
  const SUPPRESS_CLICK_MS = 250;

  // Calculator / Labs / Fullscreen
  const [showCalc, setShowCalc] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackToast, setFeedbackToast] = useState(false);

  // Confirmations
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Timers
  const [blockSeconds, setBlockSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const tickRef = useRef<number | null>(null);
  const qTickRef = useRef<number | null>(null);

  // Answers
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [crossed, setCrossed] = useState<Record<string, boolean>>({});

  // Persisted HTML with marks per item
  const [sectionHTMLByItem, setSectionHTMLByItem] = useState<Record<string, SectionHTML>>({});

  const currentItem = items[curIndex];
  const total = items.length;
  const isAnswered = Boolean(currentItem?.responses?.[0]?.choiceId);

  // Initialize persisted sections for current item
  useEffect(() => {
    if (!currentItem) return;
    setSectionHTMLByItem((prev) => {
      if (prev[currentItem.id]) return prev;
      return {
        ...prev,
        [currentItem.id]: {
          stem: toHTML(currentItem.question.stem ?? ""),
          explanation:
            toHTML(currentItem.question.explanation ?? "") ||
            "<div class='text-sm text-slate-500'>No explanation provided.</div>",
          objective: toHTML(DEFAULT_OBJECTIVE),
        },
      };
    });
  }, [currentItem]);

  // Close palette on outside *click* — keep highlighter enabled
  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!paletteRef.current) return;
      const target = ev.target as Node;
      if (paletteRef.current.contains(target)) return;
      setShowHighlighter(false);
    }
    if (showHighlighter) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showHighlighter]);

  // Timers when active & not answered
  useEffect(() => {
    const run = status === "Active" && currentItem && !isAnswered;
    if (run) {
      tickRef.current = window.setInterval(() => setBlockSeconds((s) => s + 1), 1000) as unknown as number;
      qTickRef.current = window.setInterval(() => setQuestionSeconds((s) => s + 1), 1000) as unknown as number;
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (qTickRef.current) window.clearInterval(qTickRef.current);
      tickRef.current = null;
      qTickRef.current = null;
    };
  }, [curIndex, status, isAnswered, currentItem]);

  // Reset per-question state
  useEffect(() => {
    setQuestionSeconds(0);
    setSelectedChoiceId(null);
    setCrossed({});
  }, [curIndex]);

  const fmtHMS = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Flag
  async function toggleFlag(marked: boolean) {
    if (!currentItem) return;
    try {
      await fetch(`/api/quiz/${id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizItemId: currentItem.id, marked }),
      });
      setItems((prev) => prev.map((it) => (it.id === currentItem.id ? { ...it, marked } : it)));
    } catch {
      /* no-op */
    }
  }

  // Submit answer
  async function submitAnswer() {
    if (!currentItem || !selectedChoiceId) return;
    const localCorrect =
      currentItem.question.choices.find((c) => c.id === selectedChoiceId)?.isCorrect ?? null;
    try {
      const res = await fetch(`/api/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizItemId: currentItem.id, choiceId: selectedChoiceId, timeSeconds: questionSeconds }),
      });
      const data = (await res.json().catch(() => ({}))) as { isCorrect?: boolean };

      if (tickRef.current) window.clearInterval(tickRef.current);
      if (qTickRef.current) window.clearInterval(qTickRef.current);
      tickRef.current = null;
      qTickRef.current = null;

      const finalCorrect =
        typeof data?.isCorrect === "boolean" ? data.isCorrect : localCorrect;
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? { ...it, responses: [{ choiceId: selectedChoiceId, isCorrect: Boolean(finalCorrect) }] }
            : it
        )
      );
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? { ...it, responses: [{ choiceId: selectedChoiceId, isCorrect: Boolean(localCorrect) }] }
            : it
        )
      );
    }
  }

  async function endQuiz() {
    try {
      await fetch(`/api/quiz/${id}/end`, { method: "POST" });
      setStatus("Ended");
    } finally {
      setConfirmEnd(false);
      window.location.href = portalRoot;
    }
  }

  async function suspendQuiz() {
    try {
      await fetch(`/api/quiz/${id}/suspend`, { method: "POST" });
      setStatus("Suspended");
    } finally {
      setConfirmSuspend(false);
      window.location.href = portalRoot;
    }
  }

  async function sendFeedback() {
    try {
      await fetch(`/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          questionId: currentItem?.question.id ?? null,
          text: feedbackText.trim(),
        }),
      });
      setFeedbackText("");
      setShowFeedback(false);
      setFeedbackToast(true);
      setTimeout(() => setFeedbackToast(false), 2500);
    } catch {
      /* no-op */
    }
  }

  // ---------- Highlighting (persist across renders) ----------

  // Section lookup using closest() – robust & avoids wrapping titles
  const SECTION_Q = '[data-section="stem"],[data-section="explanation"],[data-section="objective"]';

  const findSection = (node: Node | null): { el: HTMLElement; key: keyof SectionHTML } | null => {
    if (!node) return null;

    let el: Element | null = null;

    if (node instanceof Element) {
      // If we clicked an element, search from it
      el = node.closest(SECTION_Q);
    } else if (node instanceof Text) {
      // If it's a text node, use its parent *element*
      const p = node.parentNode;
      el = p instanceof Element ? p.closest(SECTION_Q) : null;
    } else {
      // Any other node type: attempt parentNode ? closest
      const p = (node as Element)?.parentNode ?? null;
      el = p instanceof Element ? p.closest(SECTION_Q) : null;
    }

    if (!el) return null;
    const section = el.getAttribute("data-section");
    if (section === "stem" || section === "explanation" || section === "objective") {
      return { el: el as HTMLElement, key: section as keyof SectionHTML };
    }
    return null;
  };


  const isInsideAllowed = useCallback((node: Node | null) => Boolean(findSection(node)), []);

  const saveSectionHTML = useCallback(
    (sectionEl: Element, sectionKey: keyof SectionHTML) => {
      if (!currentItem) return;
      const html = (sectionEl as HTMLElement).innerHTML;
      setSectionHTMLByItem((prev) => ({
        ...prev,
        [currentItem.id]: {
          ...(prev[currentItem.id] ?? { stem: "", explanation: "", objective: "" }),
          [sectionKey]: html,
        },
      }));
    },
    [currentItem]
  );

  // Helpers to flatten/merge highlights (avoid stacked layers & spacing)
  const isHL = (n: Node | null): n is HTMLElement =>
    !!n &&
    n.nodeType === Node.ELEMENT_NODE &&
    (n as HTMLElement).tagName.toLowerCase() === "mark" &&
    (n as HTMLElement).getAttribute("data-qa") === "highlight";

  const skipEmptyText = (n: Node | null, backwards = false): Node | null => {
    while (n && n.nodeType === Node.TEXT_NODE && !(n as Text).nodeValue?.trim()) {
      n = backwards ? n.previousSibling : n.nextSibling;
    }
    return n;
  };

  const unwrap = (el: HTMLElement) => {
    const p = el.parentNode;
    if (!p) return;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  };

  const mergeWithNeighbors = useCallback((markEl: HTMLElement) => {
    const targetColor = window.getComputedStyle(markEl).backgroundColor;

    // Merge with previous if same color
    const prev = skipEmptyText(markEl.previousSibling, true);
    if (prev && isHL(prev) && window.getComputedStyle(prev).backgroundColor === targetColor) {
      while (markEl.firstChild) prev.appendChild(markEl.firstChild);
      markEl.remove();
      markEl = prev;
    }

    // Merge forward with any following same-color marks
    let next = skipEmptyText(markEl.nextSibling, false);
    while (next && isHL(next) && window.getComputedStyle(next).backgroundColor === targetColor) {
      const nextEl = next as HTMLElement;
      while (nextEl.firstChild) markEl.appendChild(nextEl.firstChild);
      const after = nextEl.nextSibling;
      nextEl.remove();
      next = skipEmptyText(after, false);
    }

    return markEl;
  }, []);

  const normalizeInsertedMark = useCallback((markEl: HTMLElement) => {
    // Remove any nested highlight marks INSIDE this mark (outer color wins)
    const inner = Array.from(markEl.querySelectorAll('mark[data-qa="highlight"]')) as HTMLElement[];
    inner.forEach((im) => unwrap(im));

    // Merge with adjacent same-color marks
    return mergeWithNeighbors(markEl);
  }, [mergeWithNeighbors]);

  const normalizeSectionHighlights = useCallback((sectionEl: Element) => {
    // Remove nested highlights anywhere in this section
    const nested = Array.from(
      sectionEl.querySelectorAll('mark[data-qa="highlight"] mark[data-qa="highlight"]')
    ) as HTMLElement[];
    nested.forEach((n) => unwrap(n));

    // Merge neighbors for all marks
    const marks = Array.from(sectionEl.querySelectorAll('mark[data-qa="highlight"]')) as HTMLElement[];
    marks.forEach((m) => mergeWithNeighbors(m));
  }, [mergeWithNeighbors]);

  const applyHighlight = useCallback(() => {
    if (!highlightEnabled) return;

    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    if (!isInsideAllowed(range.commonAncestorContainer)) return;

    const mark = document.createElement("mark");
    mark.style.backgroundColor = highlightColor;
    mark.style.padding = "0"; // no gaps within words
    mark.style.margin = "0";
    mark.style.borderRadius = "2px";
    (mark.style as CSSStyleDeclaration & {boxDecorationBreak?: string}).boxDecorationBreak = "clone";
    (mark.style as CSSStyleDeclaration & {WebkitBoxDecorationBreak?: string}).WebkitBoxDecorationBreak = "clone";
    mark.setAttribute("data-qa", "highlight");

    let sectionInfo: { el: Element; key: keyof SectionHTML } | null = null;

    try {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
      sel.removeAllRanges();

      if (mark.isConnected) {
        normalizeInsertedMark(mark);
        sectionInfo = findSection(mark) ?? findSection(range.commonAncestorContainer);
      }
    } catch {
      document.execCommand(
        "insertHTML",
        false,
        `<mark data-qa="highlight" style="background:${highlightColor};padding:0;margin:0;border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone;">${sel.toString()}</mark>`
      );
      sel.removeAllRanges();

      sectionInfo = findSection(range.commonAncestorContainer);
      if (sectionInfo) normalizeSectionHighlights(sectionInfo.el);
    }

    if (!sectionInfo) sectionInfo = findSection(range.commonAncestorContainer);
    if (sectionInfo) saveSectionHTML(sectionInfo.el, sectionInfo.key);

    lastMarkInsertAtRef.current = Date.now();
  }, [highlightEnabled, highlightColor, isInsideAllowed, saveSectionHTML, normalizeInsertedMark, normalizeSectionHighlights]);

  // Touch devices
  const onTouchEndHighlight = useCallback(() => {
    setTimeout(() => applyHighlight(), 0);
  }, [applyHighlight]);

  // Click a mark to remove it
  useEffect(() => {
    function onClick(ev: Event) {
      const t = ev.target as HTMLElement; // plain click removes highlight
      if (t?.getAttribute?.("data-qa") === "highlight") {
        const now = Date.now();
        if (now - lastMarkInsertAtRef.current < SUPPRESS_CLICK_MS) return;

        const info = findSection(t);
        const p = t.parentNode;
        if (!p) return;
        while (t.firstChild) p.insertBefore(t.firstChild, t);
        p.removeChild(t);

        if (info) saveSectionHTML(info.el, info.key);
      }
    }
    const rootEl: Document | HTMLElement = mainRef.current ?? document;
    (rootEl as EventTarget).addEventListener("click", onClick as EventListener);
    return () => (rootEl as EventTarget).removeEventListener("click", onClick as EventListener);
  }, [saveSectionHTML]);

  function BarIconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
    return (
      <button
        onClick={onClick}
        title={title}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#2F6F8F] hover:bg-white/70 transition"
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-neutral-50"
      style={{ ["--sbw" as unknown as string]: sidebarWidth }}
    >
      {/* LEFT SIDEBAR */}
      <aside
        className={[
          "fixed z-60 border-r bg-white border-[#E6F0F7]",
          "left-0 overflow-hidden",
          "transition-[width] duration-300 ease-in-out will-change-[width]"
        ].join(" ")}
        style={{ width: sidebarWidth, top: 0, bottom: 0 }}
      >
        <div className="h-full overflow-auto">
          <div className="flex flex-col">
            {items.map((it, i) => {
              const _answered = Boolean(it.responses?.[0]?.choiceId);
              const _correct = it.responses?.[0]?.isCorrect ?? false;
              const even = i % 2 === 0;
              return (
                <button
                  key={it.id}
                  onClick={() => setCurIndex(i)}
                  className={[
                    "relative flex items-center justify-between px-3 py-2 text-sm font-semibold",
                    even ? "bg-white" : "bg-[#F3F9FC]",
                    "text-[#2F6F8F]",
                    i === curIndex ? "ring-2 ring-[#A5CDE4] z-10" : ""
                  ].join(" ")}
                  title={`Question ${i + 1}`}
                >
                  <span className="text-base">{i + 1}</span>
                  <span className="ml-auto inline-flex items-center gap-2">
                    {it.marked && (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-label="Flagged">
                        <path fill="#e11d48" d="M6 2v20H4V2h2Zm2 2h9.5l-2.2 3 2.2 3H8V4Z"/>
                      </svg>
                    )}
                    {_answered && (
                      <span className="text-lg font-extrabold" style={{ color: _correct ? "#16a34a" : "#e11d48" }}>
                        {_correct ? "?" : "×"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* TOP BAR */}
      <header
        className={[
          "fixed left-0 right-0 top-0 z-30 border-b bg-white backdrop-blur",
          "border-[#E6F0F7] h-16",
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

            <div className="text-sm font-semibold text-[#2F6F8F]">
              Question {curIndex + 1} of {total}
            </div>

            <label className="ml-2 inline-flex items-center gap-2 rounded-xl bg-white px-2 py-1 border border-[#A5CDE4]">
              <input type="checkbox" checked={Boolean(currentItem?.marked)} onChange={(e) => toggleFlag(e.target.checked)} />
              <span className="inline-flex items-center gap-1 text-sm text-[#2F6F8F]">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e11d48" d="M6 2v20H4V2h2Zm2 2h9.5l-2.2 3 2.2 3H8V4Z"/></svg>
                Mark
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <BarIconBtn title="Previous" onClick={() => setCurIndex((i) => Math.max(0, i - 1))}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M12.5 5l-5 5 5 5" /></svg>
            </BarIconBtn>
            <BarIconBtn title="Next" onClick={() => setCurIndex((i) => Math.min(total - 1, i + 1))}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M7.5 5l5 5-5 5" /></svg>
            </BarIconBtn>
          </div>

          <div className="relative flex items-center gap-1" ref={paletteRef}>
            {/* Highlighter */}
            <BarIconBtn
              title="Highlighter"
              onClick={() => {
                const next = !showHighlighter;
                setShowHighlighter(next);
                setHighlightEnabled(next);
              }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 14l-1 3 3-1 9-9-2-2-9 9zM14 3l3 3" />
              </svg>
            </BarIconBtn>
            {showHighlighter && (
              <div className="absolute right-0 top-12 z-40 rounded-2xl border border-[#E6F0F7] bg-white p-2 shadow">
                <div className="flex items-center gap-2">
                  {[
                    { c: "#e11d48", n: "red" },
                    { c: "#16a34a", n: "green" },
                    { c: "#56A2CD", n: "blue" },
                    { c: "#ffe066", n: "yellow" },
                  ].map((k) => (
                    <button
                      key={k.n}
                      onClick={() => setHighlightColor(k.c)}
                      className="h-6 w-6 rounded-full border border-[#E6F0F7]"
                      style={{ backgroundColor: k.c, outline: highlightColor === k.c ? "2px solid #A5CDE4" : "none" }}
                      title={k.n}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Select text in the question / explanation / objective. Release to apply.
                </div>
              </div>
            )}

            {/* Text size (bigger controls + new reset icon) */}
            <div className="ml-1 inline-flex items-center gap-1 rounded-xl border border-[#A5CDE4] bg-white p-1">
              <button
                onClick={decFont}
                className="rounded-lg px-3 py-2 text-xl leading-none text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Smaller"
              >
                -
              </button>

              <button
                onClick={resetFont}
                className="rounded-lg px-2 py-1 text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Reset to default"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 20 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <text x="-1" y="20" fontSize="14" fontFamily="sans-serif">A</text>
                  <text x="8" y="20" fontSize="20" fontFamily="sans-serif">A</text>
                  
                </svg>
              </button>

              <button
                onClick={incFont}
                className="rounded-lg px-3 py-2 text-xl leading-none text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Larger"
              >
                +
              </button>
            </div>

            {/* Fullscreen */}
            <BarIconBtn
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.();
                  setIsFullscreen(true);
                } else {
                  document.exitFullscreen?.();
                  setIsFullscreen(false);
                }
              }}
            >
              {isFullscreen ? (
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3H3v4h2V5h2V3zm8 0h-4v2h2v2h2V3zM3 17h4v-2H5v-2H3v4zm14-4h-2v2h-2v2h4v-4z" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h4v2H5v2H3V3zm14 0v4h-2V5h-2V3h4zM3 17v-4h2v2h2v2H3zm14-4h2v4h-4v-2h2v-2z" /></svg>
              )}
            </BarIconBtn>

            {/* Calculator */}
            <BarIconBtn title="Calculator" onClick={() => setShowCalc(true)}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
                <rect x="4" y="3" width="12" height="14" rx="2" />
                <rect x="6" y="6" width="8" height="3" rx="1" fill="white" />
                <circle cx="7.5" cy="12" r="1.2" fill="white" />
                <circle cx="10" cy="12" r="1.2" fill="white" />
                <circle cx="12.5" cy="12" r="1.2" fill="white" />
                <rect x="9" y="13.5" width="6" height="2" rx="1" fill="white" />
              </svg>
            </BarIconBtn>

            {/* Lab values */}
            <BarIconBtn title="Lab Values" onClick={() => setShowLabs(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M10 3v5.5L5.2 17.4A3 3 0 0 0 7.9 22h8.2a3 3 0 0 0 2.7-4.6L14 8.5V3h-4Zm2 10.5 4.1 7H7.9l4.1-7Z"/>
              </svg>
            </BarIconBtn>
          </div>
        </div>
      </header>

      {/* BOTTOM BAR */}
      <footer
        className={[
          "fixed bottom-0 left-0 right-0 z-30 border-t bg-white backdrop-blur",
          "border-[#E6F0F7] h-16",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ paddingLeft: `var(--sbw)` }}
      >
        <div className="flex h-full items-center justify-between px-3">
          <div className="text-sm font-semibold text-[#2F6F8F]">
            Block Elapsed Time: <span className="tabular-nums">{fmtHMS(blockSeconds)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center justify-center rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]"
              title="Send feedback"
            >
              Feedback
            </button>

            <button
              onClick={() => setConfirmSuspend(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]"
              title="Suspend"
            >
              <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="22" fill="#A5CDE4" stroke="#2F6F8F" strokeWidth="3"/>
                <rect x="18" y="14" width="5" height="20" rx="2" fill="#2F6F8F"/>
                <rect x="25" y="14" width="5" height="20" rx="2" fill="#2F6F8F"/>
              </svg>
              Suspend
            </button>

            <button
              onClick={() => setConfirmEnd(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3D1D6] bg-white px-3 py-2 text-[#e11d48] hover:bg-[#FFF5F6]"
              title="End block"
            >
              <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true">
                <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="#e11d48" stroke="#b91c1c" strokeWidth="3"/>
              </svg>
              End Block
            </button>
          </div>
        </div>
      </footer>

      {/* MAIN CONTENT */}
      <main
        ref={mainRef}
        onMouseUpCapture={applyHighlight}
        onTouchEnd={onTouchEndHighlight}
        className={[
          "absolute left-0 right-0 overflow-auto",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ top: `${TOP_H}px`, bottom: `${BOTTOM_H}px`, paddingLeft: `var(--sbw)` }}
      >
        <div className="mx-auto max-w-4xl px-4 py-6" style={{ paddingBottom: `${BOTTOM_H + 48}px` }}>
          <div className="quiz-question rounded-2xl border border-[#E6F0F7] bg-white p-5">
            <div
              data-section="stem"
              className="text-[15px] leading-relaxed text-neutral-900"
              style={{ fontSize: `${fontScale}rem` }}
              dangerouslySetInnerHTML={{
                __html:
                  sectionHTMLByItem[currentItem?.id ?? ""]?.stem ??
                  toHTML(currentItem?.question.stem ?? "")
              }}
            />
          </div>

          <div className="mt-4 space-y-2">
            {currentItem?.question.choices.map((ch, idx) => (
              <AnswerRow
                key={ch.id}
                choice={ch}
                index={idx}
                submittedId={currentItem?.responses?.[0]?.choiceId ?? null}
                submitted={Boolean(currentItem?.responses?.[0]?.choiceId)}
                selectedId={selectedChoiceId}
                crossed={!!crossed[ch.id]}
                status={status}
                fontScale={fontScale}
                onSelect={() => {
                  if (currentItem?.responses?.[0]?.choiceId || status !== "Active" || crossed[ch.id]) return;
                  setSelectedChoiceId((prev) => (prev === ch.id ? null : ch.id));
                }}
                onCross={() => {
                  if (currentItem?.responses?.[0]?.choiceId) return;
                  setCrossed((m) => ({ ...m, [ch.id]: !m[ch.id] }));
                  if (selectedChoiceId === ch.id) setSelectedChoiceId(null);
                }}
              />
            ))}
          </div>

          {!isAnswered && status === "Active" && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={submitAnswer}
                disabled={!selectedChoiceId}
                className="rounded-2xl px-6 py-2 font-semibold text-white bg-[#2F6F8F] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow"
              >
                Submit Answer
              </button>
            </div>
          )}

          {(() => {
            if (!currentItem || !isAnswered) return null;
            const wasCorrect = currentItem.responses?.[0]?.isCorrect ?? null;
            return (
              <div className="mt-5 rounded-2xl border bg-white p-4" style={{ borderColor: wasCorrect ? "#CDEFE1" : "#F3D1D6" }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center justify-center rounded-xl bg-white p-3">
                    <span className="text-lg font-extrabold" style={{ color: wasCorrect ? "#16a34a" : "#e11d48" }}>
                      {wasCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-[#2F6F8F]">—%</div>
                      <div className="text-xs leading-tight text-slate-500">Answered<br/>Correctly</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-extrabold text-[#2F6F8F]">
                        {Math.floor(questionSeconds / 60)} Mins, {questionSeconds % 60} Secs
                      </div>
                      <div className="text-xs text-slate-500">Time Spent on Question</div>
                    </div>
                  </div>
                </div>

                <div className="quiz-explanation mt-6">
                  <div className="text-lg font-bold text-[#2F6F8F]">Explanation:</div>
                  <div
                    data-section="explanation"
                    className="prose mt-2 max-w-none text-neutral-900"
                    style={{ fontSize: `${fontScale}rem` }}
                    dangerouslySetInnerHTML={{
                      __html:
                        sectionHTMLByItem[currentItem.id]?.explanation ??
                        (currentItem?.question.explanation
                          ? toHTML(currentItem.question.explanation)
                          : "<div class='text-sm text-slate-500'>No explanation provided.</div>")
                    }}
                  />
                </div>

                <div className="quiz-objective mt-6" style={{ fontSize: `${fontScale}rem` }}>
                  <div className="text-lg font-bold text-[#2F6F8F]">Educational Objective:</div>
                  <div
                    data-section="objective"
                    className="mt-2 text-neutral-900"
                    dangerouslySetInnerHTML={{
                      __html: sectionHTMLByItem[currentItem.id]?.objective ?? toHTML(DEFAULT_OBJECTIVE)
                    }}
                  />
                </div>

                <div className="mt-6">
                  <div className="text-lg font-bold text-[#2F6F8F]">References :</div>
                  <ul className="mt-2 list-inside list-disc text-neutral-900">
                    <li><span className="text-slate-600">Add reference links here.</span></li>
                  </ul>
                </div>

                <div className="mt-6 border-t border-[#E6F0F7] pt-3">
                  <div className="flex flex-wrap gap-6 text-sm">
                    {["Subject/Discipline","System","Topic","Rotation","Resource"].map((t)=>(
                      <div key={t}>
                        <div className="text-[#2F6F8F] font-semibold">{t}</div>
                        <div className="mt-1 text-neutral-900">—</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      {showCalc && <DraggableCalc onClose={() => setShowCalc(false)} />}
      {showLabs && <LabDrawer onClose={() => setShowLabs(false)} />}

      {/* Feedback modal */}
      {showFeedback && (
        <Modal onClose={() => setShowFeedback(false)} title="Submit Feedback">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Describe the issue or suggestion…"
            className="mt-3 h-32 w-full rounded-xl border border-[#E6F0F7] p-3 outline-none focus:ring-2 focus:ring-[#A5CDE4] text-neutral-900"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowFeedback(false)} className="rounded-xl border border-[#E6F0F7] bg-white px-4 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]">Cancel</button>
            <button onClick={sendFeedback} disabled={!feedbackText.trim()} className="rounded-xl bg-[#2F6F8F] px-4 py-2 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed">Submit</button>
          </div>
        </Modal>
      )}

      {feedbackToast && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#2F6F8F] px-6 py-3 text-white shadow-lg">
          Feedback Submitted!
        </div>
      )}

      {/* Suspend confirm */}
      {confirmSuspend && (
        <Modal onClose={() => setConfirmSuspend(false)} title="Suspend Test Block">
          <p className="text-neutral-800">You are about to suspend this test block, you can always return back to it later on.</p>
          <p className="mt-2 text-neutral-800">Are you sure you want to suspend the test block?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmSuspend(false)} className="rounded-xl border border-[#E6F0F7] bg-white px-4 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]">Cancel</button>
            <button onClick={suspendQuiz} className="rounded-xl bg-[#2F6F8F] px-4 py-2 font-semibold text-white">Confirm</button>
          </div>
        </Modal>
      )}

      {/* End confirm */}
      {confirmEnd && (
        <Modal onClose={() => setConfirmEnd(false)} title="End Test Block">
          <p className="text-neutral-800">You are about to end this test block.</p>
          <p className="mt-2 text-neutral-800">Are you sure you want to end the test block?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmEnd(false)} className="rounded-xl border border-[#E6F0F7] bg-white px-4 py-2 text-[#2F6F8F] hover:bg-[#F3F9FC]">Cancel</button>
            <button onClick={endQuiz} className="rounded-xl px-4 py-2 font-semibold text-white" style={{ background: "#e11d48" }}>Confirm</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

const AnswerRow = memo(function AnswerRow({
  choice, index, submittedId, submitted, selectedId, crossed, status, fontScale, onSelect, onCross
}: {
  choice: Choice;
  index: number;
  submittedId: string | null;
  submitted: boolean;
  selectedId: string | null;
  crossed: boolean;
  status: "Active" | "Suspended" | "Ended";
  fontScale: number;
  onSelect: () => void;
  onCross: () => void;
}) {
  const isSelected = selectedId === choice.id || (submitted && submittedId === choice.id);
  const isCorrectChoice = choice.isCorrect;

  return (
    <div className={[
      "group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 select-none",
      isSelected ? "bg-[#2F6F8F] text-white" : "border-[#E6F0F7] bg-white text-neutral-900"
    ].join(" ")}>
      <button onClick={onSelect} disabled={submitted || status !== "Active" || crossed} className="flex w-full items-center gap-3 text-left">
        <span className={[
          "grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold",
          isSelected ? "bg-white text-[#2F6F8F] border-white" : "border-[#A5CDE4] text-[#2F6F8F]"
        ].join(" ")}>
          {String.fromCharCode(65 + index)}
        </span>
        <span className={crossed ? "line-through text-slate-400" : ""} style={{ fontSize: `${fontScale}rem` }}>
          {choice.text}
        </span>
      </button>

      <div className="shrink-0 flex items-center gap-3 pr-1">
        {submitted && (
          <>
            {!isCorrectChoice ? (
              <span className="text-lg font-extrabold" style={{ color: "#e11d48" }} title="Incorrect">×</span>
            ) : (
              <span className="text-lg font-extrabold" style={{ color: "#16a34a" }} title="Correct">?</span>
            )}
            <span className={["text-xs", isSelected ? "text-white/80" : "text-slate-500"].join(" ")} title="Students who chose this (coming soon)">— %</span>
          </>
        )}
        <button
          aria-label="cross out"
          onClick={onCross}
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-xl leading-none font-semibold transition",
            crossed ? (isSelected ? "text-white" : "text-[#e11d48]") : (isSelected ? "text-white/80" : "text-slate-500 hover:text-[#e11d48]")
          ].join(" ")}
        >
          ×
        </button>
      </div>
    </div>
  );
});

function toHTML(s: string) { return s.replace(/\n/g, "<br/>"); }

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string; }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-[#E6F0F7] bg-white shadow-xl">
          <div className="rounded-t-2xl bg-white border-b border-[#E6F0F7] px-4 py-2 text-[#2F6F8F] flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15" aria-label="Close">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DraggableCalc({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const onDown = (e: React.MouseEvent) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: rect.left, dy: rect.top };
    document.addEventListener("mousemove", onMove as EventListener);
    document.addEventListener("mouseup", onUp as EventListener, { once: true });
  };
  const onMove = (e: MouseEvent) => {
    if (!box.current || !drag.current) return;
    const nx = drag.current.dx + (e.clientX - drag.current.x);
    const ny = drag.current.dy + (e.clientY - drag.current.y);
    box.current.style.left = `${nx}px`;
    box.current.style.top = `${ny}px`;
  };
  const onUp = () => { document.removeEventListener("mousemove", onMove as EventListener); drag.current = null; };

  return (
    <div ref={box} className="fixed left-10 top-24 z-40 w-64 rounded-2xl border border-[#E6F0F7] bg-white shadow-lg" style={{ userSelect: "none" }}>
      <div onMouseDown={onDown} className="flex cursor-move items-center justify-between rounded-t-2xl border-b border-[#E6F0F7] bg-[#F3F9FC] px-3 py-2">
        <div className="text-sm font-semibold text-[#2F6F8F]">Calculator</div>
        <button onClick={onClose} className="rounded-lg p-1 text-[#2F6F8F]" aria-label="Close">×</button>
      </div>
      <CalcPad />
    </div>
  );
}

function CalcPad() {
  const [val, setVal] = useState("0");
  const press = (t: string) => {
    if (t === "C") return setVal("0");
    if (t === "?") return setVal((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
    if (t === "=") { try { const out = eval(val as unknown as string); setVal(String(out)); } catch { setVal("Error"); } return; }
    setVal((v) => (v === "0" ? t : v + t));
  };
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C","?"];
  return (
    <div className="p-3">
      <div className="mb-2 rounded-xl border border-[#E6F0F7] bg-white p-2 text-right font-mono text-lg text-neutral-900">{val}</div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className={["rounded-xl border px-3 py-2", k==="="? "bg-[#2F6F8F] text-white border-[#2F6F8F]" : "bg-white border-[#E6F0F7] hover:bg-[#F3F9FC] text-[#2F6F8F]"].join(" ")}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function LabDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"Serum" | "CSF" | "Blood" | "Urine" | "BMI">("Serum");
  const [q, setQ] = useState("");
  const all: Record<string, { name: string; value: string }[]> = {
    Serum: [{ name: "Sodium", value: "135–145 mEq/L" }, { name: "Potassium", value: "3.5–5.0 mEq/L" }, { name: "Creatinine", value: "0.6–1.3 mg/dL" }],
    CSF: [{ name: "Opening pressure", value: "90–180 mmH2O" }],
    Blood: [{ name: "Hemoglobin (M)", value: "13.5–17.5 g/dL" }],
    Urine: [{ name: "Specific Gravity", value: "1.005–1.030" }],
    BMI: [{ name: "Normal BMI", value: "18.5–24.9" }],
  };
  const list = (all[tab] ?? []).filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed right-0 z-40 w-96 border-l border-[#E6F0F7] bg-white shadow-lg" style={{ top: `${TOP_H}px`, bottom: `${BOTTOM_H}px` }}>
      <div className="flex items-center justify-between border-b border-[#E6F0F7] bg-[#F3F9FC] px-3 py-2">
        <div className="text-sm font-semibold text-[#2F6F8F]">Lab Values</div>
        <button onClick={onClose} className="rounded-lg p-1 text-[#2F6F8F]" aria-label="Close">×</button>
      </div>
      <div className="px-3 py-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search biomarker…" className="w-full rounded-xl border border-[#E6F0F7] p-2 outline-none focus:ring-2 focus:ring-[#A5CDE4] text-neutral-900" />
      </div>
      <div className="flex flex-wrap gap-2 px-3">
        {(["Serum","CSF","Blood","Urine","BMI"] as const).map((t)=>(
          <button key={t} onClick={()=>setTab(t)} className={["rounded-xl border px-3 py-1 text-sm", tab===t? "bg-[#2F6F8F] text-white border-[#2F6F8F]" : "bg-white text-[#2F6F8F] border-[#E6F0F7] hover:bg-[#F3F9FC]"].join(" ")}>{t}</button>
        ))}
      </div>
      <div className="mt-3 max-h-[calc(100%-130px)] overflow-auto px-3 pb-20">
        {list.length===0 && <div className="p-2 text-sm text-slate-500">No results.</div>}
        {list.map((row,i)=>(
          <div key={row.name+"-"+i} className="mb-2 rounded-xl border border-[#E6F0F7] bg-white p-3">
            <div className="text-sm font-semibold text-[#2F6F8F]">{row.name}</div>
            <div className="text-neutral-900">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

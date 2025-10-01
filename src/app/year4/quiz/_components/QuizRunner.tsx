"use client";

import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  FlaskConical,
  Highlighter as HighlighterIcon,
  Maximize2,
  MessageSquare,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PauseCircle,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import clsx from "clsx";
import QuestionDiscussion from "./QuestionDiscussion";

type TagType = "SUBJECT" | "SYSTEM" | "TOPIC" | "ROTATION" | "RESOURCE" | "MODE";
type DisplayTagType = Exclude<TagType, "MODE" | "TOPIC">;
type QuestionTag = { type: DisplayTagType; value: string; label: string };
type Choice = { id: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  customId?: number | null;
  stem: string;
  explanation?: string | null;
  objective?: string | null;
  questionYear?: string | null;
  rotationNumber?: string | null;
  iduScreenshotUrl?: string | null;
  questionImageUrl?: string | null;
  explanationImageUrl?: string | null;
  references?: string | null;
  choices: Choice[];
  tags?: QuestionTag[];
  occurrences?: Array<{
    year: string | null;
    rotation: string | null;
    orderIndex: number | null;
  }>;
};

type Item = {
  id: string;
  order: number | null;
  marked: boolean;
  question: Question;
  responses: { choiceId: string | null; isCorrect: boolean | null }[];
};

type Viewer = {
  name: string | null;
  email: string | null;
  role: "MEMBER" | "ADMIN" | "MASTER_ADMIN" | null;
};

type QuestionFirstAttemptStats = {
  totalFirstAttempts: number;
  firstAttemptCorrect: number;
  percent: number | null;
  choiceFirstAttempts: Record<string, { count: number; percent: number | null }>;
};

type InitialQuiz = {
  id: string;
  status: "Active" | "Suspended" | "Ended";
  items: Item[];
  viewer?: Viewer;
};

const TOP_H = 56;
const BOTTOM_H = 56;
const DEFAULT_OBJECTIVE = "This section summarizes the key takeaway for rapid review.";

const PALETTE = {
  primary: "#2F6F8F",
  accent: "#56A2CD",
  accentSoft: "#E4F2FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F4FAFF",
  outline: "#E6F0F7",
  success: "#16a34a",
  danger: "#e11d48",
};

const TAG_LABELS: Record<DisplayTagType, string> = {
  SUBJECT: "Subject/Discipline",
  SYSTEM: "System",
  ROTATION: "Rotation",
  RESOURCE: "Resource",
};

/** Persisted HTML (with highlights) per item and section */
type SectionHTML = { stem: string; explanation: string; objective: string };

const SECTION_SELECTOR = '[data-section="stem"],[data-section="explanation"],[data-section="objective"]';

function findSection(node: Node | null): { el: HTMLElement; key: keyof SectionHTML } | null {
  if (!node) return null;

  let el: Element | null = null;

  if (node instanceof Element) {
    el = node.closest(SECTION_SELECTOR);
  } else if (node instanceof Text) {
    const parent = node.parentNode;
    el = parent instanceof Element ? parent.closest(SECTION_SELECTOR) : null;
  } else {
    const parent = (node as ChildNode | null)?.parentNode ?? null;
    el = parent instanceof Element ? parent.closest(SECTION_SELECTOR) : null;
  }

  if (!el) return null;
  const section = el.getAttribute("data-section");
  if (section === "stem" || section === "explanation" || section === "objective") {
    return { el: el as HTMLElement, key: section as keyof SectionHTML };
  }
  return null;
}

const isHL = (n: Node | null): n is HTMLElement =>
  !!n &&
  n.nodeType === Node.ELEMENT_NODE &&
  (n as HTMLElement).tagName.toLowerCase() === "mark" &&
  (n as HTMLElement).getAttribute("data-qa") === "highlight";

const skipEmptyText = (n: Node | null, backwards = false): Node | null => {
  let cursor = n;
  while (cursor) {
    if (cursor.nodeType === Node.TEXT_NODE) {
      const value = (cursor as Text).nodeValue;
      if (value && value.length > 0) break;
    } else if (cursor.nodeType !== Node.COMMENT_NODE) {
      break;
    }
    cursor = backwards ? cursor.previousSibling : cursor.nextSibling;
  }
  return cursor;
};

const unwrap = (el: HTMLElement) => {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
};

const mergeWithNeighbors = (markEl: HTMLElement) => {
  const targetColor = window.getComputedStyle(markEl).backgroundColor;

  const prev = skipEmptyText(markEl.previousSibling, true);
  if (prev && isHL(prev) && window.getComputedStyle(prev).backgroundColor === targetColor) {
    while (markEl.firstChild) prev.appendChild(markEl.firstChild);
    markEl.remove();
    markEl = prev;
  }

  let next = skipEmptyText(markEl.nextSibling, false);
  while (next && isHL(next) && window.getComputedStyle(next).backgroundColor === targetColor) {
    const nextEl = next as HTMLElement;
    while (nextEl.firstChild) markEl.appendChild(nextEl.firstChild);
    const after = nextEl.nextSibling;
    nextEl.remove();
    next = skipEmptyText(after, false);
  }

  return markEl;
};

const normalizeInsertedMark = (markEl: HTMLElement) => {
  const inner = Array.from(markEl.querySelectorAll('mark[data-qa="highlight"]')) as HTMLElement[];
  inner.forEach((im) => unwrap(im));
  return mergeWithNeighbors(markEl);
};

const normalizeSectionHighlights = (sectionEl: Element) => {
  const nested = Array.from(
    sectionEl.querySelectorAll('mark[data-qa="highlight"] mark[data-qa="highlight"]')
  ) as HTMLElement[];
  nested.forEach((n) => unwrap(n));

  const marks = Array.from(sectionEl.querySelectorAll('mark[data-qa="highlight"]')) as HTMLElement[];
  marks.forEach((m) => mergeWithNeighbors(m));
};

export default function QuizRunner({ initialQuiz }: { initialQuiz: InitialQuiz }) {
  const [id] = useState(initialQuiz.id);
  const [items, setItems] = useState<Item[]>(initialQuiz.items);
  const [curIndex, setCurIndex] = useState(0);
  const [status, setStatus] = useState<"Active" | "Suspended" | "Ended">(initialQuiz.status);
  const [statsByQuestion, setStatsByQuestion] = useState<Record<string, QuestionFirstAttemptStats>>({});
  const statsLoadedRef = useRef(false);

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
  // --- added: answer-change tracking ---
  const changeRef = useRef<number>(0);
  const lastChoiceRef = useRef<string | null>(null);

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
          objective: toHTML(currentItem.question.objective ?? DEFAULT_OBJECTIVE),
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
    // --- added: reset change counter & last choice on question change ---
    changeRef.current = 0;
    lastChoiceRef.current = null;
  }, [curIndex]);

  const fetchQuestionStats = useCallback(async (questionIds: string[]) => {
    if (!Array.isArray(questionIds) || questionIds.length === 0) return;
    try {
      const res = await fetch(`/api/questions/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        stats?: Record<string, QuestionFirstAttemptStats>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to load question stats");
      }
      if (payload?.stats) {
        setStatsByQuestion((prev) => ({ ...prev, ...payload.stats }));
      }
    } catch (err) {
      console.warn("question stats load failed", err);
    }
  }, []);

  useEffect(() => {
    if (statsLoadedRef.current) return;
    const ids = Array.from(new Set(items.map((it) => it.question.id))).filter(Boolean);
    if (!ids.length) return;
    statsLoadedRef.current = true;
    fetchQuestionStats(ids).catch(() => {
      /* handled in helper */
    });
  }, [items, fetchQuestionStats]);

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
        body: JSON.stringify({
          quizItemId: currentItem.id,
          choiceId: selectedChoiceId,
          timeSeconds: questionSeconds,
          changeCount: changeRef.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { isCorrect?: boolean; pickedId?: string; error?: string };

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to submit answer");
      }

      if (tickRef.current) window.clearInterval(tickRef.current);
      if (qTickRef.current) window.clearInterval(qTickRef.current);
      tickRef.current = null;
      qTickRef.current = null;

      const finalCorrect =
        typeof data?.isCorrect === "boolean" ? data.isCorrect : localCorrect;
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? {
                ...it,
                responses: [
                  {
                    choiceId: data?.pickedId ?? selectedChoiceId,
                    isCorrect: Boolean(finalCorrect),
                  },
                ],
              }
            : it
        )
      );
      void fetchQuestionStats([currentItem.question.id]);
    } catch (error) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === currentItem.id
            ? { ...it, responses: [{ choiceId: selectedChoiceId, isCorrect: Boolean(localCorrect) }] }
            : it
        )
      );
      console.warn("quiz answer submission failed", error);
      void fetchQuestionStats([currentItem.question.id]);
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

  const applyHighlight = useCallback(() => {
    if (!highlightEnabled) return;

    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

  if (!findSection(range.commonAncestorContainer)) return;

    const mark = document.createElement("mark");
    mark.style.backgroundColor = highlightColor;
    mark.style.padding = "0"; // no gaps within words
    mark.style.margin = "0";
    mark.style.borderRadius = "2px";
    const markStyle = mark.style as CSSStyleDeclaration & {
      boxDecorationBreak?: string;
      WebkitBoxDecorationBreak?: string;
    };
    markStyle.boxDecorationBreak = "clone";
    markStyle.WebkitBoxDecorationBreak = "clone";
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
  }, [highlightEnabled, highlightColor, saveSectionHTML]);

  // Touch devices
  const onTouchEndHighlight = useCallback(() => {
    setTimeout(() => applyHighlight(), 0);
  }, [applyHighlight]);

  // Click a mark to remove it
  useEffect(() => {
    if (!highlightEnabled) return;

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
  }, [highlightEnabled, saveSectionHTML]);

  function BarIconBtn({
    title,
    onClick,
    children,
    active = false,
    disabled = false,
  }: {
    title: string;
    onClick: () => void;
    children: ReactNode;
    active?: boolean;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        className={clsx(
          "group inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-out",
          disabled
            ? "cursor-not-allowed text-[#9DBED5]"
            : active
            ? "bg-white text-[#1D4D66] shadow-md hover:-translate-y-0.5"
            : "text-[#2F6F8F] hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md"
        )}
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
                    {it.marked && <Flag aria-hidden size={18} className="text-[#e11d48]" />}
                    {_answered && (
                      _correct ? (
                        <Check aria-hidden size={18} className="text-[#16a34a]" />
                      ) : (
                        <X aria-hidden size={18} className="text-[#e11d48]" />
                      )
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
          "fixed left-0 right-0 top-0 z-30 border-b border-[#E6F0F7]",
          "bg-gradient-to-r from-[#F4FAFF] via-white to-[#F4FAFF] backdrop-blur",
          "h-14 transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ paddingLeft: `var(--sbw)` }}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BarIconBtn
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </BarIconBtn>

            <div className="rounded-xl border border-[#E6F0F7] bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#1D4D66] shadow-sm">
              Question {curIndex + 1} of {total}
            </div>

            <button
              type="button"
              onClick={() => currentItem && toggleFlag(!currentItem.marked)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                currentItem?.marked
                  ? "border-[#F3D1D6] bg-[#FFF5F6] text-[#b91c1c]"
                  : "border-[#E6F0F7] bg-white text-[#2F6F8F] hover:bg-[#F3F9FC]"
              )}
              aria-pressed={currentItem?.marked ?? false}
            >
              <Flag
                size={18}
                className={currentItem?.marked ? "text-[#e11d48]" : "text-[#2F6F8F]"}
                aria-hidden
              />
              {currentItem?.marked ? "Marked" : "Mark"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <BarIconBtn
              title="Previous question"
              onClick={() => setCurIndex((i) => Math.max(0, i - 1))}
              disabled={curIndex === 0}
            >
              <ChevronLeft size={18} />
            </BarIconBtn>
            <BarIconBtn
              title="Next question"
              onClick={() => setCurIndex((i) => Math.min(total - 1, i + 1))}
              disabled={curIndex >= total - 1}
            >
              <ChevronRight size={18} />
            </BarIconBtn>
          </div>

          <div className="relative flex items-center gap-2" ref={paletteRef}>
            <button
              type="button"
              onClick={() => setShowHighlighter((prev) => !prev)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                highlightEnabled
                  ? "border-[#56A2CD] bg-[#E4F2FB] text-[#1D4D66] shadow-sm"
                  : "border-[#E6F0F7] bg-white text-[#2F6F8F] hover:bg-[#F3F9FC]"
              )}
              aria-expanded={showHighlighter}
            >
              <HighlighterIcon size={18} />
              Highlight
            </button>
            {showHighlighter && (
              <div className="absolute right-0 top-12 z-40 mt-2 w-56 rounded-2xl border border-[#E6F0F7] bg-white/95 p-3 shadow-lg">
                <div className="flex items-center justify-between gap-3 border-b border-[#E6F0F7] pb-2">
                  <div className="text-sm font-semibold text-[#1D4D66]">Highlighter</div>
                  <button
                    type="button"
                    onClick={() => setHighlightEnabled((prev) => !prev)}
                    className={clsx(
                      "relative flex h-6 w-11 items-center rounded-full transition-colors",
                      highlightEnabled ? "bg-[#56A2CD]" : "bg-slate-300"
                    )}
                    aria-pressed={highlightEnabled}
                    title={highlightEnabled ? "Disable highlighter" : "Enable highlighter"}
                  >
                    <span className="sr-only">Toggle highlighter</span>
                    <span
                      className={clsx(
                        "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        highlightEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {[
                    { c: PALETTE.danger, n: "Red" },
                    { c: PALETTE.success, n: "Green" },
                    { c: PALETTE.accent, n: "Blue" },
                    { c: "#ffe066", n: "Yellow" },
                  ].map((k) => (
                    <button
                      key={k.n}
                      onClick={() => setHighlightColor(k.c)}
                      className={clsx(
                        "h-7 w-7 rounded-full border border-[#E6F0F7] transition-all",
                        highlightColor === k.c ? "ring-2 ring-[#A5CDE4]" : "",
                        highlightEnabled ? "hover:scale-105" : "opacity-60"
                      )}
                      style={{ backgroundColor: k.c }}
                      title={k.n}
                      type="button"
                    />
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-slate-500">
                  {highlightEnabled
                    ? "Select text in the question or explanation and release to apply."
                    : "Enable the highlighter to start selecting text."}
                </div>
              </div>
            )}

            {/* Text size */}
            <div className="ml-1 inline-flex items-center gap-1 rounded-xl border border-[#E6F0F7] bg-white/90 p-1 shadow-sm">
              <button
                onClick={decFont}
                className="rounded-lg px-3 py-2 text-xl leading-none text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Smaller"
              >
                <ZoomOut size={18} />
              </button>

              <button
                onClick={resetFont}
                className="rounded-lg px-2 py-1 text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Reset to default"
              >
                <Undo2 size={18} />
              </button>

              <button
                onClick={incFont}
                className="rounded-lg px-3 py-2 text-xl leading-none text-[#2F6F8F] hover:bg-[#F3F9FC]"
                title="Larger"
              >
                <ZoomIn size={18} />
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
              active={isFullscreen}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </BarIconBtn>

            {/* Calculator */}
            <BarIconBtn title="Calculator" onClick={() => setShowCalc(true)} active={showCalc}>
              <Calculator size={20} />
            </BarIconBtn>

            {/* Lab values */}
            <BarIconBtn title="Lab Values" onClick={() => setShowLabs(true)} active={showLabs}>
              <FlaskConical size={20} />
            </BarIconBtn>
          </div>
        </div>
      </header>

      {/* BOTTOM BAR */}
      <footer
        className={[
          "fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6F0F7]",
          "bg-gradient-to-r from-[#F4FAFF] via-white to-[#F4FAFF] backdrop-blur",
          "h-14 transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ paddingLeft: `var(--sbw)` }}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="text-sm font-semibold text-[#1D4D66]">
            Block Elapsed Time: <span className="tabular-nums">{fmtHMS(blockSeconds)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-sm font-semibold text-[#2F6F8F] shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F3F9FC] hover:shadow-md"
              title="Send feedback"
            >
              <MessageSquare size={18} />
              Feedback
            </button>

            <button
              onClick={() => setConfirmSuspend(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-sm font-semibold text-[#2F6F8F] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F3F9FC] hover:shadow-md"
              title="Suspend"
            >
              <PauseCircle size={18} />
              Suspend
            </button>

            <button
              onClick={() => setConfirmEnd(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F3D1D6] bg-white px-3 py-2 text-sm font-semibold text-[#b91c1c] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#FFF5F6] hover:shadow-md"
              title="End block"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="drop-shadow-sm"
              >
                <polygon
                  points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30"
                  fill="#e11d48"
                  stroke="#b91c1c"
                  strokeWidth="6"
                />
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
        <div className="mx-auto max-w-4xl px-4 py-6">
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

          {/* Question Image */}
          {currentItem?.question.questionImageUrl && (
            <div className="mt-4">
              <Image
                src={currentItem.question.questionImageUrl}
                alt="Question image"
                width={1024}
                height={768}
                className="max-h-96 w-full object-contain rounded-lg border border-[#E6F0F7]"
                unoptimized
              />
            </div>
          )}

          <div className="mt-4 space-y-2">
            {currentItem?.question.choices.map((ch, idx) => {
              const questionId = currentItem?.question.id;
              if (!questionId) return null;
              const questionStats = statsByQuestion[questionId];
              const totalFirstAttempts = questionStats?.totalFirstAttempts;
              const hasAttemptData =
                typeof totalFirstAttempts === "number" && Number.isFinite(totalFirstAttempts) && totalFirstAttempts > 0;
              const choiceStats = questionStats?.choiceFirstAttempts?.[ch.id];
              const isCorrectChoice = ch.isCorrect === true;
              let percentValue: number | null | undefined;
              if (!hasAttemptData) {
                percentValue = null;
              } else if (typeof choiceStats?.percent === "number" && Number.isFinite(choiceStats.percent)) {
                percentValue = choiceStats.percent;
              } else if (isCorrectChoice && typeof questionStats?.percent === "number" && Number.isFinite(questionStats.percent)) {
                percentValue = questionStats.percent;
              } else {
                percentValue = 0;
              }

              let countValue: number | undefined;
              if (!hasAttemptData) {
                countValue = undefined;
              } else if (typeof choiceStats?.count === "number" && Number.isFinite(choiceStats.count)) {
                countValue = choiceStats.count;
              } else if (
                isCorrectChoice &&
                typeof questionStats?.firstAttemptCorrect === "number" &&
                Number.isFinite(questionStats.firstAttemptCorrect)
              ) {
                countValue = questionStats.firstAttemptCorrect;
              } else {
                countValue = 0;
              }
              return (
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
                  firstAttemptPercent={percentValue}
                  firstAttemptCount={countValue}
                  onSelect={() => {
                    if (currentItem?.responses?.[0]?.choiceId || status !== "Active" || crossed[ch.id]) return;
                    setSelectedChoiceId((prev) => {
                      const next = prev === ch.id ? null : ch.id;
                      if (next !== prev) {
                        changeRef.current += 1;
                      }
                      lastChoiceRef.current = next;
                      return next;
                    });
                  }}
                  onCross={() => {
                    if (currentItem?.responses?.[0]?.choiceId) return;
                    setCrossed((m) => ({ ...m, [ch.id]: !m[ch.id] }));
                    if (selectedChoiceId === ch.id) {
                      setSelectedChoiceId(null);
                      changeRef.current += 1;
                      lastChoiceRef.current = null;
                    }
                  }}
                />
              );
            })}
          </div>

          {!isAnswered && status === "Active" && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={submitAnswer}
                disabled={!selectedChoiceId}
                className="rounded-2xl px-6 py-2 font-semibold text-white bg-[#56A2CD] hover:bg-[#2F6F8F] disabled:opacity-60 disabled:cursor-not-allowed shadow"
              >
                Submit Answer
              </button>
            </div>
          )}

          {(() => {
            if (!currentItem || !isAnswered) return null;
            const wasCorrect = currentItem.responses?.[0]?.isCorrect ?? null;
            const tagsByType = (currentItem.question.tags ?? []).reduce<
              Partial<Record<DisplayTagType, string[]>>
            >((acc, tag) => {
              if (!tag?.label) return acc;
              const key = tag.type;
              const label = tag.label.trim();
              if (!label) return acc;
              const bucket = acc[key] ?? [];
              if (!bucket.includes(label)) bucket.push(label);
              acc[key] = bucket;
              return acc;
            }, {});
            const references = parseReferences(currentItem.question.references);
            const screenshotUrl = currentItem.question.iduScreenshotUrl
              ? currentItem.question.iduScreenshotUrl.trim()
              : "";
            const occurrenceItems = (currentItem.question.occurrences ?? [])
              .map((occ) => {
                const pieces: string[] = [];
                if (occ?.year && occ.year.trim()) pieces.push(occ.year.trim());
                if (occ?.rotation && occ.rotation.trim()) pieces.push(occ.rotation.trim());
                const label = pieces.join(" · ");
                return label ? { key: `${pieces.join("|")}`, label } : null;
              })
              .filter((item): item is { key: string; label: string } => Boolean(item))
              .filter((item, index, arr) => arr.findIndex((candidate) => candidate.key === item.key) === index);
            const questionStats = statsByQuestion[currentItem.question.id];
            const percentLabel =
              questionStats && questionStats.percent !== null
                ? `${questionStats.percent}%`
                : "—%";
            return (
              <div className="mt-5 rounded-2xl border bg-white p-4" style={{ borderColor: wasCorrect ? "#CDEFE1" : "#F3D1D6" }}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-center justify-center rounded-xl bg-[#F3F9FC] p-3">
                    <span className="text-lg font-extrabold" style={{ color: wasCorrect ? "#16a34a" : "#e11d48" }}>
                      {wasCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-[#2F6F8F]">{percentLabel}</div>
                      <div className="text-xs leading-tight text-slate-500">Answered Correctly</div>
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

                {screenshotUrl ? (
                  <div className="mt-6">
                    <div className="text-lg font-bold text-[#2F6F8F]">IDU Screenshot:</div>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[#E6F0F7] bg-[#F8FBFD]">
                      <Image
                        src={screenshotUrl}
                        alt="IDU Screenshot"
                        width={1280}
                        height={720}
                        className="h-auto w-full max-h-[480px] object-contain bg-[#F8FBFD]"
                      />
                    </div>
                  </div>
                ) : null}

                {occurrenceItems.length ? (
                  <div className="mt-6">
                    <div className="text-lg font-bold text-[#2F6F8F]">Question Occurrences:</div>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {occurrenceItems.map((occ) => (
                        <li
                          key={occ.key}
                          className="rounded-xl border border-[#E6F0F7] bg-[#F9FCFF] px-3 py-2 text-sm text-[#2F6F8F] flex-shrink-0"
                        >
                          <span className="font-bold">{occ.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="quiz-explanation mt-6">
                  <div className="text-lg font-bold text-[#2F6F8F]">Explanation:</div>
                  
                  {/* Explanation Image */}
                  {currentItem?.question.explanationImageUrl && (
                    <div className="mt-3">
                      <Image
                        src={currentItem.question.explanationImageUrl}
                        alt="Explanation image"
                        width={1024}
                        height={768}
                        className="max-h-96 w-full object-contain rounded-lg border border-[#E6F0F7]"
                        unoptimized
                      />
                    </div>
                  )}
                  
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
                  <div className="text-lg font-bold text-[#2F6F8F]">References:</div>
                  {references.length ? (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-900">
                      {references.map((ref, idx) => {
                        const isLink = /^https?:\/\//i.test(ref);
                        return (
                          <li key={`${ref}-${idx}`}>
                            {isLink ? (
                              <a
                                href={ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2F6F8F] underline decoration-[#A5CDE4] underline-offset-2 transition hover:text-[#1D4D66]"
                              >
                                {ref}
                              </a>
                            ) : (
                              <span>{ref}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-2 text-sm text-slate-500">No references provided.</div>
                  )}
                </div>

                <div className="mt-6 border-t border-[#E6F0F7] pt-3">
                  <div className="flex flex-wrap gap-6 text-sm">
                    {Object.entries(TAG_LABELS).map(([type, label]) => {
                      const typed = type as DisplayTagType;
                      const display = tagsByType?.[typed] ?? [];
                      return (
                        <div key={typed}>
                          <div className="text-[#2F6F8F] font-semibold">{label}</div>
                          <div className="mt-1 text-neutral-900">
                            {display.length ? (
                              <div className="flex flex-wrap gap-1">
                                {display.map((value) => (
                                  <span
                                    key={`${typed}-${value}`}
                                    className="rounded-full bg-[#F3F9FC] px-2 py-0.5 text-xs font-medium text-[#2F6F8F] border border-[#E6F0F7]"
                                  >
                                    {value}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <QuestionDiscussion questionId={currentItem.question.id} />
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
            <button onClick={sendFeedback} disabled={!feedbackText.trim()} className="rounded-xl bg-[#56A2CD] px-4 py-2 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed">Submit</button>
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
            <button onClick={suspendQuiz} className="rounded-xl bg-[#56A2CD] px-4 py-2 font-semibold text-white">Confirm</button>
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
  choice,
  index,
  submittedId,
  submitted,
  selectedId,
  crossed,
  status,
  fontScale,
  firstAttemptPercent,
  firstAttemptCount,
  onSelect,
  onCross,
}: {
  choice: Choice;
  index: number;
  submittedId: string | null;
  submitted: boolean;
  selectedId: string | null;
  crossed: boolean;
  status: "Active" | "Suspended" | "Ended";
  fontScale: number;
  firstAttemptPercent: number | null | undefined;
  firstAttemptCount: number | undefined;
  onSelect: () => void;
  onCross: () => void;
}) {
  const isSelected = selectedId === choice.id || (submitted && submittedId === choice.id);
  const isCorrectChoice = choice.isCorrect;
  const percentLabel =
    typeof firstAttemptPercent === "number" && Number.isFinite(firstAttemptPercent)
      ? `${firstAttemptPercent}%`
      : "—%";
  const statTitle = submitted
    ? `First-attempt users choosing this option: ${percentLabel}${
        typeof firstAttemptCount === "number" ? ` (${firstAttemptCount})` : ""
      }`
    : "First-attempt users choosing this option";

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
              <span className="text-lg font-extrabold" style={{ color: "#16a34a" }} title="Correct">✓</span>
            )}
            <span
              className={["text-xs tabular-nums", isSelected ? "text-white/80" : "text-slate-500"].join(" ")}
              title={statTitle}
            >
              {percentLabel}
            </span>
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

function parseReferences(refs?: string | null): string[] {
  if (!refs) return [];
  const normalized = refs
    .replace(/\r/g, "")
    .replace(/[•\u2022\u2023\u25E6]/g, "\n");
  const segments = normalized
    .split(/\n+/)
    .flatMap((segment) => segment.split(/\s*;\s*/));
  const filtered = segments
    .map((part) => part.trim())
    .filter(Boolean);
  return Array.from(new Set(filtered));
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string; }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E6F0F7] bg-white shadow-xl">
        <div className="rounded-t-2xl bg-[#2F6F8F] px-4 py-2 text-white flex items-center justify-between">
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
    if (t === "←") return setVal((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
    if (t === "=") { try { const out = eval(val as unknown as string); setVal(String(out)); } catch { setVal("Error"); } return; }
    setVal((v) => (v === "0" ? t : v + t));
  };
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C","←"];
  return (
    <div className="p-3">
      <div className="mb-2 rounded-xl border border-[#E6F0F7] bg-white p-2 text-right font-mono text-lg text-neutral-900">{val}</div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className={["rounded-xl border px-3 py-2", k==="="? "bg-[#56A2CD] text-white border-[#56A2CD]" : "bg-white border-[#E6F0F7] hover:bg-[#F3F9FC] text-[#2F6F8F]"].join(" ")}>{k}</button>
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
          <button key={t} onClick={()=>setTab(t)} className={["rounded-xl border px-3 py-1 text-sm", tab===t? "bg-[#56A2CD] text-white border-[#56A2CD]" : "bg-white text-[#2F6F8F] border-[#E6F0F7] hover:bg-[#F3F9FC]"].join(" ")}>{t}</button>
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

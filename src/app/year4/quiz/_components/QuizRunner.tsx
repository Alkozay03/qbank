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
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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
import { ClientSideQuestionDetails } from "./ClientSideQuestionDetails";
import EMQQuestion from "./EMQQuestion";
import QuestionDiscussion from "./QuestionDiscussion";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme-type') === 'dark';
};

// Zoom buttons component with reactive dark mode
const ZoomButtons = memo(function ZoomButtons({ 
  decFont, 
  resetFont, 
  incFont 
}: { 
  decFont: () => void;
  resetFont: () => void;
  incFont: () => void;
}) {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);

  const buttonColor = isDark ? '#e5e7eb' : 'var(--color-primary)';
  
  return (
    <div 
      className="ml-1 inline-flex items-center gap-1 rounded-xl border p-1 shadow-sm"
      style={{ 
        backgroundColor: isDark ? '#000000' : 'white',
        borderColor: isDark ? '#4b5563' : 'var(--color-border)',
        transition: 'all 0.2s ease-out'
      }}
    >
      <button
        onClick={decFont}
        className="rounded-lg px-3 py-2 text-xl leading-none transition-all duration-200"
        title="Smaller"
        style={{ 
          color: buttonColor,
          backgroundColor: isDark ? '#000000' : 'white',
          transition: 'all 0.2s ease-out' 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark 
            ? '0 10px 25px rgba(255, 255, 255, 0.15)' 
            : '0 10px 25px rgba(var(--color-primary-rgb), 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <ZoomOut size={18} />
      </button>

      <button
        onClick={resetFont}
        className="rounded-lg px-2 py-1 transition-all duration-200"
        title="Reset to default"
        style={{ 
          color: buttonColor,
          backgroundColor: isDark ? '#000000' : 'white',
          transition: 'all 0.2s ease-out' 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark 
            ? '0 10px 25px rgba(255, 255, 255, 0.15)' 
            : '0 10px 25px rgba(var(--color-primary-rgb), 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Undo2 size={18} />
      </button>

      <button
        onClick={incFont}
        className="rounded-lg px-3 py-2 text-xl leading-none transition-all duration-200"
        title="Larger"
        style={{ 
          color: buttonColor,
          backgroundColor: isDark ? '#000000' : 'white',
          transition: 'all 0.2s ease-out' 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark 
            ? '0 10px 25px rgba(255, 255, 255, 0.15)' 
            : '0 10px 25px rgba(var(--color-primary-rgb), 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <ZoomIn size={18} />
      </button>
    </div>
  );
});

// Accept all known backend tag types in the data model.
type TagType = "TOPIC" | "ROTATION" | "SUBJECT";
type DisplayTagType = TagType;
type QuestionTag = { type: DisplayTagType; value: string; label: string };
type Choice = { 
  id: string; 
  text: string; 
  isCorrect: boolean;
  correctOptionIds?: string[] | null;
  stemImageUrl?: string | null;
};
type EMQOption = { id: string; text: string };
type Question = {
  id: string;
  customId?: number | null;
  questionType?: 'MCQ' | 'EMQ';
  stem: string;
  emqTheme?: string | null;
  emqOptions?: EMQOption[] | null;
  explanation?: string | null;
  objective?: string | null;
  questionYear?: string | null;
  rotationNumber?: string | null;
  iduScreenshotUrl?: string | null;
  questionImageUrl?: string | null;
  explanationImageUrl?: string | null;
  // Optional JSON-encoded arrays for multi-image support (backward compatible)
  questionImageUrls?: string | null;
  explanationImageUrls?: string | null;
  references?: string | null;
  choices: Choice[];
  tags?: QuestionTag[];
  occurrences?: Array<{
    year: string | null;
    rotation: string | null;
    orderIndex: number | null;
  }>;
  isAnswerConfirmed?: boolean;
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
  role: "MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null;
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
  mode?: string | null;
  items: Item[];
  viewer?: Viewer;
};

const TOP_H = 56;
const BOTTOM_H = 56;
const DEFAULT_OBJECTIVE = "This section summarizes the key takeaway for rapid review.";
const CAPTURE_CLICK_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true };

/** Persisted HTML (with highlights) per item and section */
type SectionHTML = { stem: string; explanation: string; objective: string };

// Helper function to safely get HTML content without risking TypeError
function getSafeHTML(
  item: Item | undefined, 
  htmlMap: Record<string, SectionHTML> | undefined, 
  section: keyof SectionHTML,
  fallbackFn: () => string
): string {
  // Safety checks to prevent "is not a function" errors
  if (!item) return fallbackFn();
  if (!htmlMap) return fallbackFn();
  if (!item.id) return fallbackFn();
  
  const sectionData = htmlMap[item.id];
  if (!sectionData) return fallbackFn();
  
  const content = sectionData[section];
  return content || fallbackFn();
}

// Helper function to safely get response data
function getSafeResponse(item: Item | undefined) {
  if (!item || !item.responses || !item.responses[0]) {
    return { choiceId: null, isCorrect: null };
  }
  return {
    choiceId: item.responses[0].choiceId || null,
    isCorrect: item.responses[0].isCorrect ?? null
  };
}

// Helper to derive a submitted choice for review mode (fallback to correct answer if omitted)
function getReviewChoiceId(item: Item | undefined, status: "Active" | "Suspended" | "Ended") {
  if (!item) return null;
  const hasResponse = item.responses && item.responses.length > 0 && item.responses[0]?.choiceId;
  if (hasResponse) return item.responses[0]?.choiceId ?? null;
  if (status === "Ended" && item.question.questionType === "MCQ") {
    const correct = item.question.choices.find((c) => c.isCorrect);
    return correct?.id ?? null;
  }
  return null;
}

const SECTION_SELECTOR = '[data-section="stem"],[data-section="explanation"],[data-section="objective"]';

// Parse a string that may contain a single URL or a JSON-stringified array of URLs
const toUrlArray = (raw?: string | null): string[] => {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .filter((v) => typeof v === "string" && v.trim().length > 0)
              .map((v) => v.trim())
          )
        );
      }
    } catch {
      /* fall back to single */
    }
  }
  return [trimmed];
};

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

// Add CSS rule for dark mode answer choices to ensure parent and daughter containers match
// Helper function to convert newlines to HTML breaks
function toHTML(s: string) { return s.replace(/\n/g, "<br/>"); }

function decodeHtmlEntities(raw: string): string {
  if (typeof window === "undefined") {
    return raw
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'");
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = raw;
  return textarea.value;
}

// Many imported stems are hard-wrapped by source tools (including mid-word line breaks).
// Normalize those wraps so the stem reflows naturally and highlights remain stable.
function normalizeStemText(raw: string): string {
  const normalizedLineEndings = raw.replace(/\r\n?/g, "\n");
  const htmlToText = decodeHtmlEntities(
    normalizedLineEndings
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
      .replace(/<\s*(p|div|li|tr|h[1-6])[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
  );
  const mergedWordBreaks = htmlToText.replace(/([A-Za-z0-9])\n([a-z])/g, "$1$2");
  const condensedBreakRuns = mergedWordBreaks.replace(/\n{3,}/g, "\n\n");
  const unwrappedSingleBreaks = condensedBreakRuns.replace(
    /([^\n])\n(?!\n)([^\n])/g,
    (_, left: string, right: string) => {
      if (/^\s*[-*•\d]/.test(right)) return `${left}\n${right}`;
      return `${left} ${right}`;
    }
  );
  return unwrappedSingleBreaks.replace(/[ \t]{2,}/g, " ");
}

function toStemHTML(raw: string) {
  return toHTML(normalizeStemText(raw));
}

// BarIconBtn component - moved outside QuizRunner to fix React Fast Refresh
function BarIconBtn({
  title,
  onClick,
  children,
  active = false,
  disabled = false,
  forceBlackBackground = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  forceBlackBackground?: boolean;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);

  // Determine background color based on dark mode and forceBlackBackground prop
  const getBackgroundColor = () => {
    if (isDark) {
      return forceBlackBackground ? '#000000' : '#4b5563'; // Black for specific icons, gray for others in dark mode
    }
    return 'white'; // Light mode always white
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={clsx(
        "group inline-flex h-10 w-10 items-center justify-center rounded-xl",
        disabled
          ? "cursor-not-allowed text-muted opacity-50"
          : active
          ? `${isDark ? "text-white" : "text-primary"} shadow-md ring-2 ring-primary-light`
          : `${isDark ? "text-white" : "text-primary"} hover:shadow-md`
      )}
      style={{ 
        transition: 'all 0.2s ease-out',
        backgroundColor: getBackgroundColor()
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark 
            ? '0 10px 25px rgba(255, 255, 255, 0.15)' 
            : '0 10px 25px rgba(var(--color-primary-rgb), 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = active ? 'translateY(-1px)' : 'translateY(0)';
          e.currentTarget.style.boxShadow = active ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none';
          e.currentTarget.style.backgroundColor = getBackgroundColor();
        }
      }}
    >
      {children}
    </button>
  );
}

const darkModeSelectedStyle = `
  /* Base style for all containers in dark mode - only in quiz runner */
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container {
    background-color: #000000 !important;
    transition: transform 0.15s ease-out, box-shadow 0.15s ease-out !important;
  }
  
  /* Special overriding style for cross button when crossed */
  html[data-theme-type="dark"] .year4-quiz-runner .crossed-button {
    background-color: #ff0000 !important;
    background: #ff0000 !important;
    border: 2px solid #ff0000 !important;
    color: white !important;
  }
  
  /* Override any styles for buttons with aria-label="cross out" */
  html[data-theme-type="dark"] .year4-quiz-runner button[aria-label="cross out"] {
    background-color: transparent !important;
    background: transparent !important;
  }
  
  /* Make sure this takes highest priority for crossed buttons */
  html[data-theme-type="dark"] .year4-quiz-runner button[aria-label="cross out"].crossed-button {
    background-color: #ff0000 !important;
    background: #ff0000 !important;
    border: 2px solid #ff0000 !important;
    color: white !important;
  }
  
  /* Apply to the main answer button, but exclude the cross button */
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container > button:not([aria-label="cross out"]) {
    background-color: #000000 !important;
    transition: inherit !important;
    display: flex !important;
    width: 100% !important;
  }
  
  /* Override for selected answers - these have higher specificity */
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container.dark-mode-selected {
    background-color: #444444 !important;
  }
  
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container.dark-mode-selected > button:not([aria-label="cross out"]) {
    background-color: #444444 !important;
  }
  
  /* Hover animations for parent and daughter containers */
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container:not(.answer-disabled):hover {
    transform: scale(1.01) !important;
    z-index: 1 !important;
  }
  
  /* Ensure buttons inherit hover state from parent */
  html[data-theme-type="dark"] .year4-quiz-runner .dark-mode-container:not(.answer-disabled):hover > button:not([aria-label="cross out"]) {
    background-color: inherit !important;
  }
`;

export default function QuizRunner({ initialQuiz }: { initialQuiz: InitialQuiz }) {
  // Add the CSS rules to the document (client-side only)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // Add the style element if it doesn't exist
    if (!document.getElementById('dark-mode-quiz-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'dark-mode-quiz-styles';
      styleElement.textContent = darkModeSelectedStyle;
      document.head.appendChild(styleElement);
    }
    
    // Cleanup on component unmount
    return () => {
      if (typeof document === 'undefined') return;
      const styleElement = document.getElementById('dark-mode-quiz-styles');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  const [id] = useState(initialQuiz.id);
  const [items, setItems] = useState<Item[]>(initialQuiz.items);
  const [curIndex, setCurIndex] = useState(0);

  // Dark mode detection - fix SSR hydration mismatch
  const [isDark, setIsDark] = useState(false); // Start with false to match SSR
  
  useEffect(() => {
    // Only check theme after hydration
    const checkDark = () => setIsDark(isDarkMode());
    checkDark(); // Initial check after mount
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);

  const [status, setStatus] = useState<"Active" | "Suspended" | "Ended">(initialQuiz.status);
  const isReviewMode = (initialQuiz.mode ?? "").toUpperCase() === "REVIEW";
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
  const [highlightEnabled, setHighlightEnabled] = useState(true);
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
  const [showFullId, setShowFullId] = useState(false);

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
  const suspendingRef = useRef(false);
  const resumedRef = useRef(false);

  // Answers
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [crossed, setCrossed] = useState<Record<string, boolean>>({});
  const [showAllReviewChoices, setShowAllReviewChoices] = useState(false);
  
  // EMQ answers: per item map of stemId -> optionId
  const [emqAnswers, setEmqAnswers] = useState<Record<string, string>>({});
  const [emqAnswersByItem, setEmqAnswersByItem] = useState<Record<string, Record<string, string>>>({});

  // Persisted HTML with marks per item
  const [sectionHTMLByItem, setSectionHTMLByItem] = useState<Record<string, SectionHTML>>({});

  const currentItem = items[curIndex];
  const total = items.length;
  const hasResponses = (currentItem?.responses?.length ?? 0) > 0;
  const firstChoiceId = currentItem?.responses?.[0]?.choiceId ?? null;
  const isAnswered =
    status === "Ended"
      ? true
      : currentItem?.question.questionType === "EMQ"
        ? hasResponses
        : Boolean(firstChoiceId);
  useEffect(() => {
    setShowAllReviewChoices(false);
  }, [currentItem?.id, isReviewMode]);

  const questionImages = useMemo(() => {
    const urls: string[] = [];
    urls.push(...toUrlArray(currentItem?.question.questionImageUrl));
    urls.push(...toUrlArray(currentItem?.question.questionImageUrls));
    return Array.from(new Set(urls));
  }, [currentItem]);

  const displayChoices = useMemo(() => {
    const all = currentItem?.question.choices ?? [];
    if (!isReviewMode || currentItem?.question.questionType !== "MCQ") return all;
    if (showAllReviewChoices) return all;
    const correctOnly = all.filter((c) => c.isCorrect);
    return correctOnly.length > 0 ? correctOnly : all;
  }, [currentItem, isReviewMode, showAllReviewChoices]);

  const displayEmqOptions = useMemo(() => {
    const opts = (currentItem?.question.emqOptions as EMQOption[]) ?? [];
    if (!isReviewMode) return opts;
    const correctIds = new Set<string>();
    (currentItem?.question.choices ?? []).forEach((stem) => {
      (stem.correctOptionIds ?? []).forEach((id: string) => correctIds.add(id));
    });
    const filtered = opts.filter((opt) => correctIds.has(opt.id));
    return filtered.length > 0 ? filtered : opts;
  }, [currentItem, isReviewMode]);

  const allChoices = currentItem?.question.choices ?? [];
  const canToggleReviewChoices =
    isReviewMode &&
    currentItem?.question.questionType === "MCQ" &&
    allChoices.some((c) => !c.isCorrect);
  const hiddenChoiceCount = Math.max(allChoices.length - displayChoices.length, 0);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [discussionPlacement, setDiscussionPlacement] = useState<"bottom" | "side">("bottom");
  const [discussionCollapsed, setDiscussionCollapsed] = useState(false);
  const [isDesktopWidth, setIsDesktopWidth] = useState(false);
  const useSideDiscussion = discussionPlacement === "side" && isAnswered && isDesktopWidth;
  const showSideDiscussion = useSideDiscussion && !discussionCollapsed;
  const SIDE_PANEL_WIDTH = 345;
  type AnchorReference = {
    selectableId: string;
    start: number;
    end: number;
    snippet: string;
  };
  const [selectionAnchor, setSelectionAnchor] = useState<AnchorReference | null>(null);
  const [showSelectionBubble, setShowSelectionBubble] = useState(false);
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const highlightOverlaysRef = useRef<HTMLDivElement[]>([]);
  const selectionProcessTimerRef = useRef<number | null>(null);

  function renderQuestionSection() {
    return (
      <>
      {/* Render EMQ or MCQ based on questionType */}
      {currentItem?.question.questionType === 'EMQ' ? (
        <div 
          className="quiz-question rounded-2xl border p-5" 
          style={{ 
            borderColor: 'var(--color-primary)',
            backgroundColor: isDark ? '#000000' : '#ffffff',
            transition: 'all 0.2s ease-out'
          }}
        >
          <EMQQuestion
            theme={currentItem.question.emqTheme ?? currentItem.question.stem}
            options={displayEmqOptions}
            stems={currentItem.question.choices.map(ch => ({
              id: ch.id,
              text: ch.text,
              correctOptionIds: (ch.correctOptionIds as string[]) ?? [],
              stemImageUrl: ch.stemImageUrl ?? null,
            }))}
            submitted={isAnswered}
            submittedAnswers={reviewEmqAnswers}
            fontScale={fontScale}
            onAnswersChange={handleEmqAnswersChange}
            onSubmit={submitAnswer}
          />
        </div>
      ) : (
        <>
          <div 
            className="quiz-question rounded-2xl border p-5" 
            style={{ 
              borderColor: 'var(--color-primary)',
              backgroundColor: isDark ? '#000000' : '#ffffff',
              transition: 'all 0.2s ease-out'
            }}
          >
            <div
              data-selectable-id="stem"
              data-section="stem"
              className="text-[15px] leading-relaxed rich-content"
              style={{ 
                fontSize: `${fontScale}rem`,
                color: isDark ? 'var(--color-text-primary)' : '#171717'
              }}
              dangerouslySetInnerHTML={{
                __html: getSafeHTML(
                  currentItem, 
                  sectionHTMLByItem, 
                  'stem', 
                  () => toStemHTML(currentItem?.question.stem ?? "")
                )
              }}
            />
          </div>

          {/* Question Images */}
          {questionImages.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {questionImages.map((url, idx) => (
                <div key={`${url}-${idx}`} className="rounded-lg border border-[#E6F0F7] overflow-hidden bg-white">
                  <Image
                    src={url}
                    alt={`Question image ${idx + 1}`}
                    width={1024}
                    height={768}
                    className="max-h-96 w-full object-contain cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
                    unoptimized
                    onClick={() => setPreviewImageUrl(url)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {displayChoices.map((ch, idx) => {
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
          const reviewChoiceId = getReviewChoiceId(currentItem, status);
          const submittedId = status === "Ended" ? reviewChoiceId : getSafeResponse(currentItem).choiceId;
          const submittedFlag =
            status === "Ended"
              ? Boolean(submittedId)
              : Boolean(getSafeResponse(currentItem).choiceId);

          return (
            <AnswerRow
              key={ch.id}
              choice={ch}
              index={idx}
              submittedId={submittedId}
              submitted={submittedFlag}
              selectedId={selectedChoiceId}
              crossed={!!crossed[ch.id]}
              status={status}
              fontScale={fontScale}
              firstAttemptPercent={percentValue}
              firstAttemptCount={countValue}
              onSelect={() => {
                if (getSafeResponse(currentItem).choiceId || status !== "Active" || crossed[ch.id]) return;
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
                if (getSafeResponse(currentItem).choiceId) return;
                const newValue = !crossed[ch.id];
                setCrossed((m) => ({ ...m, [ch.id]: newValue }));
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

          {canToggleReviewChoices && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAllReviewChoices((prev) => !prev)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200"
                style={{
                  borderColor: 'var(--color-primary)',
                  backgroundColor: isDark ? '#0b1221' : '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {showAllReviewChoices ? "Hide other answers" : "Reveal other answers"}
              </button>
              {!showAllReviewChoices && hiddenChoiceCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {hiddenChoiceCount} other {hiddenChoiceCount === 1 ? "answer" : "answers"} hidden in review.
                </p>
              )}
            </div>
          )}

                {!isAnswered && status === "Active" && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={submitAnswer}
                      disabled={!selectedChoiceId}
                      className="rounded-2xl px-6 py-2 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                      style={{
                        backgroundColor: isDarkMode() ? '#56A2CD' : 'var(--color-primary)',
                        transition: 'all 0.2s ease-out',
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          const isDark = isDarkMode();
                          // Update background color on hover
                          if (!isDark) {
                            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                          } else {
                            e.currentTarget.style.backgroundColor = '#2F6F8F';
                          }
                          // Use gray glow in dark mode, theme glow in light mode
                          e.currentTarget.style.boxShadow = isDark 
                            ? '0 10px 25px rgba(75, 85, 99, 0.25)' // Gray glow for dark mode
                            : '0 10px 25px rgba(0, 0, 0, 0.15)'; // Theme glow for light mode
                        }
                      }}
                      onMouseLeave={(e) => {
                        const isDark = isDarkMode();
                        e.currentTarget.style.backgroundColor = isDark ? '#56A2CD' : 'var(--color-primary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
                      }}
                    >
                      Submit Answer
                    </button>
                  </div>
                )}
        </>
      )}
      </>
    );
  }

  const clearCommentHighlight = useCallback(() => {
    highlightOverlaysRef.current.forEach((el) => el.remove());
    highlightOverlaysRef.current = [];
    document.removeEventListener("click", clearCommentHighlight, CAPTURE_CLICK_LISTENER_OPTIONS);
  }, []);

  const highlightRangeWithOverlay = useCallback((range: Range) => {
    clearCommentHighlight();
    const rects = Array.from(range.getClientRects());
    rects.forEach((rect) => {
      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.background = "rgba(14, 165, 233, 0.25)";
      overlay.style.borderRadius = "4px";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "50";
      document.body.appendChild(overlay);
      highlightOverlaysRef.current.push(overlay);
    });
    setTimeout(() => {
      document.addEventListener("click", clearCommentHighlight, CAPTURE_CLICK_LISTENER_OPTIONS);
    }, 0);
  }, [clearCommentHighlight]);

  const buildRangeFromOffsets = useCallback((container: HTMLElement, start: number, end: number) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let current = walker.nextNode();
    let acc = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;
    while (current) {
      const len = current.textContent?.length ?? 0;
      if (!startNode && acc + len >= start) {
        startNode = current;
        startOffset = start - acc;
      }
      if (!endNode && acc + len >= end) {
        endNode = current;
        endOffset = end - acc;
        break;
      }
      acc += len;
      current = walker.nextNode();
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }, []);

  const focusAnchor = useCallback((anchor: { selectableId: string; start: number; end: number; snippet: string }) => {
    const target = document.querySelector<HTMLElement>(`[data-selectable-id=\"${anchor.selectableId}\"]`);
    if (!target) return;
    const range = buildRangeFromOffsets(target, anchor.start, anchor.end);
    if (!range) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightRangeWithOverlay(range);
  }, [buildRangeFromOffsets, highlightRangeWithOverlay]);

  const handleSelectionCapture = useCallback(() => {
    if (typeof window === "undefined") return;
    if (highlightEnabled || !isAnswered) {
      setShowSelectionBubble(false);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setShowSelectionBubble(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const containerNode = range.commonAncestorContainer;
    const el =
      containerNode instanceof HTMLElement
        ? containerNode.closest("[data-selectable-id]")
        : containerNode.parentElement?.closest("[data-selectable-id]");
    if (!el || !(el instanceof HTMLElement) || !el.dataset.selectableId) {
      setShowSelectionBubble(false);
      return;
    }
    const selectableId = el.dataset.selectableId;
    const textContent = el.textContent ?? "";
    if (!textContent.trim()) {
      setShowSelectionBubble(false);
      return;
    }
    const rangeBefore = document.createRange();
    rangeBefore.selectNodeContents(el);
    rangeBefore.setEnd(range.startContainer, range.startOffset);
    const start = rangeBefore.toString().length;

    const rangeBeforeEnd = document.createRange();
    rangeBeforeEnd.selectNodeContents(el);
    rangeBeforeEnd.setEnd(range.endContainer, range.endOffset);
    const end = rangeBeforeEnd.toString().length;

    const snippet = sel.toString().trim().slice(0, 400);
    if (!snippet) {
      setShowSelectionBubble(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    setBubblePos({ x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + window.scrollY - 8 });
    setSelectionAnchor({ selectableId, start, end, snippet });
    setShowSelectionBubble(true);
  }, [highlightEnabled, isAnswered]);

  const shouldPauseTimerTick = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (!highlightEnabled || isAnswered) return false;
    const sel = window.getSelection?.();
    return Boolean(sel && sel.rangeCount > 0 && !sel.isCollapsed);
  }, [highlightEnabled, isAnswered]);

  // Initialize persisted sections for current item
  useEffect(() => {
    if (!currentItem) return;
    setSectionHTMLByItem((prev) => {
      if (prev[currentItem.id]) return prev;
      return {
        ...prev,
        [currentItem.id]: {
          stem: toStemHTML(currentItem.question.stem ?? ""),
          explanation:
            toHTML(currentItem.question.explanation ?? "") ||
            `<div class='text-sm' style='color: ${isDark ? 'var(--color-text-primary)' : '#64748b'}'>No explanation provided.</div>`,
          objective: toHTML(currentItem.question.objective ?? DEFAULT_OBJECTIVE),
        },
      };
    });
  }, [currentItem, isDark]);

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
      tickRef.current = window.setInterval(() => {
        if (shouldPauseTimerTick()) return;
        setBlockSeconds((s) => s + 1);
      }, 1000) as unknown as number;
      qTickRef.current = window.setInterval(() => {
        if (shouldPauseTimerTick()) return;
        setQuestionSeconds((s) => s + 1);
      }, 1000) as unknown as number;
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (qTickRef.current) window.clearInterval(qTickRef.current);
      tickRef.current = null;
      qTickRef.current = null;
    };
  }, [curIndex, status, isAnswered, currentItem, shouldPauseTimerTick]);

  // Reset per-question state
  useEffect(() => {
    setQuestionSeconds(0);
    setSelectedChoiceId(null);
    setCrossed({});
    // --- added: reset change counter & last choice on question change ---
    changeRef.current = 0;
    lastChoiceRef.current = null;
  }, [curIndex]);

  // Discussion placement persistence + responsive guard
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("quiz-discussion-placement");
    if (stored === "side" || stored === "bottom") {
      setDiscussionPlacement(stored);
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktopWidth(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("quiz-discussion-placement", discussionPlacement);
  }, [discussionPlacement]);

  useEffect(() => {
    if (discussionPlacement === "side") {
      setDiscussionCollapsed(false);
    }
  }, [discussionPlacement]);

  // Restore EMQ answers for the current item (so revisiting shows selections)
  useEffect(() => {
    if (!currentItem?.id) {
      setEmqAnswers({});
      return;
    }
    setEmqAnswers(emqAnswersByItem[currentItem.id] ?? {});
  }, [currentItem?.id, emqAnswersByItem]);

  const handleEmqAnswersChange = useCallback(
    (answers: Record<string, string>) => {
      setEmqAnswers(answers);
      if (currentItem?.id) {
        setEmqAnswersByItem((prev) => ({ ...prev, [currentItem.id]: answers }));
      }
    },
    [currentItem?.id]
  );

  // Build review-time EMQ answers: if no answers and quiz ended, show correct options
  const reviewEmqAnswers = useMemo(() => {
    if (status !== "Ended") return emqAnswers;
    if (Object.keys(emqAnswers).length > 0) return emqAnswers;
    const fallback: Record<string, string> = {};
    currentItem?.question.choices.forEach((stem) => {
      const correctIds = Array.isArray(stem.correctOptionIds) ? stem.correctOptionIds : [];
      if (correctIds.length > 0) {
        fallback[stem.id] = correctIds[0];
      }
    });
    return fallback;
  }, [status, emqAnswers, currentItem]);

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

  // Auto-suspend on tab close/navigation so progress is preserved
  const autoSuspend = useCallback(() => {
    if (status !== "Active") return;
    if (suspendingRef.current) return;
    suspendingRef.current = true;
    setStatus("Suspended");
    fetch(`/api/quiz/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suspend", reason: "auto-close" }),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  }, [id, status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = () => autoSuspend();
    const onBeforeUnload = () => autoSuspend();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") autoSuspend();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoSuspend]);

  // Auto-resume if the quiz was previously suspended
  useEffect(() => {
    if (status !== "Suspended") return;
    if (resumedRef.current) return;
    resumedRef.current = true;
    fetch(`/api/quiz/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    })
      .then((r) => {
        if (r.ok) setStatus("Active");
      })
      .catch(() => {
        /* best-effort */
      });
  }, [status, id]);

  // Submit answer
  async function submitAnswer() {
    if (!currentItem) return;
    
    const isEMQ = currentItem.question.questionType === 'EMQ';
    
    // For EMQ, check if all stems are answered
    if (isEMQ) {
      const allStemsAnswered = currentItem.question.choices.every(
        (stem) => emqAnswers[stem.id]
      );
      if (!allStemsAnswered) return;
    } else {
      // For MCQ, check if an answer is selected
      if (!selectedChoiceId) return;
    }
    
    const localCorrect = isEMQ 
      ? null // EMQ has multiple correct answers
      : currentItem.question.choices.find((c) => c.id === selectedChoiceId)?.isCorrect ?? null;
      
    // Optimistic UI: mark answered immediately so explanation/objective show without waiting
    const optimisticResponses = isEMQ
      ? currentItem.question.choices.map((stem) => ({
          choiceId: stem.id,
          isCorrect: emqAnswers[stem.id] ? stem.correctOptionIds?.includes(emqAnswers[stem.id]) ?? false : null,
        }))
      : [
          {
            choiceId: selectedChoiceId,
            isCorrect: localCorrect,
          },
        ];

    setItems((prev) =>
      prev.map((it) =>
        it.id === currentItem.id
          ? {
              ...it,
              responses: optimisticResponses,
            }
          : it
      )
    );

    try {
      const body = isEMQ
        ? {
            quizItemId: currentItem.id,
            emqAnswers,
            timeSeconds: questionSeconds,
            changeCount: changeRef.current,
          }
        : {
            quizItemId: currentItem.id,
            choiceId: selectedChoiceId,
            timeSeconds: questionSeconds,
            changeCount: changeRef.current,
          };
      
      const res = await fetch(`/api/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = (await res.json().catch(() => ({}))) as { 
        isCorrect?: boolean; 
        pickedId?: string; 
        error?: string;
        isEMQ?: boolean;
        results?: Array<{ stemId: string; isCorrect: boolean }>;
        correctCount?: number;
        totalCount?: number;
      };

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
                responses: isEMQ && data?.results
                  ? data.results.map(r => ({
                      choiceId: r.stemId,
                      isCorrect: r.isCorrect,
                    }))
                  : [
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
            ? { 
                ...it, 
                // Keep marked state unchanged - user controls it manually
                responses: [{ choiceId: selectedChoiceId, isCorrect: Boolean(localCorrect) }] 
              }
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

    const sectionSourceNode = range.commonAncestorContainer;
    if (!findSection(sectionSourceNode)) return;

    // Store selection text before manipulating the DOM
    const selectedText = sel.toString();
    if (!selectedText.trim()) return;

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
      // Atomic range mutation avoids drift between extraction/deletion steps.
      const frag = range.extractContents();
      
      // Only proceed if we extracted something meaningful
      if (frag.textContent?.trim()) {
        mark.appendChild(frag);
        range.insertNode(mark);
        sel.removeAllRanges();

        if (mark.isConnected) {
          normalizeInsertedMark(mark);
          sectionInfo = findSection(mark) ?? findSection(sectionSourceNode);
        }
      }
    } catch {
      // Selection can become stale during long drags; retry with a fresh range.
      try {
        const liveSel = window.getSelection?.();
        if (!liveSel || liveSel.rangeCount === 0) return;
        const freshRange = liveSel.getRangeAt(0);
        if (freshRange.collapsed) return;
        const freshFrag = freshRange.extractContents();
        if (!freshFrag.textContent?.trim()) return;
        mark.appendChild(freshFrag);
        freshRange.insertNode(mark);
        liveSel.removeAllRanges();
        if (mark.isConnected) {
          normalizeInsertedMark(mark);
          sectionInfo = findSection(mark) ?? findSection(sectionSourceNode);
        }
      } catch {
        return;
      }
    }

    if (!sectionInfo) sectionInfo = findSection(sectionSourceNode);
    if (sectionInfo) saveSectionHTML(sectionInfo.el, sectionInfo.key);

    lastMarkInsertAtRef.current = Date.now();
  }, [highlightEnabled, highlightColor, saveSectionHTML]);

  const processSelectionInteraction = useCallback(() => {
    if (highlightEnabled) {
      applyHighlight();
      return;
    }
    if (isAnswered) {
      handleSelectionCapture();
      return;
    }
    setShowSelectionBubble(false);
    setSelectionAnchor(null);
  }, [applyHighlight, handleSelectionCapture, highlightEnabled, isAnswered]);

  const scheduleSelectionInteraction = useCallback(() => {
    if (typeof window === "undefined") return;
    if (selectionProcessTimerRef.current !== null) {
      window.clearTimeout(selectionProcessTimerRef.current);
    }
    selectionProcessTimerRef.current = window.setTimeout(() => {
      selectionProcessTimerRef.current = null;
      processSelectionInteraction();
    }, 0);
  }, [processSelectionInteraction]);

  useEffect(() => {
    return () => {
      if (selectionProcessTimerRef.current !== null) {
        window.clearTimeout(selectionProcessTimerRef.current);
      }
    };
  }, []);

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

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-neutral-50 year4-quiz-runner"
      style={{ ["--sbw" as unknown as string]: sidebarWidth }}
    >
      {/* LEFT SIDEBAR */}
      <aside
        className={[
          "fixed border-r overflow-hidden",
          "left-0",
          "transition-[width] duration-300 ease-in-out will-change-[width]"
        ].join(" ")}
        style={{ 
          width: sidebarWidth, 
          top: 0, 
          bottom: 0,
          zIndex: 9999, 
          borderRightColor: isDark ? '#4b5563' : 'var(--color-primary)',
          backgroundColor: isDark ? '#000000' : 'var(--color-background)'
        }}
      >
        <div className="h-full overflow-auto">
          <div className="flex flex-col">
            {items.map((it, i) => {
              const isEMQ = it.question.questionType === 'EMQ';
              const even = i % 2 === 0;
              
              // For EMQ, calculate correct/incorrect counts
              let correctCount = 0;
              let incorrectCount = 0;
              let _answered = false;
              
              if (isEMQ && it.responses && it.responses.length > 0) {
                _answered = true;
                it.responses.forEach(r => {
                  if (r.isCorrect) correctCount++;
                  else incorrectCount++;
                });
              } else {
                // MCQ logic
                const response = getSafeResponse(it);
                _answered = Boolean(response.choiceId);
                const _correct = response.isCorrect ?? false;
                if (_answered) {
                  if (_correct) correctCount = 1;
                  else incorrectCount = 1;
                }
              }
              
              return (
                <button
                  key={it.id}
                  onClick={() => setCurIndex(i)}
                  className={[
                    "relative flex items-center justify-between px-3 py-2 text-sm font-semibold",
                    isDark ? "text-white" : "text-neutral-900",
                    i === curIndex ? "z-10" : ""
                  ].join(" ")}
                  style={{
                    backgroundColor: isDark 
                      ? (even ? '#1f2937' : '#374151') 
                      : (even ? 'var(--color-background)' : 'var(--color-background-secondary)'),
                    ...(i === curIndex ? { 
                      borderTop: isDark ? '2px solid #4b5563' : '2px solid var(--color-primary)',
                      borderLeft: isDark ? '2px solid #4b5563' : '2px solid var(--color-primary)',
                      borderRight: isDark ? '2px solid #4b5563' : '2px solid var(--color-primary)',
                      borderBottom: isDark ? '2px solid #4b5563' : '2px solid var(--color-primary)'
                    } : {
                      borderBottom: isDark ? '1px solid #4b5563' : '1px solid var(--color-primary)'
                    })
                  }}
                  title={`Question ${i + 1}`}
                >
                  <span className="text-base">{i + 1}</span>
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    {it.marked && <Flag aria-hidden size={18} className="text-[#e11d48]" />}
                    {_answered && (
                      <>
                        {correctCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            {isEMQ && <span className="text-[10px]">{correctCount}</span>}
                            <Check aria-hidden size={18} className="text-[#16a34a]" />
                          </span>
                        )}
                        {incorrectCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            {isEMQ && <span className="text-[10px]">{incorrectCount}</span>}
                            <X aria-hidden size={18} className="text-[#e11d48]" />
                          </span>
                        )}
                      </>
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
          "fixed left-0 right-0 top-0 z-10 border-b",
          "h-14 transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ 
          paddingLeft: `var(--sbw)`,
          backgroundColor: isDark ? '#000000' : 'var(--color-background)',
          backgroundImage: isDark ? 'linear-gradient(135deg, rgba(99, 99, 99, 0.3) 0%, rgba(59, 59, 59, 0.2) 50%, rgba(99, 99, 99, 0.3) 100%)' : 'linear-gradient(to right, var(--color-primary-light), var(--color-background), var(--color-primary-light))',
          borderColor: isDark ? '#4b5563' : 'var(--color-border)'
        }}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BarIconBtn
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setSidebarOpen((v) => !v)}
              forceBlackBackground={true}
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </BarIconBtn>

            <div 
              className="rounded-xl border border-theme px-3 py-1.5 text-sm font-semibold shadow-sm"
              style={{
                backgroundColor: isDark ? '#000000' : 'white',
                color: isDark ? '#ffffff' : 'var(--color-primary)',
                borderColor: isDark ? '#4b5563' : 'var(--color-primary)'
              }}
            >
              <div>Question {curIndex + 1} of {total}</div>
              {currentItem?.question.id && (
                <div className="mt-0.5 flex items-center gap-2">
                  <div
                    className="text-xs font-mono"
                    style={{
                      color: isDark ? '#ffffff' : 'var(--color-primary)',
                      opacity: isDark ? 0.7 : 0.7
                    }}
                    title={`Question ID: ${currentItem.question.id}`}
                  >
                    ID: {showFullId ? currentItem.question.id : `${currentItem.question.id.substring(0, 6)}…`}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullId((v) => !v)}
                    className="text-[11px] font-semibold underline decoration-dotted underline-offset-2"
                    style={{
                      color: isDark ? '#9ca3af' : '#6b7280'
                    }}
                  >
                    {showFullId ? 'Hide ID' : 'Show ID'}
                  </button>
                </div>
              )}
            </div>

            {status !== "Ended" && (
              <button
                type="button"
                onClick={() => currentItem && toggleFlag(!currentItem.marked)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                  currentItem?.marked
                    ? (isDark ? "border-red-500 bg-red-900 text-red-200" : "border-red-300 bg-red-50 text-red-700")
                    : "border-theme"
                )}
                style={{
                  ...(currentItem?.marked ? {} : {
                    backgroundColor: isDark ? '#000000' : 'white',
                    color: isDark ? '#ffffff' : 'var(--color-primary)',
                    borderColor: isDark ? '#4b5563' : 'var(--color-border)'
                  }),
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                  if (currentItem?.marked) {
                    e.currentTarget.style.backgroundColor = 'rgb(254 226 226)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                  if (currentItem?.marked) {
                    e.currentTarget.style.backgroundColor = 'rgb(254 242 242)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
                aria-pressed={currentItem?.marked ?? false}
              >
                <Flag
                  size={18}
                  className={currentItem?.marked ? "text-[#e11d48]" : "text-primary"}
                  aria-hidden
                />
                {currentItem?.marked ? "Marked" : "Mark"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <BarIconBtn
              title="Previous question"
              onClick={() => setCurIndex((i) => Math.max(0, i - 1))}
              disabled={curIndex === 0}
              forceBlackBackground={true}
            >
              <ChevronLeft size={18} />
            </BarIconBtn>
            <BarIconBtn
              title="Next question"
              onClick={() => setCurIndex((i) => Math.min(total - 1, i + 1))}
              disabled={curIndex >= total - 1}
              forceBlackBackground={true}
            >
              <ChevronRight size={18} />
            </BarIconBtn>
          </div>

          <div className="relative flex items-center gap-2" ref={paletteRef}>
            <button
              type="button"
              onClick={() => setShowHighlighter((prev) => !prev)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                highlightEnabled
                  ? (isDark ? "border-primary bg-gray-700 text-primary shadow-sm" : "border-primary bg-primary-light text-primary shadow-sm")
                  : "border-theme"
              )}
              style={{
                ...(highlightEnabled ? {} : {
                  backgroundColor: isDark ? '#000000' : 'white',
                  color: isDark ? '#ffffff' : 'var(--color-primary)',
                  borderColor: isDark ? '#4b5563' : 'var(--color-border)'
                }),
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                if (highlightEnabled) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'white';
                } else {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (highlightEnabled) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
                } else {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              aria-expanded={showHighlighter}
            >
              <HighlighterIcon size={18} />
              Highlight
            </button>
            {showHighlighter && (
              <div 
                className="absolute left-0 top-12 z-40 mt-2 w-56 rounded-2xl border p-3 shadow-lg"
                style={{
                  borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                  backgroundColor: isDark ? '#1f2937' : 'white'
                }}
              >
                <div 
                  className="flex items-center justify-between gap-3 border-b pb-2"
                  style={{ borderColor: isDark ? '#4b5563' : 'var(--color-border)' }}
                >
                  <div 
                    className="text-sm font-semibold"
                    style={{ color: isDark ? '#e5e7eb' : 'var(--color-primary)' }}
                  >
                    Highlighter
                  </div>
                  <button
                    type="button"
                    onClick={() => setHighlightEnabled((prev) => !prev)}
                    className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{
                      backgroundColor: highlightEnabled 
                        ? (isDark ? '#56A2CD' : 'var(--color-primary)') 
                        : '#cbd5e1'
                    }}
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
                    { c: "#fca5a5", n: "Red" },
                    { c: "#86efac", n: "Green" },
                    { c: "#93c5fd", n: "Blue" },
                    { c: "#fde047", n: "Yellow" },
                  ].map((k) => (
                    <button
                      key={k.n}
                      onClick={() => setHighlightColor(k.c)}
                      disabled={!highlightEnabled}
                      className={clsx(
                        "h-7 w-7 rounded-full border transition-all",
                        highlightColor === k.c ? "ring-2" : "",
                        highlightEnabled ? "hover:scale-105 cursor-pointer" : "cursor-not-allowed"
                      )}
                      style={{ 
                        backgroundColor: k.c,
                        borderColor: isDark ? '#4b5563' : '#e5e7eb',
                        filter: highlightEnabled ? 'none' : 'opacity(0.5)',
                        ...(highlightColor === k.c ? {
                          boxShadow: isDark ? '0 0 0 2px #6b7280' : '0 0 0 2px var(--color-primary)'
                        } : {})
                      }}
                      title={k.n}
                      type="button"
                    />
                  ))}
                </div>
                <div 
                  className="mt-3 text-[11px]"
                  style={{ color: isDark ? 'var(--color-text-primary)' : '#64748b' }}
                >
                  {highlightEnabled
                    ? "Select text in the question or explanation and release to apply."
                    : "Enable the highlighter to start selecting text."}
                </div>
              </div>
            )}

            {/* Discussion placement */}
            <div
              className="hidden sm:flex items-center gap-1 rounded-xl border px-1 py-1 text-xs font-semibold"
              style={{
                backgroundColor: isDark ? '#000000' : 'white',
                color: isDark ? '#e5e7eb' : 'var(--color-primary)',
                borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                transition: 'all 0.2s ease-out'
              }}
            >
              <span
                className="px-2 uppercase tracking-wide"
                style={{ fontSize: '10px', color: isDark ? '#e5e7eb' : 'var(--color-primary)', opacity: 0.7 }}
              >
                Discussion
              </span>
              <button
                type="button"
                onClick={() => setDiscussionPlacement("bottom")}
                className="rounded-lg px-3 py-1 transition-colors"
                style={{
                  backgroundColor: discussionPlacement === "bottom"
                    ? (isDark ? '#1f2937' : 'var(--color-primary)')
                    : 'transparent',
                  color: discussionPlacement === "bottom"
                    ? '#ffffff'
                    : (isDark ? '#e5e7eb' : 'var(--color-primary)'),
                  border: '1px solid',
                  borderColor: discussionPlacement === "bottom"
                    ? (isDark ? '#4b5563' : 'var(--color-primary)')
                    : 'transparent'
                }}
              >
                Bottom
              </button>
              <button
                type="button"
                onClick={() => setDiscussionPlacement("side")}
                className="rounded-lg px-3 py-1 transition-colors"
                style={{
                  backgroundColor: discussionPlacement === "side"
                    ? (isDark ? '#1f2937' : 'var(--color-primary)')
                    : 'transparent',
                  color: discussionPlacement === "side"
                    ? '#ffffff'
                    : (isDark ? '#e5e7eb' : 'var(--color-primary)'),
                  border: '1px solid',
                  borderColor: discussionPlacement === "side"
                    ? (isDark ? '#4b5563' : 'var(--color-primary)')
                    : 'transparent'
                }}
              >
                Side
              </button>
            </div>
            <div className="sm:hidden">
              <select
                value={discussionPlacement}
                onChange={(e) => setDiscussionPlacement(e.target.value as "bottom" | "side")}
                className="rounded-xl border px-2 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: isDark ? '#000000' : 'white',
                  color: isDark ? '#e5e7eb' : 'var(--color-primary)',
                  borderColor: isDark ? '#4b5563' : 'var(--color-border)'
                }}
              >
                <option value="bottom">Discussion: Bottom</option>
                <option value="side">Discussion: Side</option>
              </select>
            </div>


            {/* Text size */}
            <ZoomButtons decFont={decFont} resetFont={resetFont} incFont={incFont} />

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
              forceBlackBackground={true}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </BarIconBtn>

            {/* Calculator */}
            <BarIconBtn title="Calculator" onClick={() => setShowCalc(true)} active={showCalc} forceBlackBackground={true}>
              <Calculator size={20} />
            </BarIconBtn>

            {/* Lab values */}
            <BarIconBtn title="Lab Values" onClick={() => setShowLabs(true)} active={showLabs} forceBlackBackground={true}>
              <FlaskConical size={20} />
            </BarIconBtn>
          </div>
        </div>
      </header>

      {/* BOTTOM BAR */}
      <footer
        className={[
          "fixed bottom-0 left-0 right-0 z-10 border-t",
          "h-14 transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ 
          paddingLeft: `var(--sbw)`,
          backgroundColor: isDark ? '#000000' : 'var(--color-background)',
          backgroundImage: isDark ? 'linear-gradient(135deg, rgba(99, 99, 99, 0.3) 0%, rgba(59, 59, 59, 0.2) 50%, rgba(99, 99, 99, 0.3) 100%)' : 'linear-gradient(to right, var(--color-primary-light), var(--color-background), var(--color-primary-light))',
          borderColor: isDark ? '#4b5563' : 'var(--color-border)'
        }}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {status === "Ended" && (
              <a
                href={portalRoot}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm"
                style={{
                  backgroundColor: isDark ? '#000000' : 'white',
                  color: isDark ? '#ffffff' : 'var(--color-primary)',
                  borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
                  e.currentTarget.style.backgroundColor = isDark ? '#000000' : 'white';
                }}
              >
                Leave
              </a>
            )}
            {!isReviewMode && (
              <div 
                className="text-sm font-semibold"
                style={{ color: isDark ? '#e5e7eb' : 'var(--color-primary)' }}
              >
                Block Elapsed Time: <span className="tabular-nums">{fmtHMS(blockSeconds)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status === "Active" && (
              <>
                <button
                  onClick={() => setConfirmSuspend(true)}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm"
                  title="Suspend"
                  style={{ 
                    backgroundColor: isDark ? '#000000' : 'white',
                    color: isDark ? '#ffffff' : 'var(--color-primary)',
                    borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
                    transition: 'all 0.2s ease-out' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <PauseCircle size={18} />
                  Suspend
                </button>

                <button
                  onClick={() => setConfirmEnd(true)}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
                  title="End block"
                  style={{
                    backgroundColor: isDark ? '#7f1d1d' : 'white',
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    borderColor: isDark ? '#dc2626' : '#F3D1D6',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 29, 72, 0.15)';
                    e.currentTarget.style.backgroundColor = '#FFF5F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
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
              </>
            )}
          </div>
        </div>
      </footer>

      {/* MAIN CONTENT */}
      <main
        ref={mainRef}
        onMouseUpCapture={scheduleSelectionInteraction}
        onTouchEnd={scheduleSelectionInteraction}
        className={[
          "absolute left-0 right-0 overflow-auto",
          "transition-[padding-left] duration-300 ease-in-out"
        ].join(" ")}
        style={{ 
          top: `${TOP_H}px`, 
          bottom: `${BOTTOM_H}px`, 
          paddingLeft: `var(--sbw)`
        }}
      >
        <div
          className={clsx(
            "mx-auto px-4 py-6",
            useSideDiscussion ? "max-w-screen-2xl" : "max-w-screen-2xl"
          )}
        >
          <div
            className={clsx(
              "relative grid gap-4",
              useSideDiscussion && showSideDiscussion
                ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,340px)]"
                : ""
            )}
          >
            {useSideDiscussion && !showSideDiscussion && (
              <div className="hidden lg:block absolute right-0 top-0">
                <button
                  type="button"
                  onClick={() => setDiscussionCollapsed(false)}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#000000' : 'white',
                    color: isDark ? '#e5e7eb' : 'var(--color-primary)',
                    borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                    transition: 'all 0.2s ease-out'
                  }}
                >
                  <PanelRightOpen size={14} />
                  Show discussion
                </button>
              </div>
            )}

            <div className="min-w-0">
              {renderQuestionSection()}

              {currentItem && isAnswered && (
                <ClientSideQuestionDetails
                  currentItem={currentItem}
                  statsByQuestion={statsByQuestion}
                  questionSeconds={isReviewMode ? null : questionSeconds}
                  fontScale={fontScale}
                  sectionHTMLByItem={sectionHTMLByItem}
                  showDiscussionInline={!useSideDiscussion}
                  selectionAnchor={selectionAnchor}
                  onAnchorConsumed={() => {
                    setSelectionAnchor(null);
                    setShowSelectionBubble(false);
                  }}
                  onAnchorFocus={focusAnchor}
                />
              )}
            </div>

            {useSideDiscussion && showSideDiscussion && (
              <div className="flex flex-col gap-2 items-stretch" style={{ minWidth: `${SIDE_PANEL_WIDTH}px`, maxWidth: `${SIDE_PANEL_WIDTH}px` }}>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDiscussionCollapsed(true)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm"
                    style={{
                      backgroundColor: isDark ? '#111827' : 'var(--color-background)',
                      color: isDark ? '#e5e7eb' : 'var(--color-primary)',
                      borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                      transition: 'all 0.2s ease-out'
                    }}
                  >
                    <PanelRightClose size={14} />
                    Hide discussion
                  </button>
                </div>
                <aside
                  className="rounded-2xl border p-3 shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#0b0b0b' : 'white',
                    borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                    maxHeight: 'none',
                    overflow: 'visible'
                  }}
                >
                  <div
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: isDark ? '#e5e7eb' : 'var(--color-primary)' }}
                  >
                    Question Discussion
                  </div>
                  <QuestionDiscussion
                    questionId={currentItem.question.id}
                    selectionAnchor={selectionAnchor}
                    onAnchorConsumed={() => {
                      setSelectionAnchor(null);
                    }}
                    onAnchorFocus={focusAnchor}
                  />
                  <div className="mt-2 text-[12px] font-semibold leading-snug text-primary">
                    <strong>Anchor Highlight (Optional):</strong> Highlight text (stem, explanation, objective, EMQ theme/stems/options) to insert a comment related to that text. Turn the Highlighter off first.
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </main>

      {showSelectionBubble && isAnswered && !highlightEnabled && (
        <div
          className="fixed z-40"
          style={{
            left: bubblePos.x,
            top: bubblePos.y,
            transform: "translate(-50%, -100%)"
          }}
        >
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-md border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
            onClick={() => {
              setDiscussionCollapsed(false);
              setShowSelectionBubble(false);
            }}
          >
            Attach to discussion
          </button>
        </div>
      )}

      {showCalc && <DraggableCalc onClose={() => setShowCalc(false)} />}
      {showLabs && <LabDrawer onClose={() => setShowLabs(false)} />}

      {/* Image preview */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImageUrl(null)}
          role="presentation"
        >
          <div
            className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-white/90 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg font-semibold text-white hover:bg-black/80"
              aria-label="Close image preview"
            >
              ×
            </button>
            <div className="max-h-[80vh] overflow-auto">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Suspend confirm */}
      {confirmSuspend && (
        <Modal onClose={() => setConfirmSuspend(false)} title="Suspend Test Block">
          <p style={{ color: isDark ? 'var(--color-text-primary)' : '#262626' }}>You are about to suspend this test block, you can always return back to it later on.</p>
          <p className="mt-2" style={{ color: isDark ? 'var(--color-text-primary)' : '#262626' }}>Are you sure you want to suspend the test block?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button 
              onClick={() => setConfirmSuspend(false)} 
              className="rounded-xl border px-4 py-2 font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                backgroundColor: isDark ? '#374151' : 'white',
                color: isDark ? '#e5e7eb' : 'var(--color-primary)'
              }}
              onMouseEnter={(e) => {
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              Cancel
            </button>
            <button 
              onClick={suspendQuiz} 
              className="rounded-xl px-4 py-2 font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              style={{
                backgroundColor: isDark ? '#56A2CD' : 'var(--color-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#2F6F8F' : 'var(--color-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#56A2CD' : 'var(--color-primary)';
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* End confirm */}
      {confirmEnd && (
        <Modal onClose={() => setConfirmEnd(false)} title="End Test Block">
          <p style={{ color: isDark ? 'var(--color-text-primary)' : '#262626' }}>You are about to end this test block.</p>
          <p className="mt-2" style={{ color: isDark ? 'var(--color-text-primary)' : '#262626' }}>Are you sure you want to end the test block?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button 
              onClick={() => setConfirmEnd(false)} 
              className="rounded-xl border px-4 py-2 font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: isDark ? '#4b5563' : 'var(--color-border)',
                backgroundColor: isDark ? '#374151' : 'white',
                color: isDark ? '#e5e7eb' : 'var(--color-primary)'
              }}
              onMouseEnter={(e) => {
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              Cancel
            </button>
            <button 
              onClick={endQuiz} 
              className="rounded-xl px-4 py-2 font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md" 
              style={{ backgroundColor: "#e11d48" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e11d48';
              }}
            >
              Confirm
            </button>
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
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    // Re-check on theme changes
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);
  
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
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (isDark) {
      // Clear any non-dark mode styles
      containerRef.current.style.removeProperty('background');
      
      // Let the CSS classes handle the styling for dark mode
      // The classes are applied dynamically in the JSX className attribute
    } else {
      // Non-dark mode styling
      containerRef.current.classList.remove('dark-mode-container');
      containerRef.current.classList.remove('dark-mode-selected');
      
      if (isSelected) {
        containerRef.current.style.setProperty('background', 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', 'important');
      } else {
        containerRef.current.style.removeProperty('background');
        containerRef.current.style.removeProperty('background-color');
      }
    }
  }, [isDark, isSelected]);

  return (
    <div 
      ref={containerRef}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 select-none border quiz-answer-choice ${isDark ? 'dark-mode-container' : ''} ${isDark && isSelected ? 'dark-mode-selected' : ''} ${submitted || status !== "Active" || crossed ? 'answer-disabled' : ''}`}
      style={{
        backgroundColor: isDark ? (isSelected ? '#444444 !important' : '#000000 !important') : (isSelected ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))' : 'transparent'),
        borderColor: isDark ? '#4b5563' : (isSelected ? 'transparent' : 'var(--color-primary)'),
        color: isDark ? '#e5e7eb !important' : (isSelected ? 'white' : 'var(--color-text-primary)'),
        opacity: !isSelected ? 0.9 : 1,
        transition: 'all 0.15s ease-out'
      }}
      onMouseEnter={(e) => {
        if (!submitted && status === "Active" && !crossed) {
          if (!isDark) {
            // Apply scale to parent in non-dark mode
            e.currentTarget.style.transform = 'scale(1.01)';
          }
          // For dark mode, the CSS handles the transform
        }
      }}
      onMouseLeave={(e) => {
        if (!isDark) {
          // Reset scale in non-dark mode
          e.currentTarget.style.transform = 'scale(1)';
        }
        // For dark mode, the CSS handles the reset
      }}
    >
      <button
        onClick={onSelect}
        disabled={submitted || status !== "Active" || crossed}
        className="flex w-full items-center gap-3 text-left rounded-xl"
        style={{ 
          backgroundColor: isDark ? (isSelected ? '#444444 !important' : '#000000 !important') : 'transparent',
          border: 'none',
          padding: 0,
          cursor: (submitted || status !== "Active" || crossed) ? 'not-allowed' : 'pointer',
          height: '100%',
          transition: 'all 0.15s ease-out',
          color: isDark ? '#e5e7eb !important' : (isSelected ? 'white' : 'var(--color-text-primary)')
        }}
      >
        <span 
          className="grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold relative z-10"
          style={{
            backgroundColor: isDark ? 'transparent' : (isSelected ? 'white' : 'transparent'),
            borderColor: isDark ? '#4b5563' : (isSelected ? 'white' : 'var(--color-primary)'),
            color: isDark ? '#e5e7eb' : 'var(--color-primary)'
          }}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <span 
          className={`${crossed ? "line-through" : ""} relative z-10`} 
          style={{ 
            fontSize: `${fontScale}rem`,
            ...(crossed && { color: isDark ? '#9ca3af' : '#9ca3af' })
          }}
        >
          {choice.text}
        </span>
      </button>

      <div className="shrink-0 flex items-center gap-3 pr-1 relative z-10">
        {submitted && (
          <>
            {!isCorrectChoice ? (
              <span className="text-lg font-extrabold" style={{ color: isDark ? "#ffffff" : "#e11d48" }} title="Incorrect">×</span>
            ) : (
              <span className="text-lg font-extrabold" style={{ color: isDark ? "#ffffff" : "#16a34a" }} title="Correct">✓</span>
            )}
            <span
              className="text-xs tabular-nums"
              style={{ 
                color: isDark ? (isSelected ? '#e5e7eb' : '#9ca3af') : (isSelected ? 'white' : '#6b7280'),
                opacity: isSelected ? 0.8 : 1
              }}
              title={statTitle}
            >
              {percentLabel}
            </span>
          </>
        )}
        <button
          id={`cross-button-${choice.id}`}
          aria-label="cross out"
          onClick={onCross}
          className={`shrink-0 px-2 py-1 leading-none relative cross-button ${crossed ? 'crossed-button' : ''}`}
          style={{ 
            transition: 'all 0.2s ease-out',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: crossed ? '#ff0000' : (isDark ? '#000000' : 'transparent'),
            background: crossed ? '#ff0000' : (isDark ? '#000000' : 'transparent'),
            border: crossed ? '2px solid #ff0000' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '999'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15)';
            if (!crossed) {
              e.currentTarget.style.border = 'none';
              e.currentTarget.style.background = isDark ? '#000000' : 'transparent';
            } else {
              e.currentTarget.style.background = '#ff3333';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            
            if (!crossed) {
              e.currentTarget.style.border = 'none';
              e.currentTarget.style.background = isDark ? '#000000' : 'transparent';
            } else {
              // Keep red background when crossed
              e.currentTarget.style.background = '#ff0000';
              e.currentTarget.style.border = '2px solid #ff0000';
            }
          }}
        >
          <span style={{
            color: crossed ? 'white' : (isDark ? '#ffffff' : '#666'),
            fontSize: '18px',
            fontWeight: 'bold',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>×</span>
        </button>
      </div>
    </div>
  );
});

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string; }) {
  const isDark = isDarkMode();
  
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-lg rounded-2xl shadow-xl" style={{ 
        backgroundColor: isDark ? '#000000' : 'white'
      }}>
        <div className="rounded-t-2xl px-4 py-2 text-white flex items-center justify-between" style={{
          background: isDark ? '#3f3f3f' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))'
        }}>
          <div className="text-base font-semibold text-white">{title}</div>
          <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white" aria-label="Close">×</button>
        </div>
        <div className="p-4" style={{ backgroundColor: isDark ? '#000000' : 'white' }}>{children}</div>
      </div>
    </div>
  );
}

function DraggableCalc({ onClose }: { onClose: () => void }) {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (!isDark) return;
    
    // Force CSS injection for Calculator
    const styleId = 'force-calc-black-bg';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      [data-theme-type="dark"] .calculator-modal-force {
        background-color: var(--color-background) !important;
        background: var(--color-background) !important;
      }
      [data-theme-type="dark"] .calculator-modal-force *:not(.calculator-title-force) {
        background-color: var(--color-background) !important;
      }
      [data-theme-type="dark"] .calculator-display-force {
        background-color: var(--color-background) !important;
        color: var(--color-text-primary) !important;
      }
      [data-theme-type="dark"] .calculator-button-force {
        background-color: var(--color-background) !important;
        color: var(--color-text-primary) !important;
      }
      [data-theme-type="dark"] .calculator-title-force {
        background-color: transparent !important;
        background: transparent !important;
        color: var(--color-text-inverse) !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isDark]);
  
  const box = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: rect.left, dy: rect.top };
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp, { once: true });
  };
  const onMove = (e: MouseEvent) => {
    e.preventDefault();
    if (!box.current || !drag.current) return;
    const nx = Math.max(0, Math.min(window.innerWidth - 256, drag.current.dx + (e.clientX - drag.current.x)));
    const ny = Math.max(0, Math.min(window.innerHeight - 200, drag.current.dy + (e.clientY - drag.current.y)));
    box.current.style.left = `${nx}px`;
    box.current.style.top = `${ny}px`;
    box.current.style.transform = 'none';
  };
  const onUp = (e: MouseEvent) => { 
    e.preventDefault();
    document.removeEventListener("mousemove", onMove); 
    drag.current = null; 
  };

  return (
    <div 
      ref={box} 
      className={isDark ? 'calculator-modal-force' : ''}
      style={{ 
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 40,
        width: '256px',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        backgroundColor: isDark ? 'var(--color-background)' : 'white',
        border: `1px solid ${isDark ? '#4b5563' : 'var(--color-border)'}`
      }}
    >
      <div onMouseDown={onDown} className="flex cursor-move items-center justify-between rounded-t-2xl border-b px-3 py-2" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', borderColor: 'var(--color-primary)' }}>
        <div className={`text-sm font-semibold ${isDark ? 'calculator-title-force' : 'text-white'}`} style={{ userSelect: 'none' }}>Calculator</div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white"
          aria-label="Close"
          style={{ transition: 'all 0.2s ease-out' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = 'rgba(239, 29, 72, 0.2)';
            e.currentTarget.style.color = '#e11d48';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 29, 72, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >×</button>
      </div>
      <CalcPad />
    </div>
  );
}

function CalcPad() {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);
  
  const [val, setVal] = useState("0");
  const press = (t: string) => {
    if (t === "C") return setVal("0");
    if (t === "←") return setVal((v) => (v.length > 1 ? v.slice(0, -1) : "0"));
    if (t === "=") { try { const out = eval(val as unknown as string); setVal(String(out)); } catch { setVal("Error"); } return; }
    setVal((v) => (v === "0" ? t : v + t));
  };
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C","←"];
  return (
    <div style={{ padding: '12px', backgroundColor: isDark ? '#000000 !important' : 'white !important' }}>
      <div 
        className={isDark ? 'calculator-display-force' : ''}
        style={{ 
          marginBottom: '8px',
          borderRadius: '12px',
          border: '1px solid var(--color-primary)',
          padding: '8px',
          textAlign: 'right',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: '600',
          backgroundColor: isDark ? 'var(--color-background)' : 'white',
          color: isDark ? '#ffffff' : 'var(--color-primary)',
          borderColor: 'var(--color-primary)' 
        }}
      >
        {val}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {keys.map((k) => (
          <button 
            key={k} 
            onClick={() => press(k)} 
            className={isDark ? 'calculator-button-force' : ''}
            style={{ 
              borderRadius: '12px',
              border: '1px solid var(--color-primary)',
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              fontWeight: '600',
              transition: 'all 150ms ease-out',
              cursor: 'pointer',
              backgroundColor: isDark ? 'var(--color-background)' : 'white',
              color: isDark ? '#ffffff' : 'var(--color-primary)',
              borderColor: 'var(--color-primary)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'var(--color-background)' : 'white';
              e.currentTarget.style.color = isDark ? '#ffffff' : 'var(--color-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >{k}</button>
        ))}
      </div>
    </div>
  );
}

function LabDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"Serum" | "CSF" | "Blood" | "Urine" | "BMI">("Serum");
  const [q, setQ] = useState("");
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const checkDark = () => setIsDark(isDarkMode());
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme-type', 'data-theme-name']
    });
    
    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    if (!isDark) return;
    
    // Force CSS injection for Lab Values
    const styleId = 'force-lab-black-bg';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      [data-theme-type="dark"] .lab-modal-force {
        background-color: var(--color-background) !important;
        background: var(--color-background) !important;
        min-height: 100% !important;
      }
      [data-theme-type="dark"] .lab-modal-force::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-color: var(--color-background) !important;
        z-index: -1 !important;
      }
      [data-theme-type="dark"] .lab-modal-force * {
        background-color: var(--color-background) !important;
      }
      [data-theme-type="dark"] .lab-input-force {
        background-color: var(--color-background) !important;
        color: var(--color-text-primary) !important;
      }
      [data-theme-type="dark"] .lab-item-force {
        background-color: var(--color-background) !important;
        color: var(--color-text-primary) !important;
      }
      [data-theme-type="dark"] .lab-button-force {
        background-color: var(--color-background) !important;
        color: var(--color-text-primary) !important;
      }
      [data-theme-type="dark"] .lab-title-force {
        background-color: transparent !important;
        color: var(--color-text-inverse) !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isDark]);
  const all: Record<string, { name: string; value: string }[]> = {
    Serum: [
      { name: "Alanine aminotransferase (ALT)", value: "10-40 U/L | SI: 10-40 U/L" },
      { name: "Aspartate aminotransferase (AST)", value: "12-38 U/L | SI: 12-38 U/L" },
      { name: "Alkaline phosphatase", value: "25-100 U/L | SI: 25-100 U/L" },
      { name: "Amylase", value: "25-125 U/L | SI: 25-125 U/L" },
      { name: "Bilirubin (Total)", value: "0.1-1.0 mg/dL | SI: 2-17 μmol/L" },
      { name: "Bilirubin (Direct)", value: "0.0-0.3 mg/dL | SI: 0-5 μmol/L" },
      { name: "Calcium", value: "8.4-10.2 mg/dL | SI: 2.1-2.6 mmol/L" },
      { name: "Cholesterol (Total, Normal)", value: "<200 mg/dL | SI: <5.2 mmol/L" },
      { name: "Cholesterol (Total, High)", value: ">240 mg/dL | SI: >6.2 mmol/L" },
      { name: "Cholesterol (HDL)", value: "40-60 mg/dL | SI: 1.0-1.6 mmol/L" },
      { name: "Cholesterol (LDL)", value: "<160 mg/dL | SI: <4.2 mmol/L" },
      { name: "Triglycerides (Normal)", value: "<150 mg/dL | SI: <1.70 mmol/L" },
      { name: "Triglycerides (Borderline)", value: "151-199 mg/dL | SI: 1.71-2.25 mmol/L" },
      { name: "Cortisol (0800 h)", value: "5-23 μg/dL | SI: 138-635 nmol/L" },
      { name: "Cortisol (1600 h)", value: "3-15 μg/dL | SI: 82-413 nmol/L" },
      { name: "Cortisol (2000 h)", value: "<50% of 0800 h | SI: Fraction <0.50" },
      { name: "Creatine kinase (Male)", value: "25-90 U/L | SI: 25-90 U/L" },
      { name: "Creatine kinase (Female)", value: "10-70 U/L | SI: 10-70 U/L" },
      { name: "Creatinine", value: "0.6-1.2 mg/dL | SI: 53-106 μmol/L" },
      { name: "Urea nitrogen", value: "7-18 mg/dL | SI: 1.2-3.0 mmol/L" },
      { name: "Sodium (Na+)", value: "136-146 mEq/L | SI: 136-146 mmol/L" },
      { name: "Potassium (K+)", value: "3.5-5.0 mEq/L | SI: 3.5-5.0 mmol/L" },
      { name: "Chloride (Cl-)", value: "95-105 mEq/L | SI: 95-105 mmol/L" },
      { name: "Bicarbonate (HCO3-)", value: "22-28 mEq/L | SI: 22-28 mmol/L" },
      { name: "Magnesium (Mg2+)", value: "1.5-2.0 mEq/L | SI: 0.75-1.0 mmol/L" },
      { name: "Ferritin (Male)", value: "20-250 ng/mL | SI: 20-250 μg/L" },
      { name: "Ferritin (Female)", value: "10-120 ng/mL | SI: 10-120 μg/L" },
      { name: "FSH (Male)", value: "4-25 mIU/mL | SI: 4-25 U/L" },
      { name: "FSH (Female, premenopause)", value: "4-30 mIU/mL | SI: 4-30 U/L" },
      { name: "FSH (Female, midcycle peak)", value: "10-90 mIU/mL | SI: 10-90 U/L" },
      { name: "FSH (Female, postmenopause)", value: "40-250 mIU/mL | SI: 40-250 U/L" },
      { name: "Glucose (Fasting)", value: "70-110 mg/dL | SI: 3.8-5.6 mmol/L" },
      { name: "Glucose (Random, non-fasting)", value: "<140 mg/dL | SI: <7.7 mmol/L" },
      { name: "Growth hormone (Fasting)", value: "<5 ng/mL | SI: <5 μg/L" },
      { name: "Growth hormone (Provocative)", value: ">7 ng/mL | SI: >7 μg/L" },
      { name: "Iron (Male)", value: "65-175 μg/dL | SI: 11.6-31.3 μmol/L" },
      { name: "Iron (Female)", value: "50-170 μg/dL | SI: 9.0-30.4 μmol/L" },
      { name: "Total iron-binding capacity", value: "250-400 μg/dL | SI: 44.8-71.6 μmol/L" },
      { name: "Transferrin", value: "200-360 mg/dL | SI: 2.0-3.6 g/L" },
      { name: "Lactate dehydrogenase", value: "45-200 U/L | SI: 45-200 U/L" },
      { name: "LH (Male)", value: "6-23 mIU/mL | SI: 6-23 U/L" },
      { name: "LH (Female, follicular phase)", value: "5-30 mIU/mL | SI: 5-30 U/L" },
      { name: "LH (Female, midcycle)", value: "75-150 mIU/mL | SI: 75-150 U/L" },
      { name: "LH (Female, postmenopause)", value: "30-200 mIU/mL | SI: 30-200 U/L" },
      { name: "Osmolality", value: "275-295 mOsmol/kg H2O | SI: 275-295 mOsmol/kg H2O" },
      { name: "Parathyroid hormone (PTH)", value: "10-60 pg/mL | SI: 10-60 ng/mL" },
      { name: "Phosphorus (inorganic)", value: "3.0-4.5 mg/dL | SI: 1.0-1.5 mmol/L" },
      { name: "Prolactin (Male)", value: "<17 ng/mL | SI: <17 μg/L" },
      { name: "Prolactin (Female)", value: "<25 ng/mL | SI: <25 μg/L" },
      { name: "Proteins (Total)", value: "6.0-7.8 g/dL | SI: 60-78 g/L" },
      { name: "Albumin", value: "3.5-5.5 g/dL | SI: 35-55 g/L" },
      { name: "Globulin", value: "2.3-3.5 g/dL | SI: 23-35 g/L" },
      { name: "Troponin I", value: "<0.04 ng/dL | SI: <0.04 μg/L" },
      { name: "TSH", value: "0.4-4.0 μU/mL | SI: 0.4-4.0 μU/mL" },
      { name: "Thyroidal iodine (123I) uptake", value: "8%-30% of dose/24 h | SI: 0.08-0.30/24 h" },
      { name: "Thyroxine (T4)", value: "5-12 μg/dL | SI: 64-155 nmol/L" },
      { name: "Free T4", value: "0.9-1.7 ng/dL | SI: 12.0-21.9 pmol/L" },
      { name: "Triiodothyronine (T3)", value: "100-200 ng/dL | SI: 1.5-3.1 nmol/L" },
      { name: "T3 resin uptake", value: "25%-35% | SI: 0.25-0.35" },
      { name: "Uric acid", value: "3.0-8.2 mg/dL | SI: 0.18-0.48 mmol/L" },
      { name: "IgA", value: "76-390 mg/dL | SI: 0.76-3.90 g/L" },
      { name: "IgE", value: "0-380 IU/mL | SI: 0-380 kIU/L" },
      { name: "IgG", value: "650-1500 mg/dL | SI: 6.5-15.0 g/L" },
      { name: "IgM", value: "50-300 mg/dL | SI: 0.5-3.0 g/L" },
      { name: "ABG pH", value: "7.35-7.45 | SI: [H+] 36-44 nmol/L" },
      { name: "ABG Pco2", value: "33-45 mm Hg | SI: 4.4-5.9 kPa" },
      { name: "ABG Po2", value: "75-105 mm Hg | SI: 10.0-14.0 kPa" },
    ],
    CSF: [
      { name: "Cell count", value: "0-5/mm3 | SI: 0-5 x 106/L" },
      { name: "Chloride", value: "118-132 mEq/L | SI: 118-132 mmol/L" },
      { name: "Gamma globulin", value: "3%-12% total proteins | SI: 0.03-0.12" },
      { name: "Glucose", value: "40-70 mg/dL | SI: 2.2-3.9 mmol/L" },
      { name: "Pressure", value: "70-180 mm H2O | SI: 70-180 mm H2O" },
      { name: "Proteins, total", value: "<40 mg/dL | SI: <0.40 g/L" },
    ],
    Blood: [
      { name: "Erythrocyte count (Male)", value: "4.3-5.9 million/mm3 | SI: 4.3-5.9 x 1012/L" },
      { name: "Erythrocyte count (Female)", value: "3.5-5.5 million/mm3 | SI: 3.5-5.5 x 1012/L" },
      { name: "ESR (Male)", value: "0-15 mm/h | SI: 0-15 mm/h" },
      { name: "ESR (Female)", value: "0-20 mm/h | SI: 0-20 mm/h" },
      { name: "Hematocrit (Male)", value: "41%-53% | SI: 0.41-0.53" },
      { name: "Hematocrit (Female)", value: "36%-46% | SI: 0.36-0.46" },
      { name: "Hemoglobin (Male)", value: "13.5-17.5 g/dL | SI: 135-175 g/L" },
      { name: "Hemoglobin (Female)", value: "12.0-16.0 g/dL | SI: 120-160 g/L" },
      { name: "Hemoglobin A1c", value: "≤6% | SI: ≤42 mmol/mol" },
      { name: "Hemoglobin, plasma", value: "<4 mg/dL | SI: <0.62 mmol/L" },
      { name: "Leukocyte count (WBC)", value: "4500-11,000/mm3 | SI: 4.5-11.0 x 109/L" },
      { name: "Neutrophils, segmented", value: "54%-62% | SI: 0.54-0.62" },
      { name: "Neutrophils, bands", value: "3%-5% | SI: 0.03-0.05" },
      { name: "Eosinophils", value: "1%-3% | SI: 0.01-0.03" },
      { name: "Basophils", value: "0%-0.75% | SI: 0.00-0.0075" },
      { name: "Lymphocytes", value: "25%-33% | SI: 0.25-0.33" },
      { name: "Monocytes", value: "3%-7% | SI: 0.03-0.07" },
      { name: "CD4+ T-lymphocyte count", value: "≥500/mm3 | SI: ≥0.5 x 109/L" },
      { name: "Platelet count", value: "150,000-400,000/mm3 | SI: 150-400 x 109/L" },
      { name: "Reticulocyte count", value: "0.5%-1.5% | SI: 0.005-0.015" },
      { name: "D-Dimer", value: "≤250 ng/mL | SI: ≤1.4 nmol/L" },
      { name: "PTT (activated)", value: "25-40 seconds | SI: 25-40 seconds" },
      { name: "Prothrombin time (PT)", value: "11-15 seconds | SI: 11-15 seconds" },
      { name: "MCH", value: "25-35 pg/cell | SI: 0.39-0.54 fmol/cell" },
      { name: "MCHC", value: "31%-36% Hb/cell | SI: 4.8-5.6 mmol Hb/L" },
      { name: "MCV", value: "80-100 μm3 | SI: 80-100 fL" },
      { name: "Plasma volume (Male)", value: "25-43 mL/kg | SI: 0.025-0.043 L/kg" },
      { name: "Plasma volume (Female)", value: "28-45 mL/kg | SI: 0.028-0.045 L/kg" },
      { name: "Red cell volume (Male)", value: "20-36 mL/kg | SI: 0.020-0.036 L/kg" },
      { name: "Red cell volume (Female)", value: "19-31 mL/kg | SI: 0.019-0.031 L/kg" },
    ],
    Urine: [
      { name: "Calcium", value: "100-300 mg/24 h | SI: 2.5-7.5 mmol/24 h" },
      { name: "Creatinine clearance (Male)", value: "97-137 mL/min | SI: 97-137 mL/min" },
      { name: "Creatinine clearance (Female)", value: "88-128 mL/min | SI: 88-128 mL/min" },
      { name: "Osmolality", value: "50-1200 mOsmol/kg H2O | SI: 50-1200 mmol/kg" },
      { name: "Oxalate", value: "8-40 μg/mL | SI: 90-445 μmol/L" },
      { name: "Proteins, total", value: "<150 mg/24 h | SI: <0.15 g/24 h" },
      { name: "17-Hydroxycorticosteroids (Male)", value: "3.0-10.0 mg/24 h | SI: 8.2-27.6 μmol/24 h" },
      { name: "17-Hydroxycorticosteroids (Female)", value: "2.0-8.0 mg/24 h | SI: 5.5-22.0 μmol/24 h" },
      { name: "17-Ketosteroids (Male)", value: "8-20 mg/24 h | SI: 28-70 μmol/24 h" },
      { name: "17-Ketosteroids (Female)", value: "6-15 mg/24 h | SI: 21-52 μmol/24 h" },
    ],
    BMI: [
      { name: "Normal BMI (Adult)", value: "19-25 kg/m2" },
    ],
  };
  const list = (all[tab] ?? []).filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div 
      className={isDark ? 'lab-modal-force' : ''}
      style={{ 
        position: 'fixed',
        right: 0,
        zIndex: 40,
        width: '384px',
        borderLeft: '1px solid var(--color-primary)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        top: `${TOP_H}px`, 
        bottom: `${BOTTOM_H}px`, 
        backgroundColor: isDark ? 'var(--color-background)' : 'white',
        borderColor: 'var(--color-primary)',
        minHeight: '100%'
      }}
    >
      {/* Background fill to ensure complete coverage */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'var(--color-background)' : 'white',
        zIndex: -1
      }} />
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '1px solid var(--color-primary)', 
        padding: '8px 12px',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', 
        borderColor: 'var(--color-primary)' 
      }}>
        <div className={`text-sm font-semibold ${isDark ? 'lab-title-force' : 'text-white'}`} style={{ userSelect: 'none' }}>Lab Values</div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white"
          aria-label="Close"
          style={{ transition: 'all 0.2s ease-out' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = 'rgba(239, 29, 72, 0.2)';
            e.currentTarget.style.color = '#e11d48';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 29, 72, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >×</button>
      </div>
      <div style={{ padding: '12px', backgroundColor: isDark ? 'var(--color-background)' : 'white' }}>
        <input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="Search biomarker…" 
          className={`${isDark ? 'lab-input-force' : ''} w-full rounded-xl border p-2 outline-none`}
          style={{ 
            backgroundColor: isDark ? 'var(--color-background)' : 'white',
            color: isDark ? 'var(--color-text-primary)' : '#000000',
            borderColor: 'var(--color-border)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-light)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = isDark ? 'var(--color-background)' : 'white';
          }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 12px', backgroundColor: isDark ? 'var(--color-background)' : 'white' }}>
        {(["Serum","CSF","Blood","Urine","BMI"] as const).map((t)=>(
          <button
            key={t}
            onClick={()=>setTab(t)}
            className={["rounded-xl border px-3 py-1 text-sm", tab===t? "text-white" : ""].join(" ")}
            style={{
              ...(tab === t ? {
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                borderColor: 'var(--color-primary)'
              } : {
                backgroundColor: isDark ? '#000000' : 'white',
                color: isDark ? '#ffffff' : 'var(--color-primary)',
                borderColor: isDark ? '#4b5563' : 'var(--color-primary)'
              }),
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
              if (tab === t) {
                e.currentTarget.style.opacity = '0.9';
              } else {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              if (tab === t) {
                e.currentTarget.style.opacity = '1';
              } else {
                e.currentTarget.style.backgroundColor = isDark ? '#000000' : 'white';
                e.currentTarget.style.color = isDark ? '#ffffff' : 'var(--color-primary)';
              }
            }}
          >{t}</button>
        ))}
      </div>
      <div style={{ 
        marginTop: '12px', 
        maxHeight: 'calc(100% - 130px)', 
        overflow: 'auto', 
        padding: '0 12px 80px 12px',
        backgroundColor: isDark ? '#000000 !important' : 'white !important' 
      }}>
        {list.length===0 && (
          <div 
            style={{ 
              padding: '8px', 
              fontSize: '14px',
              color: isDark ? '#ffffff' : '#6b7280',
              backgroundColor: isDark ? '#000000 !important' : 'white !important'
            }}
          >
            No results.
          </div>
        )}
        {list.map((row,i)=>(
          <div 
            key={row.name+"-"+i} 
            style={{ 
              marginBottom: '8px',
              borderRadius: '12px',
              border: '1px solid var(--color-primary)',
              padding: '12px',
              backgroundColor: isDark ? '#000000 !important' : 'white !important',
              borderColor: 'var(--color-primary)' 
            }}
          >
            <div 
              style={{ 
                fontSize: '14px',
                fontWeight: '600',
                color: '#ffffff !important'
              }}
            >
              {row.name}
            </div>
            <div 
              style={{ color: '#ffffff !important' }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

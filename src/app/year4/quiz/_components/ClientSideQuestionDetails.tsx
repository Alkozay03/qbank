"use client";

import { memo, useEffect } from "react";
import Image from "next/image";
import QuestionDiscussion from "./QuestionDiscussion";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme-type') === 'dark';
};

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

type QuestionFirstAttemptStats = {
  totalFirstAttempts: number;
  firstAttemptCorrect: number;
  percent: number | null;
  choiceFirstAttempts: Record<string, { count: number; percent: number | null }>;
};

type SectionHTML = { stem: string; explanation: string; objective: string };

const TAG_LABELS: Record<DisplayTagType, string> = {
  SUBJECT: "Subject/Discipline",
  SYSTEM: "System",
  ROTATION: "Rotation",
  RESOURCE: "Resource",
};

const DEFAULT_OBJECTIVE = "This section summarizes the key takeaway for rapid review.";

function toHTML(s: string) { 
  return s.replace(/\n/g, "<br/>"); 
}

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

interface ClientSideQuestionDetailsProps {
  currentItem: Item;
  statsByQuestion: Record<string, QuestionFirstAttemptStats>;
  questionSeconds: number;
  fontScale: number;
  sectionHTMLByItem: Record<string, SectionHTML>;
}

export const ClientSideQuestionDetails = memo(function ClientSideQuestionDetails({
  currentItem,
  statsByQuestion,
  questionSeconds,
  fontScale,
  sectionHTMLByItem
}: ClientSideQuestionDetailsProps) {
  const isDark = isDarkMode();
  const wasCorrect = currentItem.responses?.[0]?.isCorrect ?? null;

  // CSS injection for dark mode styling of HTML content
  useEffect(() => {
    if (isDark) {
      const existingStyle = document.querySelector('#client-side-details-dark-mode-css');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'client-side-details-dark-mode-css';
        style.innerHTML = `
          [data-theme-type="dark"] .prose * {
            color: #ffffff !important;
          }
          [data-theme-type="dark"] .quiz-explanation * {
            color: #ffffff !important;
          }
          [data-theme-type="dark"] .quiz-objective * {
            color: #ffffff !important;
          }
          [data-theme-type="dark"] [data-section="explanation"] * {
            color: #ffffff !important;
          }
          [data-theme-type="dark"] [data-section="objective"] * {
            color: #ffffff !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [isDark]);
  
  // Calculate tags by type
  const tagsByType: Partial<Record<DisplayTagType, string[]>> = {};
  (currentItem.question.tags ?? []).forEach((tag) => {
    if (!tag?.label) return;
    const rawType = tag.type;
    if (!rawType || !(rawType in TAG_LABELS)) return;
    const key = rawType as DisplayTagType;
    const label = tag.label.trim();
    if (!label) return;
    const bucket = tagsByType[key] ?? [];
    if (!bucket.includes(label)) {
      bucket.push(label);
      tagsByType[key] = bucket;
    }
  });

  const references = parseReferences(currentItem.question.references);
  const screenshotUrl = currentItem.question.iduScreenshotUrl
    ? currentItem.question.iduScreenshotUrl.trim()
    : "";
    
  const occurrenceItems = (currentItem.question.occurrences ?? [])
    .map((occ) => {
      const pieces: string[] = [];
      // Only include rotation if it's not just "Y4" or "Y5" (those are year indicators, not rotations)
      if (occ?.rotation && occ.rotation.trim() && !occ.rotation.match(/^Y[45]$/i)) {
        pieces.push(occ.rotation.trim());
      }
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
    <div className={`mt-5 rounded-2xl border p-4 ${!isDark ? 'bg-white' : ''}`} 
         style={{ 
           borderColor: 'var(--color-primary)',
           backgroundColor: isDark ? '#000000' : ''
         }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-center rounded-xl p-3"
             style={{ 
               backgroundColor: isDark ? '#000000' : (wasCorrect ? '#f0f9ff' : '#fef2f2')
             }}>
          <span className="text-lg font-extrabold" style={{ color: isDark ? "#ffffff" : (wasCorrect ? "#16a34a" : "#e11d48") }}>
            {wasCorrect ? "Correct" : "Incorrect"}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div 
              className="text-3xl font-extrabold"
              style={{
                ...(isDark ? {
                  color: '#ffffff'
                } : {
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                })
              }}
            >
              {percentLabel}
            </div>
            <div className="text-xs leading-tight" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)', opacity: isDark ? 1 : 0.6 }}>Answered Correctly</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div 
              className="text-lg font-extrabold"
              style={{
                ...(isDark ? {
                  color: '#ffffff'
                } : {
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                })
              }}
            >
              {Math.floor(questionSeconds / 60)} Mins, {questionSeconds % 60} Secs
            </div>
            <div className="text-xs" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)', opacity: isDark ? 1 : 0.6 }}>Time Spent on Question</div>
          </div>
        </div>
      </div>

      {screenshotUrl ? (
        <div className="mt-6">
          <div className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>IDU Screenshot:</div>
          <div className={`mt-3 overflow-hidden rounded-2xl border ${!isDark ? 'border-[#E6F0F7] bg-[#F8FBFD]' : 'border-[#333333]'}`}
               style={{ backgroundColor: isDark ? '#000000' : '' }}>
            <Image
              src={screenshotUrl}
              alt="IDU Screenshot"
              width={1280}
              height={720}
              className={`h-auto w-full max-h-[480px] object-contain ${!isDark ? 'bg-[#F8FBFD]' : ''}`}
              style={{ backgroundColor: isDark ? '#000000' : '' }}
              unoptimized
            />
          </div>
        </div>
      ) : null}

      {occurrenceItems.length ? (
        <div className="mt-6">
          <div className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>Question Occurrences:</div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {occurrenceItems.map((occ) => (
              <li
                key={occ.key}
                className="rounded-xl border border-transparent px-3 py-2 text-sm text-white font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))'
                }}
              >
                {occ.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="quiz-explanation mt-6">
        <div className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>Explanation:</div>
        
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
          className="prose mt-2 max-w-none"
          style={{ 
            fontSize: `${fontScale}rem`,
            color: isDark ? '#ffffff' : '#0f172a'
          }}
          dangerouslySetInnerHTML={{
            __html:
              (currentItem?.id && sectionHTMLByItem[currentItem.id]?.explanation) ||
              (currentItem?.question.explanation
                ? toHTML(currentItem.question.explanation)
                : `<div class='text-sm' style='color: ${isDark ? '#ffffff' : '#64748b'}'>No explanation provided.</div>`)
          }}
        />
      </div>

      <div className="quiz-objective mt-6" style={{ fontSize: `${fontScale}rem` }}>
        <div className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>Educational Objective:</div>
        <div
          data-section="objective"
          className="mt-2"
          style={{ color: isDark ? '#ffffff' : '#0f172a' }}
          dangerouslySetInnerHTML={{
            __html: (currentItem?.id && sectionHTMLByItem[currentItem.id]?.objective) || toHTML(DEFAULT_OBJECTIVE)
          }}
        />
      </div>

      <div className="mt-6">
        <div className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : 'var(--color-primary)' }}>References:</div>
        {references.length ? (
          <ul className="mt-2 list-inside list-disc space-y-1" style={{ color: isDark ? '#ffffff' : 'var(--text-neutral-900)' }}>
            {references.map((ref, idx) => {
              const isLink = /^https?:\/\//i.test(ref);
              return (
                <li key={`${ref}-${idx}`}>
                  {isLink ? (
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 transition"
                      style={{
                        color: isDark ? '#ffffff' : 'var(--color-primary)',
                        opacity: isDark ? 1 : 0.7,
                        textDecorationColor: isDark ? '#ffffff' : 'var(--color-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = isDark ? '1' : '0.7';
                      }}
                    >
                      {ref}
                    </a>
                  ) : (
                    <span style={{ color: isDark ? '#ffffff' : 'inherit' }}>{ref}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2 text-sm" style={{ color: isDark ? '#ffffff' : 'var(--text-slate-500)' }}>No references provided.</div>
        )}
      </div>

      <div className="mt-6 border-t border-[#E6F0F7] pt-3">
        <div className="flex flex-wrap gap-6 text-sm">
          {Object.entries(TAG_LABELS).map(([type, label]) => {
            const typed = type as DisplayTagType;
            const display = tagsByType?.[typed] ?? [];
            return (
              <div key={typed}>
                <div 
                  className="font-semibold"
                  style={{
                    ...(isDark ? {
                      color: '#ffffff'
                    } : {
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    })
                  }}
                >
                  {label}:
                </div>
                <div className="mt-1" style={{ color: isDark ? '#ffffff' : 'var(--text-neutral-900)' }}>
                  {display.length ? (
                    display.map((value, idx) => (
                      <span
                        key={`${typed}-${idx}`}
                        className="mr-2 inline-block rounded-full border border-primary px-2 py-0.5 text-xs text-primary"
                        style={{
                          borderColor: isDark ? '#ffffff' : 'var(--color-primary)',
                          color: isDark ? '#ffffff' : 'var(--color-primary)'
                        }}
                      >
                        {value}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs" style={{ color: isDark ? '#ffffff' : 'var(--text-slate-500)' }}>Not specified</span>
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
});
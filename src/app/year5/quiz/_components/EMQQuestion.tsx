"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

// Helper to check if dark mode is active
const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme-type') === 'dark';
};

type EMQOption = {
  id: string;
  text: string;
};

type EMQStem = {
  id: string;
  text: string;
  correctOptionIds: string[];
  stemImageUrl?: string | null;
};

type EMQQuestionProps = {
  theme: string;
  options: EMQOption[];
  stems: EMQStem[];
  submitted: boolean;
  submittedAnswers?: Record<string, string>; // stemId -> optionId
  fontScale: number;
  onAnswersChange: (_answers: Record<string, string>) => void;
  onSubmit: () => void;
};

const EMQQuestion = ({
  theme,
  options,
  stems,
  submitted,
  submittedAnswers = {},
  fontScale,
  onAnswersChange,
  onSubmit,
}: EMQQuestionProps) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(submittedAnswers);
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

  const handleStemAnswerChange = (stemId: string, optionId: string) => {
    if (submitted) return;
    
    const newAnswers = { ...selectedAnswers, [stemId]: optionId };
    setSelectedAnswers(newAnswers);
    onAnswersChange(newAnswers);
  };

  const allStemsAnswered = stems.every(stem => selectedAnswers[stem.id]);

  // Generate option labels (A, B, C, ...)
  const getOptionLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // 65 is 'A'
  };

  return (
    <div className="space-y-4">
      {/* Theme/Lead-in - Matches MCQ stem styling */}
      <div 
        className="quiz-question rounded-2xl border p-5"
        style={{ 
          borderColor: 'var(--color-primary)',
          backgroundColor: isDark ? '#000000' : '#ffffff',
          transition: 'all 0.2s ease-out'
        }}
      >
        <div 
          className="text-[15px] leading-relaxed prose prose-sm max-w-none"
          style={{ 
            fontSize: `${fontScale}rem`,
            color: isDark ? 'var(--color-text-primary)' : 'var(--color-primary-light)',
            opacity: isDark ? 1 : 0.85
          }}
          dangerouslySetInnerHTML={{ __html: theme }}
        />
      </div>

      {/* Options List - Simple border like MCQ choices */}
      <div 
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: isDark ? '#000000' : '#ffffff',
          borderColor: 'var(--color-primary)',
          transition: 'all 0.2s ease-out'
        }}
      >
        <h3 
          className="mb-3 font-bold text-sm" 
          style={{ 
            fontSize: `${fontScale}rem`,
            color: 'var(--color-primary)'
          }}
        >
          Options:
        </h3>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <div 
              key={option.id} 
              className="flex gap-3 items-start"
              style={{ fontSize: `${fontScale}rem` }}
            >
              <span 
                className="grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
                  color: isDark ? 'var(--color-text-primary)' : 'var(--color-primary)'
                }}
              >
                {getOptionLabel(idx)}
              </span>
              <div 
                className="flex-1 prose prose-sm max-w-none"
                style={{ color: isDark ? 'var(--color-text-primary)' : '#171717' }}
                dangerouslySetInnerHTML={{ __html: option.text }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stems - Each stem is like an MCQ question */}
      <div className="space-y-4">
        <h3 
          className="font-bold text-sm" 
          style={{ 
            fontSize: `${fontScale}rem`,
            color: 'var(--color-primary)'
          }}
        >
          Match each scenario to the most appropriate option:
        </h3>
        
        {stems.map((stem, stemIdx) => {
          const selectedOptionId = selectedAnswers[stem.id];
          const isCorrect = submitted && stem.correctOptionIds.includes(selectedOptionId);
          const isIncorrect = submitted && selectedOptionId && !stem.correctOptionIds.includes(selectedOptionId);
          
          return (
            <div 
              key={stem.id}
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: isDark ? '#000000' : '#ffffff',
                borderColor: 'var(--color-primary)',
                transition: 'all 0.2s ease-out'
              }}
            >
              {/* Stem text */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="grid h-5 w-5 place-items-center rounded-full border text-[11px] font-bold"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: isDark ? '#4b5563' : 'var(--color-primary)',
                      color: isDark ? 'var(--color-text-primary)' : 'var(--color-primary)'
                    }}
                  >
                    {stemIdx + 1}
                  </span>
                  <div 
                    className="prose prose-sm max-w-none flex-1 text-[15px] leading-relaxed"
                    style={{ 
                      fontSize: `${fontScale}rem`,
                      color: isDark ? 'var(--color-text-primary)' : '#171717'
                    }}
                    dangerouslySetInnerHTML={{ __html: stem.text }}
                  />
                </div>
              </div>

              {/* Stem image if present */}
              {stem.stemImageUrl && (
                <div className="mb-3">
                  <Image
                    src={stem.stemImageUrl}
                    alt={`Stem ${stemIdx + 1} image`}
                    width={800}
                    height={600}
                    className="max-h-80 w-full object-contain rounded-lg border"
                    style={{ borderColor: isDark ? '#4b5563' : '#E6F0F7' }}
                    unoptimized
                  />
                </div>
              )}

              {/* Answer selector - inline like MCQ */}
              <div className="flex items-center gap-3 flex-wrap">
                <label 
                  htmlFor={`stem-${stem.id}`}
                  className="text-sm font-bold"
                  style={{ 
                    fontSize: `${fontScale * 0.9}rem`,
                    color: 'var(--color-primary)'
                  }}
                >
                  Your answer:
                </label>
                <select
                  id={`stem-${stem.id}`}
                  value={selectedAnswers[stem.id] || ""}
                  onChange={(e) => handleStemAnswerChange(stem.id, e.target.value)}
                  disabled={submitted}
                  className="rounded-lg border px-3 py-1.5 transition-colors disabled:cursor-not-allowed"
                  style={{ 
                    fontSize: `${fontScale}rem`,
                    backgroundColor: isDark ? '#000000' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                    color: 'var(--color-primary)'
                  }}
                >
                  <option value="">Select...</option>
                  {options.map((option, idx) => (
                    <option key={option.id} value={option.id}>
                      {getOptionLabel(idx)}
                    </option>
                  ))}
                </select>

                {/* Show tick/cross and stats after submission */}
                {submitted && (
                  <>
                    {isCorrect ? (
                      <span className="text-lg font-extrabold" style={{ color: isDark ? "#ffffff" : "#16a34a" }} title="Correct">✓</span>
                    ) : (
                      <span className="text-lg font-extrabold" style={{ color: isDark ? "#ffffff" : "#e11d48" }} title="Incorrect">×</span>
                    )}
                  </>
                )}

                {/* Show correct answer if wrong */}
                {submitted && isIncorrect && (
                  <span 
                    className="text-xs font-medium"
                    style={{ color: isDark ? '#10b981' : '#16a34a' }}
                  >
                    Correct: {stem.correctOptionIds.map(id => {
                      const optIdx = options.findIndex(opt => opt.id === id);
                      return optIdx >= 0 ? getOptionLabel(optIdx) : '';
                    }).join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button - matches MCQ styling */}
      {!submitted && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onSubmit}
            disabled={!allStemsAnswered}
            className="rounded-2xl px-6 py-2 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            style={{
              backgroundColor: allStemsAnswered 
                ? (isDark ? '#56A2CD' : 'var(--color-primary)') 
                : undefined,
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                } else {
                  e.currentTarget.style.backgroundColor = '#2F6F8F';
                }
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 10px 25px rgba(75, 85, 99, 0.25)' 
                  : '0 10px 25px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (allStemsAnswered) {
                e.currentTarget.style.backgroundColor = isDark ? '#56A2CD' : 'var(--color-primary)';
              }
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
            }}
          >
            Submit Answer
          </button>
        </div>
      )}
    </div>
  );
};

export default EMQQuestion;

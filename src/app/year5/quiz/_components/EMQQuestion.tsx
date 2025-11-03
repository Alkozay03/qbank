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
    <div className="space-y-6">
      {/* Theme/Lead-in */}
      <div 
        className="prose prose-sm max-w-none"
        style={{ 
          fontSize: `${fontScale}em`,
          color: isDark ? 'var(--color-text-primary)' : '#171717'
        }}
        dangerouslySetInnerHTML={{ __html: theme }}
      />

      {/* Options List */}
      <div 
        className="rounded-lg border p-4"
        style={{
          backgroundColor: isDark ? '#1a1a1a' : '#F8FBFD',
          borderColor: isDark ? '#374151' : '#E6F0F7',
          transition: 'all 0.2s ease-out'
        }}
      >
        <h3 
          className="mb-3 font-semibold" 
          style={{ 
            fontSize: `${fontScale}em`,
            color: isDark ? '#56A2CD' : 'var(--color-primary)'
          }}
        >
          Options:
        </h3>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <div 
              key={option.id} 
              className="flex gap-3"
              style={{ fontSize: `${fontScale}em` }}
            >
              <span 
                className="font-semibold min-w-[2rem]"
                style={{ color: isDark ? '#56A2CD' : 'var(--color-primary)' }}
              >
                {getOptionLabel(idx)}.
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

      {/* Stems */}
      <div className="space-y-6">
        <h3 
          className="font-semibold" 
          style={{ 
            fontSize: `${fontScale}em`,
            color: isDark ? '#56A2CD' : 'var(--color-primary)'
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
              className="rounded-lg border p-4 transition-colors"
              style={{
                backgroundColor: submitted && isCorrect 
                  ? (isDark ? '#064e3b' : '#dcfce7')
                  : submitted && isIncorrect
                  ? (isDark ? '#7f1d1d' : '#fee2e2')
                  : (isDark ? '#000000' : '#ffffff'),
                borderColor: submitted && isCorrect
                  ? (isDark ? '#10b981' : '#22c55e')
                  : submitted && isIncorrect
                  ? (isDark ? '#ef4444' : '#ef4444')
                  : (isDark ? '#374151' : '#E6F0F7')
              }}
            >
              {/* Stem number and text */}
              <div className="mb-3">
                <span 
                  className="font-semibold" 
                  style={{ 
                    fontSize: `${fontScale}em`,
                    color: isDark ? '#56A2CD' : 'var(--color-primary)'
                  }}
                >
                  {stemIdx + 1}.
                </span>
                <div 
                  className="mt-2 prose prose-sm max-w-none"
                  style={{ 
                    fontSize: `${fontScale}em`,
                    color: isDark ? 'var(--color-text-primary)' : '#171717'
                  }}
                  dangerouslySetInnerHTML={{ __html: stem.text }}
                />
              </div>

              {/* Stem image if present */}
              {stem.stemImageUrl && (
                <div className="mb-3">
                  <Image
                    src={stem.stemImageUrl}
                    alt={`Stem ${stemIdx + 1} image`}
                    width={800}
                    height={600}
                    className="max-h-80 w-full object-contain rounded border"
                    style={{ borderColor: isDark ? '#374151' : '#E6F0F7' }}
                    unoptimized
                  />
                </div>
              )}

              {/* Answer selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <label 
                  htmlFor={`stem-${stem.id}`}
                  className="font-medium"
                  style={{ 
                    fontSize: `${fontScale * 0.9}em`,
                    color: isDark ? 'var(--color-text-primary)' : '#374151'
                  }}
                >
                  Your answer:
                </label>
                <select
                  id={`stem-${stem.id}`}
                  value={selectedAnswers[stem.id] || ""}
                  onChange={(e) => handleStemAnswerChange(stem.id, e.target.value)}
                  disabled={submitted}
                  className="rounded-lg border px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-100"
                  style={{ 
                    fontSize: `${fontScale}em`,
                    backgroundColor: submitted && isCorrect
                      ? (isDark ? '#065f46' : '#d1fae5')
                      : submitted && isIncorrect
                      ? (isDark ? '#991b1b' : '#fecaca')
                      : (isDark ? '#1a1a1a' : '#ffffff'),
                    borderColor: submitted && isCorrect
                      ? '#22c55e'
                      : submitted && isIncorrect
                      ? '#ef4444'
                      : (isDark ? '#4b5563' : '#d1d5db'),
                    color: submitted && isCorrect
                      ? (isDark ? '#10b981' : '#065f46')
                      : submitted && isIncorrect
                      ? (isDark ? '#ef4444' : '#991b1b')
                      : (isDark ? 'var(--color-text-primary)' : '#171717')
                  }}
                >
                  <option value="">Select an option...</option>
                  {options.map((option, idx) => (
                    <option key={option.id} value={option.id}>
                      {getOptionLabel(idx)}
                    </option>
                  ))}
                </select>

                {/* Show correct answer after submission if wrong */}
                {submitted && isIncorrect && (
                  <span 
                    className="text-sm font-medium"
                    style={{ color: isDark ? '#10b981' : '#16a34a' }}
                  >
                    Correct: {stem.correctOptionIds.map(id => {
                      const optIdx = options.findIndex(opt => opt.id === id);
                      return optIdx >= 0 ? getOptionLabel(optIdx) : '';
                    }).join(', ')}
                  </span>
                )}

                {/* Show checkmark if correct */}
                {submitted && isCorrect && (
                  <span 
                    className="font-bold"
                    style={{ color: isDark ? '#10b981' : '#16a34a' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="flex justify-end">
          <button
            onClick={onSubmit}
            disabled={!allStemsAnswered}
            className="rounded-2xl px-6 py-2 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            style={{
              backgroundColor: allStemsAnswered 
                ? (isDark ? '#56A2CD' : 'var(--color-primary)') 
                : '#9ca3af',
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
              e.currentTarget.style.backgroundColor = allStemsAnswered
                ? (isDark ? '#56A2CD' : 'var(--color-primary)')
                : '#9ca3af';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
            }}
          >
            Submit All Answers
          </button>
        </div>
      )}
    </div>
  );
};

export default EMQQuestion;

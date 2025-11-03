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
        className="rounded-xl border-l-4 p-5 shadow-sm"
        style={{ 
          backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
          borderColor: isDark ? '#56A2CD' : 'var(--color-primary)',
          transition: 'all 0.2s ease-out'
        }}
      >
        <div 
          className="prose prose-sm max-w-none font-medium"
          style={{ 
            fontSize: `${fontScale * 1.05}em`,
            color: isDark ? '#e0f2fe' : '#0c4a6e'
          }}
          dangerouslySetInnerHTML={{ __html: theme }}
        />
      </div>

      {/* Options List */}
      <div 
        className="rounded-xl border-2 p-6 shadow-md"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#475569' : '#cbd5e1',
          transition: 'all 0.2s ease-out'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: isDark ? '#56A2CD' : 'var(--color-primary)' }}
          />
          <h3 
            className="font-bold tracking-tight" 
            style={{ 
              fontSize: `${fontScale * 1.1}em`,
              color: isDark ? '#56A2CD' : 'var(--color-primary)'
            }}
          >
            Available Options
          </h3>
        </div>
        <div className="space-y-3">
          {options.map((option, idx) => (
            <div 
              key={option.id} 
              className="flex gap-4 p-3 rounded-lg transition-all"
              style={{ 
                fontSize: `${fontScale}em`,
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}
            >
              <span 
                className="font-bold min-w-[2.5rem] text-center px-2 py-1 rounded-md"
                style={{ 
                  backgroundColor: isDark ? '#1e40af' : '#dbeafe',
                  color: isDark ? '#93c5fd' : '#1e40af'
                }}
              >
                {getOptionLabel(idx)}
              </span>
              <div 
                className="flex-1 prose prose-sm max-w-none"
                style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                dangerouslySetInnerHTML={{ __html: option.text }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stems */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: isDark ? '#56A2CD' : 'var(--color-primary)' }}
          />
          <h3 
            className="font-bold tracking-tight" 
            style={{ 
              fontSize: `${fontScale * 1.1}em`,
              color: isDark ? '#56A2CD' : 'var(--color-primary)'
            }}
          >
            Match each scenario to the most appropriate option
          </h3>
        </div>
        
        {stems.map((stem, stemIdx) => {
          const selectedOptionId = selectedAnswers[stem.id];
          const isCorrect = submitted && stem.correctOptionIds.includes(selectedOptionId);
          const isIncorrect = submitted && selectedOptionId && !stem.correctOptionIds.includes(selectedOptionId);
          
          return (
            <div 
              key={stem.id}
              className="rounded-xl border-2 p-5 transition-all shadow-md"
              style={{
                backgroundColor: submitted && isCorrect 
                  ? (isDark ? '#064e3b' : '#dcfce7')
                  : submitted && isIncorrect
                  ? (isDark ? '#7f1d1d' : '#fee2e2')
                  : (isDark ? '#1e293b' : '#ffffff'),
                borderColor: submitted && isCorrect
                  ? (isDark ? '#10b981' : '#22c55e')
                  : submitted && isIncorrect
                  ? (isDark ? '#ef4444' : '#ef4444')
                  : (isDark ? '#475569' : '#cbd5e1'),
                transform: submitted && isCorrect ? 'scale(1.01)' : 'scale(1)'
              }}
            >
              {/* Stem number and text */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span 
                    className="font-bold px-3 py-1.5 rounded-lg"
                    style={{ 
                      fontSize: `${fontScale * 0.95}em`,
                      backgroundColor: isDark ? '#1e40af' : '#dbeafe',
                      color: isDark ? '#93c5fd' : '#1e40af'
                    }}
                  >
                    Scenario {stemIdx + 1}
                  </span>
                  {submitted && isCorrect && (
                    <span 
                      className="font-bold text-lg px-2"
                      style={{ color: isDark ? '#10b981' : '#16a34a' }}
                    >
                      ✓ Correct
                    </span>
                  )}
                  {submitted && isIncorrect && (
                    <span 
                      className="font-bold text-lg px-2"
                      style={{ color: isDark ? '#ef4444' : '#dc2626' }}
                    >
                      ✗ Incorrect
                    </span>
                  )}
                </div>
                <div 
                  className="prose prose-sm max-w-none leading-relaxed"
                  style={{ 
                    fontSize: `${fontScale}em`,
                    color: isDark ? '#e2e8f0' : '#1e293b'
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
              <div className="flex items-center gap-3 flex-wrap mt-4 p-4 rounded-lg" style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
              }}>
                <label 
                  htmlFor={`stem-${stem.id}`}
                  className="font-semibold"
                  style={{ 
                    fontSize: `${fontScale * 0.95}em`,
                    color: isDark ? '#94a3b8' : '#475569'
                  }}
                >
                  Select answer:
                </label>
                <select
                  id={`stem-${stem.id}`}
                  value={selectedAnswers[stem.id] || ""}
                  onChange={(e) => handleStemAnswerChange(stem.id, e.target.value)}
                  disabled={submitted}
                  className="rounded-lg border-2 px-4 py-2.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-100 shadow-sm"
                  style={{ 
                    fontSize: `${fontScale}em`,
                    backgroundColor: submitted && isCorrect
                      ? (isDark ? '#065f46' : '#d1fae5')
                      : submitted && isIncorrect
                      ? (isDark ? '#991b1b' : '#fecaca')
                      : (isDark ? '#1e293b' : '#ffffff'),
                    borderColor: submitted && isCorrect
                      ? '#22c55e'
                      : submitted && isIncorrect
                      ? '#ef4444'
                      : (isDark ? '#475569' : '#cbd5e1'),
                    color: submitted && isCorrect
                      ? (isDark ? '#10b981' : '#065f46')
                      : submitted && isIncorrect
                      ? (isDark ? '#ef4444' : '#991b1b')
                      : (isDark ? '#e2e8f0' : '#1e293b')
                  }}
                >
                  <option value="">Choose option...</option>
                  {options.map((option, idx) => (
                    <option key={option.id} value={option.id}>
                      Option {getOptionLabel(idx)}
                    </option>
                  ))}
                </select>

                {/* Show correct answer after submission if wrong */}
                {submitted && isIncorrect && (
                  <div 
                    className="px-3 py-1.5 rounded-lg font-semibold text-sm"
                    style={{ 
                      backgroundColor: isDark ? '#064e3b' : '#d1fae5',
                      color: isDark ? '#10b981' : '#065f46',
                      border: `1px solid ${isDark ? '#059669' : '#10b981'}`
                    }}
                  >
                    Correct answer: {stem.correctOptionIds.map(id => {
                      const optIdx = options.findIndex(opt => opt.id === id);
                      return optIdx >= 0 ? getOptionLabel(optIdx) : '';
                    }).join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="flex flex-col items-end gap-2 mt-8">
          {!allStemsAnswered && (
            <p 
              className="text-sm font-medium px-3 py-1 rounded-lg"
              style={{ 
                color: isDark ? '#fbbf24' : '#d97706',
                backgroundColor: isDark ? '#422006' : '#fef3c7',
                border: `1px solid ${isDark ? '#92400e' : '#fcd34d'}`
              }}
            >
              Please answer all scenarios before submitting
            </p>
          )}
          <button
            onClick={onSubmit}
            disabled={!allStemsAnswered}
            className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-lg text-lg"
            style={{
              backgroundColor: allStemsAnswered 
                ? (isDark ? '#56A2CD' : 'var(--color-primary)') 
                : '#6b7280',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                if (!isDark) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                } else {
                  e.currentTarget.style.backgroundColor = '#2F6F8F';
                }
                e.currentTarget.style.boxShadow = isDark 
                  ? '0 15px 35px rgba(86, 162, 205, 0.4)' 
                  : '0 15px 35px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = allStemsAnswered
                ? (isDark ? '#56A2CD' : 'var(--color-primary)')
                : '#6b7280';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
            }}
          >
            Submit All Answers ({stems.length} scenarios)
          </button>
        </div>
      )}
    </div>
  );
};

export default EMQQuestion;

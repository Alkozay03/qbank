// src/components/FormattedText.tsx
import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export default function FormattedText({ text, className = "" }: FormattedTextProps) {
  const formatText = (text: string) => {
    // Split text into paragraphs first (by double line breaks)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      // Process each paragraph for formatting
      const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line);
      
      return (
        <div key={paragraphIndex} className={paragraphIndex > 0 ? "mt-4" : ""}>
          {lines.map((line, lineIndex) => {
            // Check if this is a bullet point
            const isBullet = line.startsWith('•') || line.startsWith('- ');
            
            // Process bold text (**text**)
            const parts = line.split(/(\*\*.*?\*\*)/g);
            const formattedLine = parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                const boldText = part.slice(2, -2);
                return (
                  <strong key={partIndex} className="font-semibold text-slate-800">
                    {boldText}
                  </strong>
                );
              }
              return part;
            });
            
            if (isBullet) {
              return (
                <div key={lineIndex} className="flex items-start mt-2">
                  <span className="text-secondary mr-2 mt-1 flex-shrink-0">•</span>
                  <span>{formattedLine}</span>
                </div>
              );
            }
            
            return (
              <div key={lineIndex} className={lineIndex > 0 ? "mt-2" : ""}>
                {formattedLine}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className={`leading-relaxed ${className}`}>
      {formatText(text)}
    </div>
  );
}
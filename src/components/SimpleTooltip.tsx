"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface SimpleTooltipProps {
  text: string;
  children: React.ReactNode;
}

export default function SimpleTooltip({ text, children }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 150); // Reduced from 400ms to 150ms for faster appearance
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const tooltip = isVisible ? createPortal(
    <div
      className="fixed z-[10000] pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        animation: 'tooltipFadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }}
    >
      <div className="bg-gradient-to-r from-[#F3F9FC] to-[#E6F0F7] text-[#2F6F8F] text-xs font-medium px-3 py-1.5 rounded-full shadow-lg border border-[#E6F0F7] whitespace-nowrap transform scale-95 opacity-0"
           style={{
             animation: 'tooltipScale 0.15s cubic-bezier(0.4, 0, 0.2, 1) 0.02s forwards'
           }}>
        {text}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}

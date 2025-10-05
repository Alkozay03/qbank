// Simple Hamburger Component
'use client';

interface SimpleHamburgerProps {
  className?: string;
  onClick?: () => void;
}

export default function SimpleHamburger({ className = '', onClick }: SimpleHamburgerProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Toggle sidebar"
      className={`group relative p-2 rounded-full hover:bg-primary text-primary hover:text-inverse focus:outline-none shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50 ${className}`}
    >
      <svg 
        viewBox="0 0 24 24" 
        width="28" 
        height="28" 
        className="hamburger-icon w-7 h-7 transition-colors duration-200"
        fill="none"
      >
        <path 
          d="M4 7h16M4 12h16M4 17h16" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
          className="hamburger-line transition-colors duration-200"
        />
      </svg>
    </button>
  );
}
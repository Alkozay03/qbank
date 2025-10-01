'use client';

// Lightweight background component without heavy animation libraries
import { ReactNode } from 'react';

type BackgroundOverlayProps = {
  children: ReactNode;
  className?: string;
};

export default function AnimatedBackground({ children, className }: BackgroundOverlayProps) {
  return (
    <div className={`min-h-screen relative ${className || ''}`}>
      {/* Lightweight CSS-only background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
        <div className="absolute inset-0 opacity-30" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeName } from "@/config/themes";

/**
 * Temporarily forces the sky blue theme for specific admin pages
 * Restores the user's chosen theme when navigating away
 */
export default function ForceBlueTheme({ children }: { children: React.ReactNode }) {
  const { themeName, setTheme } = useTheme();
  const originalTheme = useRef<ThemeName | null>(null);
  
  useEffect(() => {
    // Only capture the original theme once on mount from localStorage
    // This ensures we get the user's actual saved preference, not a previously forced theme
    if (originalTheme.current === null) {
      try {
        const savedTheme = localStorage.getItem('qbank-theme') as ThemeName | null;
        originalTheme.current = savedTheme || themeName;
      } catch {
        originalTheme.current = themeName;
      }
    }
    
    // Only force blue if we're not already on blue
    if (themeName !== 'blue') {
      setTheme('blue');
    }
    
    // Cleanup: restore the user's original theme when unmounting
    return () => {
      if (originalTheme.current && originalTheme.current !== 'blue') {
        setTheme(originalTheme.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  return <>{children}</>;
}

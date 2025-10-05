// src/contexts/ThemeContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeName, themes, defaultTheme } from '@/config/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeName: ThemeName;
  setTheme: (_theme: ThemeName) => void;
  availableThemes: Theme[];
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize with theme already set by blocking script
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = document.documentElement.getAttribute('data-theme') as ThemeName;
      return currentTheme && themes[currentTheme] ? currentTheme : defaultTheme;
    }
    return defaultTheme;
  });
  const [isClient, setIsClient] = useState(false);

  // Load saved theme from localStorage or database on client side
  useEffect(() => {
    setIsClient(true);
    
    // Check if we're on a Year 4 page (where themes should persist)
    const isYear4Page = typeof window !== 'undefined' && window.location.pathname.startsWith('/year4');
    
    if (isYear4Page) {
      // For Year 4 pages, try to load from database via profile API
      fetch('/api/profile', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          const dbTheme = data?.theme as ThemeName;
          if (dbTheme && themes[dbTheme] && dbTheme !== themeName) {
            setThemeName(dbTheme);
          }
        })
        .catch(() => {
          // Fallback to localStorage on error, but only if different from current
          const savedTheme = localStorage.getItem('qbank-theme') as ThemeName;
          if (savedTheme && themes[savedTheme] && savedTheme !== themeName) {
            setThemeName(savedTheme);
          }
        });
    }
    // No need to check localStorage again for other pages since blocking script already applied it
  }, [themeName]);

  // Helper function to convert hex colors to RGB values for CSS shadows
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `${r}, ${g}, ${b}`;
    }
    return '0, 0, 0';
  };

  // Apply CSS custom properties when theme changes
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;

    try {
      const theme = themes[themeName];
      const root = document.documentElement;

      // Check if theme attributes are already set correctly (by blocking script or previous change)
      const currentTheme = root.getAttribute('data-theme');
      if (currentTheme === themeName) {
        // Theme already applied, just ensure all CSS custom properties are set
        Object.entries(theme.colors).forEach(([key, value]) => {
          const cssPropertyName = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
          const currentValue = root.style.getPropertyValue(`--color-${cssPropertyName}`);
          if (!currentValue || currentValue !== value) {
            root.style.setProperty(`--color-${cssPropertyName}`, value);
          }
          if (key === 'primary') {
            root.style.setProperty(`--color-primary-rgb`, hexToRgb(value));
          }
        });
        return;
      }

      // Full theme application (when theme actually changes)
      Object.entries(theme.colors).forEach(([key, value]) => {
        const cssPropertyName = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
        root.style.setProperty(`--color-${cssPropertyName}`, value);
        if (key === 'primary') {
          root.style.setProperty(`--color-primary-rgb`, hexToRgb(value));
        }
      });

      // Set data attributes for theme-specific styling
      root.setAttribute('data-theme', themeName);
      root.setAttribute('data-theme-type', theme.isDark ? 'dark' : 'light');
      root.setAttribute('data-theme-name', themeName);
      root.classList.toggle('dark', theme.isDark);
      
    } catch (error) {
      console.error('Error applying theme:', error);
    }

  }, [themeName, isClient]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeName(newTheme);
    if (isClient) {
      localStorage.setItem('qbank-theme', newTheme);
      
      // Also set a hidden input on the profile form if it exists
      try {
        const profileForm = document.querySelector('form') as HTMLFormElement;
        if (profileForm) {
          let themeInput = profileForm.querySelector('input[name="theme"]') as HTMLInputElement;
          if (!themeInput) {
            themeInput = document.createElement('input');
            themeInput.type = 'hidden';
            themeInput.name = 'theme';
            profileForm.appendChild(themeInput);
          }
          themeInput.value = newTheme;
        }
      } catch {
        // Ignore if not on profile page
      }
    }
  };

  const contextValue: ThemeContextType = {
    currentTheme: themes[themeName],
    themeName,
    setTheme,
    availableThemes: Object.values(themes),
    isDarkMode: themes[themeName].isDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for getting theme-aware styles
export function useThemeStyles() {
  const { currentTheme } = useTheme();
  
  const getThemeClasses = (baseClasses: string = '') => {
    return `${baseClasses} theme-aware`;
  };

  const getThemeStyle = (property: keyof typeof currentTheme.colors) => {
    return currentTheme.colors[property];
  };

  return {
    theme: currentTheme,
    getThemeClasses,
    getThemeStyle,
  };
}
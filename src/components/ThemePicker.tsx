// src/components/ThemePicker.tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeName } from '@/config/themes';
import { useState } from 'react';

export default function ThemePicker() {
  const { themeName, setTheme } = useTheme();
  const [hoveredTheme, setHoveredTheme] = useState<ThemeName | null>(null);

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
  };

  const getPreviewColors = (theme: ThemeName) => {
    const themeColors = themes[theme].colors;
    return {
      primary: themeColors.primary,
      secondary: themeColors.secondary,
      background: themeColors.background,
      text: themeColors.textPrimary,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          Color Theme
        </h3>
        <p className="text-secondary text-sm mb-4">
          Choose a color palette that suits your style. Your selection will be saved automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.values(themes).map((theme) => {
          const colors = getPreviewColors(theme.name);
          const isSelected = themeName === theme.name;
          const isHovered = hoveredTheme === theme.name;

          return (
            <button
              key={theme.name}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleThemeChange(theme.name);
              }}
              onMouseEnter={() => setHoveredTheme(theme.name)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-primary shadow-theme-lg scale-105' 
                  : 'border-theme hover:border-theme-hover hover:shadow-theme'
                }
                ${isHovered ? 'transform scale-102' : ''}
              `}
              style={{ 
                backgroundColor: colors.background,
                borderColor: isSelected ? colors.primary : undefined
              }}
            >
              {/* Theme Preview */}
              <div className="space-y-2">
                {/* Color swatches */}
                <div 
                  className="flex space-x-1"
                  style={{
                    '--swatch-primary': colors.primary,
                    '--swatch-secondary': colors.secondary,
                    '--swatch-background': colors.background,
                  } as React.CSSProperties}
                >
                  <div className="w-8 h-8 rounded-full border theme-primary-swatch" />
                  <div className="w-6 h-6 rounded-full border mt-1 theme-secondary-swatch" />
                  <div className="w-4 h-4 rounded-full border mt-2 theme-background-swatch" />
                </div>

                {/* Theme name */}
                <div 
                  className="text-sm font-medium"
                  style={{ color: colors.text }}
                >
                  {theme.displayName}
                </div>

                {/* Mini preview UI elements */}
                <div className="space-y-1">
                  <div 
                    className="h-2 rounded"
                    style={{ backgroundColor: colors.primary, opacity: 0.7 }}
                  />
                  <div 
                    className="h-1.5 rounded w-3/4"
                    style={{ backgroundColor: colors.secondary, opacity: 0.5 }}
                  />
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: colors.primary }}
                >
                  ✓
                </div>
              )}

              {/* Dark mode badge */}
              {theme.isDark && (
                <div className="absolute top-1 left-1">
                  <div className="w-2 h-2 rounded-full bg-gray-800"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Current theme info */}
      <div className="bg-theme-secondary p-4 rounded-lg border border-theme">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-primary">
              Current Theme: {themes[themeName].displayName}
            </div>
            <div className="text-sm text-secondary">
              {themes[themeName].isDark ? 'Dark mode' : 'Light mode'} • 
              Automatically saved to your preferences
            </div>
          </div>
          <div className="flex space-x-2">
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: themes[themeName].colors.primary }}
            />
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: themes[themeName].colors.secondary }}
            />
          </div>
        </div>
      </div>

      {/* Theme features info */}
      <div className="text-xs text-muted space-y-1">
        <div>• Themes are saved automatically and persist across sessions</div>
        <div>• All themes include accessibility-friendly contrast ratios</div>
        <div>• Dark mode is optimized for low-light environments</div>
      </div>
    </div>
  );
}
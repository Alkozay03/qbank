// Theme-aware gradient utilities

/**
 * Get theme-specific gradient classes for selected elements
 * Uses CSS theme selectors to apply the right gradient per theme
 */
export function getSelectedGradientClasses(): string {
  return "theme-gradient selected-gradient";
}

/**
 * Get theme-specific gradient classes for text elements
 * Uses CSS theme selectors for gradient text effect
 */
export function getGradientTextClasses(): string {
  return "theme-gradient-text";
}

/**
 * Get theme-aware glow effect based on current theme
 * Returns CSS box-shadow for hover effects
 */
export function getThemeGlow(): string {
  // Get current theme from document
  const theme = document.documentElement.getAttribute('data-theme') || 'blue';
  
  // Theme-specific glow colors
  const glowColors: Record<string, string> = {
    'red': '225, 29, 72',      // Rose-500
    'blue': '14, 165, 233',    // Sky-500
    'green': '34, 197, 94',    // Green-500
    'yellow': '251, 191, 36',  // Amber-400
    'pink': '236, 72, 153',    // Pink-500
    'purple': '139, 92, 246',  // Violet-500
    'gray': '107, 114, 128',   // Gray-500
    'dark': '82, 82, 82'       // Pure gray-600 RGB (matches gradient)
  };
  
  const color = glowColors[theme] || glowColors['blue'];
  return `0 0 0 1px rgba(${color}, 0.2), 0 0 12px rgba(${color}, 0.15)`;
}
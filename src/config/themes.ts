// src/config/themes.ts

export type ThemeName = 
  | 'blue' 
  | 'red' 
  | 'pink' 
  | 'green' 
  | 'yellow' 
  | 'purple' 
  | 'gray' 
  | 'dark';

export interface ThemeColors {
  // Primary colors (main brand colors)
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary colors
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Border and divider colors
  border: string;
  borderLight: string;
  borderHover: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive states
  hover: string;
  focus: string;
  active: string;
  
  // Shadows
  shadow: string;
  shadowLight: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  isDark: boolean;
}

export const themes: Record<ThemeName, Theme> = {
  // Sky Blue Theme
  blue: {
    name: 'blue',
    displayName: 'Sky Blue',
    isDark: false,
    colors: {
      primary: '#0EA5E9',
      primaryHover: '#38BDF8',
      primaryLight: '#F0F9FF',
      primaryDark: '#0284C7',
      
      secondary: '#7DD3FC',
      secondaryHover: '#38BDF8',
      secondaryLight: '#E0F2FE',
      
      background: '#FFFFFF',
      backgroundSecondary: '#F0F9FF',
      backgroundTertiary: '#E0F2FE',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#BAE6FD',
      borderLight: '#F0F9FF',
      borderHover: '#0EA5E9',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      
      hover: '#F0F9FF',
      focus: '#0EA5E9',
      active: '#0284C7',
      
      shadow: 'rgba(14, 165, 233, 0.1)',
      shadowLight: 'rgba(14, 165, 233, 0.05)'
    }
  },

  // Crimson Rose Theme
  red: {
    name: 'red',
    displayName: 'Crimson Rose',
    isDark: false,
    colors: {
      primary: '#DC2626',
      primaryHover: '#EF4444',
      primaryLight: '#FEE2E2',
      primaryDark: '#B91C1C',
      
      secondary: '#F87171',
      secondaryHover: '#EF4444',
      secondaryLight: '#FEE2E2',
      
      background: '#FFFFFF',
      backgroundSecondary: '#FEF2F2',
      backgroundTertiary: '#FEE2E2',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#FECACA',
      borderLight: '#FEF2F2',
      borderHover: '#DC2626',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#DC2626',
      
      hover: '#FEF2F2',
      focus: '#E61717',
      active: '#C41E3A',
      
      shadow: 'rgba(220, 38, 38, 0.1)',
      shadowLight: 'rgba(220, 38, 38, 0.05)'
    }
  },

  // Blossom Pink Theme
  pink: {
    name: 'pink',
    displayName: 'Blossom Pink',
    isDark: false,
    colors: {
      primary: '#EC4899',
      primaryHover: '#F472B6',
      primaryLight: '#FDF2F8',
      primaryDark: '#BE185D',
      
      secondary: '#F9A8D4',
      secondaryHover: '#F472B6',
      secondaryLight: '#FCE7F3',
      
      background: '#FFFFFF',
      backgroundSecondary: '#FDF2F8',
      backgroundTertiary: '#FCE7F3',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#FBCFE8',
      borderLight: '#FDF2F8',
      borderHover: '#EC4899',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#EC4899',
      
      hover: '#FDF2F8',
      focus: '#EC4899',
      active: '#BE185D',
      
      shadow: 'rgba(236, 72, 153, 0.1)',
      shadowLight: 'rgba(236, 72, 153, 0.05)'
    }
  },

  // Forest Green Theme
  green: {
    name: 'green',
    displayName: 'Forest Green',
    isDark: false,
    colors: {
      primary: '#16A34A',
      primaryHover: '#22C55E',
      primaryLight: '#F0FDF4',
      primaryDark: '#15803D',
      
      secondary: '#86EFAC',
      secondaryHover: '#4ADE80',
      secondaryLight: '#F0FDF4',
      
      background: '#FFFFFF',
      backgroundSecondary: '#F7FCF5',
      backgroundTertiary: '#E6F7E1',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#E6F7E1',
      borderLight: '#F7FCF5',
      borderHover: '#41AB5D',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#16A34A',
      
      hover: '#F7FCF5',
      focus: '#41AB5D',
      active: '#238B45',
      
      shadow: 'rgba(22, 163, 74, 0.1)',
      shadowLight: 'rgba(22, 163, 74, 0.05)'
    }
  },

  // Sunny Gold Theme
  yellow: {
    name: 'yellow',
    displayName: 'Sunny Gold',
    isDark: false,
    colors: {
      primary: '#F59E0B',
      primaryHover: '#FBBF24',
      primaryLight: '#FFFBEB',
      primaryDark: '#D97706',
      
      secondary: '#FCD34D',
      secondaryHover: '#FBBF24',
      secondaryLight: '#FEF3C7',
      
      background: '#FFFFFF',
      backgroundSecondary: '#FFFBEB',
      backgroundTertiary: '#FEF3C7',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#FDE68A',
      borderLight: '#FFFBEB',
      borderHover: '#F59E0B',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#F59E0B',
      
      hover: '#FFFBEB',
      focus: '#F59E0B',
      active: '#D97706',
      
      shadow: 'rgba(245, 158, 11, 0.1)',
      shadowLight: 'rgba(245, 158, 11, 0.05)'
    }
  },

  // Royal Purple Theme
  purple: {
    name: 'purple',
    displayName: 'Royal Purple',
    isDark: false,
    colors: {
      primary: '#7C3AED',
      primaryHover: '#8B5CF6',
      primaryLight: '#FAF5FF',
      primaryDark: '#5B21B6',
      
      secondary: '#A78BFA',
      secondaryHover: '#8B5CF6',
      secondaryLight: '#EDE9FE',
      
      background: '#FFFFFF',
      backgroundSecondary: '#FAF5FF',
      backgroundTertiary: '#EDE9FE',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#C4B5FD',
      borderLight: '#FAF5FF',
      borderHover: '#7C3AED',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#7C3AED',
      
      hover: '#FAF5FF',
      focus: '#7C3AED',
      active: '#5B21B6',
      
      shadow: 'rgba(124, 58, 237, 0.1)',
      shadowLight: 'rgba(124, 58, 237, 0.05)'
    }
  },

  // Minimal Gray Theme
  gray: {
    name: 'gray',
    displayName: 'Minimal Gray',
    isDark: false,
    colors: {
      primary: '#4B5563',
      primaryHover: '#6B7280',
      primaryLight: '#F9FAFB',
      primaryDark: '#374151',
      
      secondary: '#9CA3AF',
      secondaryHover: '#6B7280',
      secondaryLight: '#F3F4F6',
      
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      backgroundTertiary: '#F3F4F6',
      
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      
      border: '#E5E7EB',
      borderLight: '#F9FAFB',
      borderHover: '#4B5563',
      
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#4B5563',
      
      hover: '#F9FAFB',
      focus: '#6B7280',
      active: '#4B5563',
      
      shadow: 'rgba(107, 114, 128, 0.1)',
      shadowLight: 'rgba(107, 114, 128, 0.05)'
    }
  },

  // Dark Mode Theme - Pure grayscale, no blue or white backgrounds
  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    isDark: true,
    colors: {
      primary: '#636363',
      primaryHover: '#3b3b3b',
      primaryLight: '#222222',
      primaryDark: '#141414',
      
      secondary: '#3b3b3b',
      secondaryHover: '#636363',
      secondaryLight: '#222222',
      
      background: '#000000',
      backgroundSecondary: '#141414',
      backgroundTertiary: '#222222',
      
      textPrimary: '#FFFFFF',
      textSecondary: '#636363',
      textMuted: '#3b3b3b',
      textInverse: '#000000',
      
      border: '#222222',
      borderLight: '#141414',
      borderHover: '#636363',
      
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#636363',
      
      hover: '#141414',
      focus: '#636363',
      active: '#3b3b3b',
      
      shadow: 'rgba(0, 0, 0, 0.8)',
      shadowLight: 'rgba(0, 0, 0, 0.4)'
    }
  }
};

export const defaultTheme: ThemeName = 'blue';
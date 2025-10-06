// src/app/layout.tsx
import "./globals.css";
import "@/styles/themes.css";
import Providers from "./providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clerkship",
  description: "Fast, focused question bank for medical rotations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // We keep className on <html> so we can toggle 'dark' via JS (no next-themes).
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check if we're on forced theme pages first
                  const path = window.location.pathname;
                  const isForcedThemePage = path === '/' || path === '/years' || path === '/login' || path === '/pending-approval' || path === '/login-check';
                  
                  // Check if we're on admin pages (to prevent dark mode from overriding sky blue)
                  const isAdminPage = path.includes('/admin/') || path.includes('/master-admin/');
                  
                  if (isForcedThemePage) {
                    // Force skyblue theme for these pages
                    applyTheme('blue');
                    return;
                  }

                  // For all other pages (including admin pages with hardcoded colors), load user's saved theme
                  const savedTheme = localStorage.getItem('qbank-theme') || 'blue';
                  applyTheme(savedTheme, isAdminPage);

                  function applyTheme(themeName, isAdminPage = false) {
                    const themes = {
                      blue: { primary: '#0ea5e9', isDark: false },
                      red: { primary: '#dc2626', isDark: false },
                      pink: { primary: '#ec4899', isDark: false },
                      green: { primary: '#16a34a', isDark: false },
                      yellow: { primary: '#f59e0b', isDark: false },
                      purple: { primary: '#8b5cf6', isDark: false },
                      gray: { primary: '#6b7280', isDark: false },
                      dark: { primary: '#9ca3af', isDark: true }
                    };

                    const theme = themes[themeName] || themes.blue;
                    const root = document.documentElement;

                    // Apply theme attributes immediately
                    root.setAttribute('data-theme', themeName);
                    root.setAttribute('data-theme-type', theme.isDark ? 'dark' : 'light');
                    root.setAttribute('data-theme-name', themeName);
                    root.classList.toggle('dark', theme.isDark);
                    
                    // Mark admin pages to exclude from dark mode bg-white overrides
                    if (isAdminPage) {
                      root.setAttribute('data-admin-page', 'true');
                    } else {
                      root.removeAttribute('data-admin-page');
                    }

                    // Apply primary color immediately to prevent color flash
                    root.style.setProperty('--color-primary', theme.primary);
                  }
                } catch (e) {
                  // Fallback to blue theme on any error
                  const root = document.documentElement;
                  root.setAttribute('data-theme', 'blue');
                  root.setAttribute('data-theme-type', 'light');
                  root.setAttribute('data-theme-name', 'blue');
                  root.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="h-full text-readable antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

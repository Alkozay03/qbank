"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="theme-ocean"
        enableSystem={false}
        storageKey="clerkship-theme"
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}

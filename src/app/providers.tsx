// src/app/providers.tsx
"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Reduce repeated /api/auth/session calls and client refetch churn
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}

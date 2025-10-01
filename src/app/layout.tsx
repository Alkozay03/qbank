// src/app/layout.tsx
import "./globals.css";
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
      <body className="h-full text-readable antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

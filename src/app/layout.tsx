// src/app/layout.tsx
import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Clerkship",
  description: "Fast, focused question bank for medical rotations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // We keep className on <html> so we can toggle 'dark' via JS (no next-themes).
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-neutral-950 text-neutral-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

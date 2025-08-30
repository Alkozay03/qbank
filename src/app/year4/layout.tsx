// src/app/year4/layout.tsx
import Shell from "@/components/Shell";

export default function Year4Layout({ children }: { children: React.ReactNode }) {
  // No auth/profile redirect logic here; guards should be minimal or handled per-page.
  return <>{children}</>;
}

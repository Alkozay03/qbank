// src/app/year5/layout.tsx

export default function Year5Layout({ children }: { children: React.ReactNode }) {
  // No auth/profile redirect logic here; guards should be minimal or handled per-page.
  return <>{children}</>;
}

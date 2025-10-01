"use client";

import AnimatedBackground from "@/components/AnimatedBackground";

export default function YearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnimatedBackground>{children}</AnimatedBackground>;
}

"use client";

import AnimatedBackground from "@/components/AnimatedBackground";

export default function RootPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnimatedBackground>{children}</AnimatedBackground>;
}

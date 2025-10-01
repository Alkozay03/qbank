"use client";

import AnimatedBackground from "@/components/AnimatedBackground";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnimatedBackground>{children}</AnimatedBackground>;
}

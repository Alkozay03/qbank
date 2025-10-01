// src/components/AuthTopBar.tsx
"use client";

export default function AuthTopBar() {
  return (
    <div
      className="
        fixed inset-x-0 top-0 h-14
        flex items-center
        px-4 sm:px-6
        bg-white/40 backdrop-blur-sm
      "
      aria-label="Clerkship top bar"
    >
      <div
        className="
          text-2xl font-extrabold tracking-tight
          text-[#0E4362]
        "
      >
        Clerkship
      </div>
    </div>
  );
}

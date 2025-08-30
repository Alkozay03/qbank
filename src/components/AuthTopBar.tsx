// src/components/AuthTopBar.tsx
"use client";

export default function AuthTopBar() {
  return (
    <div
      className="
        fixed inset-x-0 top-0 h-14
        flex items-center
        px-4 sm:px-6
        bg-transparent
      "
      aria-label="Clerkship top bar"
    >
      <div
        className="
          text-2xl font-extrabold tracking-tight
          text-[#56A2CD]
          drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]
        "
      >
        Clerkship
      </div>
    </div>
  );
}

// src/components/TopRightBar.tsx
"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import NotificationsBell from "@/components/NotificationsBell";

type Props = { mode?: string };

export default function TopRightBar(_props: Props) {
  const router = useRouter();

  return (
    <div className="absolute top-0 right-6 z-40 h-14 flex items-center gap-2">
      {/* Notifications */}
      <NotificationsBell />

      {/* Profile */}
      <button
        onClick={() => {
          try {
            const here = window.location.pathname + window.location.search;
            sessionStorage.setItem("profileBackTo", here);
          } catch {}
          router.push("/profile");
        }}
        aria-label="Profile"
        className="group relative p-2 rounded-full transition active:scale-95 hover:bg-[#EAF4FA] text-[#3B82A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5CDE4]"
      >
        <Icon.User />
        <Tooltip>Profile</Tooltip>
      </button>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        aria-label="Log out"
        className="group relative p-2 rounded-full transition active:scale-95 hover:bg-[#EAF4FA] text-[#3B82A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5CDE4]"
      >
        <Icon.Logout />
        <Tooltip>Log out</Tooltip>
      </button>
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="
        pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
        whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-medium
        bg-[#F3F9FC] text-[#2F6F8F] shadow
        opacity-0 translate-y-1 transition
        group-hover:opacity-100 group-hover:translate-y-0
      "
    >
      {children}
    </span>
  );
}
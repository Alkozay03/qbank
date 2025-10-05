// src/components/TopRightBar.tsx
"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import NotificationsBell from "@/components/NotificationsBell";
import MessagesBell from "@/components/MessagesBell";
import SimpleTooltip from "@/components/SimpleTooltip";

export default function TopRightBar(props: { mode?: string } = {}) {
  void props; // accept optional props without using them
  const router = useRouter();

  return (
    <div className="absolute top-0 right-6 z-[400] h-14 flex items-center gap-2">
      {/* Home */}
      <SimpleTooltip text="Home">
        <button
          onClick={() => router.push("/years")}
          aria-label="Home"
          className="p-2 rounded-full transition active:scale-95 hover:bg-primary text-primary hover:text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon.Home />
        </button>
      </SimpleTooltip>

      {/* Messages */}
      <MessagesBell />
      
      {/* Notifications */}
      <NotificationsBell />

      {/* Profile */}
      <SimpleTooltip text="Profile">
        <button
          onClick={() => {
            try {
              const here = window.location.pathname + window.location.search;
              sessionStorage.setItem("profileBackTo", here);
            } catch {}
            router.push("/profile");
          }}
          aria-label="Profile"
          className="p-2 rounded-full transition active:scale-95 hover:bg-primary text-primary hover:text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon.User />
        </button>
      </SimpleTooltip>

      {/* Logout */}
      <SimpleTooltip text="Sign out">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Log out"
          className="p-2 rounded-full transition active:scale-95 hover:bg-primary text-primary hover:text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon.Logout />
        </button>
      </SimpleTooltip>
    </div>
  );
}


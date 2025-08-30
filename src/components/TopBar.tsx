// src/components/TopRightBar.tsx
"use client";

import { Icon } from "./Icons";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function TopRightBar() {
  const router = useRouter();
  return (
    <div className="ml-auto flex items-center gap-3 pr-4 h-14">
      <button
        onClick={() => router.push("/profile")}
        aria-label="Profile"
        className="p-2 rounded hover:bg-[#F3F9FC] text-[#3B82A0]"
      >
        <Icon.User />
      </button>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        aria-label="Log out"
        className="p-2 rounded hover:bg-[#F3F9FC] text-[#3B82A0]"
      >
        <Icon.Logout />
      </button>
    </div>
  );
}

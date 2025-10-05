"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SimpleTooltip from "@/components/SimpleTooltip";

export default function MessagesBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const router = useRouter();

  const refreshUnreadCount = async () => {
    try {
      const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    router.push("/year4/messages");
  };

  return (
    <div className="relative">
      <SimpleTooltip text="Messages">
        <button
          onClick={handleClick}
          aria-label="Messages"
          className="p-2 rounded-full transition active:scale-95 hover:bg-primary text-primary hover:text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Message icon styled to match other top-right icons */}
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 9h8M8 13h6" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </SimpleTooltip>
    </div>
  );
}
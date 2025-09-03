"use client";

import { useEffect, useRef, useState } from "react";

type Notif = { id: string; shortId: number; title: string; createdAt: string };

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

export default function NotificationsBell() {
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshCount() {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (res.ok) setCount((await res.json()).count ?? 0);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshCount();
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      // mark as read (server will advance a last-seen marker)
      try {
        await fetch("/api/notifications/mark-read", { method: "POST" });
      } catch {}
      setCount(0);
      try {
        const res = await fetch("/api/notifications/list", { cache: "no-store" });
        if (res.ok) setItems(await res.json());
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="group relative p-2 rounded-full transition active:scale-95 hover:bg-[#EAF4FA] text-[#3B82A0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A5CDE4]"
      >
        {/* Bell icon styled to match other top-right icons */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
        <Tooltip>Notifications</Tooltip>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#E6F0F7] bg-white shadow-lg">
          <div className="px-3 py-2 text-sm font-semibold text-[#2F6F8F] border-b border-[#E6F0F7]">
            Notifications
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">No notifications</div>
            ) : (
              items.map((n) => (
                <details key={n.id} className="border-b border-[#E6F0F7] p-2">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">
                    {n.title}
                  </summary>
                  <NotifBody shortId={n.shortId} />
                </details>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifBody({ shortId }: { shortId: number }) {
  const [body, setBody] = useState<string>("Loading...");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/notifications/item?shortId=${shortId}`, { cache: "no-store" });
        setBody(res.ok ? await res.text() : "Failed to load");
      } catch {
        setBody("Failed to load");
      }
    })();
  }, [shortId]);
  return <div className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{body}</div>;
}

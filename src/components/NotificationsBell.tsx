"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import SimpleTooltip from "@/components/SimpleTooltip";

type Notif = {
  id: string;
  shortId: number;
  title: string;
  body?: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
};

export default function NotificationsBell() {
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const top = Math.max(rect.bottom + 8, 0);
    const right = Math.max(window.innerWidth - rect.right, 0);
    setDropdownPosition({ top, right });
  }, []);

  async function toggle() {
    const next = !open;
    if (next) {
      updatePosition();
    }
    setOpen(next);
    if (next) {
      try {
        const [listRes, profileRes] = await Promise.all([
          fetch("/api/notifications/list", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        let rows: Notif[] = [];
        if (listRes.ok) rows = (await listRes.json()) as Notif[];
        let showProfileNotif = false;
        if (profileRes.ok) {
          const p = (await profileRes.json()) as { firstName?: string | null; lastName?: string | null; gradYear?: number | null };
          showProfileNotif = !p?.firstName; // require first name; extend if needed
        }
        // Only show "Profile Settings" notification if profile incomplete
        const filtered = rows.filter((n) => (n.title === "Profile Settings" ? showProfileNotif : true));
        setItems(filtered);
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  const markAllAsRead = async () => {
    // Mark all displayed notifications as read
    const promises = items
      .filter((item) => !item.isRead)
      .map((item) =>
        fetch("/api/notifications/mark-read", { 
          method: "POST", 
          body: JSON.stringify({ id: item.id }), 
          headers: { "Content-Type": "application/json" } 
        })
      );
    
    try {
      await Promise.all(promises);
      // Update local state
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setCount(0);
      await refreshCount();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications/mark-read", { 
        method: "POST", 
        body: JSON.stringify({ id }), 
        headers: { "Content-Type": "application/json" } 
      });
      
      // Update local state
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      await refreshCount();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <div className="relative z-[200]" ref={containerRef}>
      <SimpleTooltip text="Notifications">
        <button
          ref={buttonRef}
          onClick={toggle}
          aria-label="Notifications"
          className="p-2 rounded-full transition active:scale-95 hover:bg-primary text-primary hover:text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Bell icon styled to match other top-right icons */}
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg border-2 border-white z-10">
              {count}
            </span>
          )}
        </button>
      </SimpleTooltip>

      {open && portalReady &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[999] w-80 rounded-xl bg-primary-light shadow-lg"
            style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
          >
          <div className="flex justify-between items-center px-3 py-2 theme-gradient rounded-t-xl">
            <div className="text-sm font-semibold text-white">
              Notifications
            </div>
            {items.some((item) => !item.isRead) && (
              <button 
                onClick={markAllAsRead} 
                className="text-xs text-white hover:opacity-80 font-medium transition-opacity"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="border-b-2 border-primary bg-white p-3">
                  <div className="flex justify-between items-start">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-primary">
                        {n.title}
                        {!n.isRead && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary shadow-sm"></span>}
                      </summary>
                      <NotifBody notification={n} />
                    </details>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-gray-400 hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-primary opacity-70 mt-1">
                    {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-2 text-center theme-gradient rounded-b-xl">
            <a href="/notifications" className="text-xs text-white hover:opacity-80 font-medium transition-opacity">
              View all notifications
            </a>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function NotifBody({ notification }: { notification: Notif }) {
  const [body, setBody] = useState<string>(notification.body || "Loading...");
  const [loading, setLoading] = useState<boolean>(!notification.body);
  
  useEffect(() => {
    if (notification.body) {
      setBody(notification.body);
      return;
    }
    
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/notifications/item?shortId=${notification.shortId}`, { cache: "no-store" });
        const data = await res.json();
        setBody(data.body || "No content available");
      } catch {
        setBody("Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [notification.shortId, notification.body]);
  
  return (
    <div className="mt-1 text-sm whitespace-pre-wrap text-primary">
      {loading ? (
        <div className="animate-pulse h-3 bg-gray-200 rounded w-full mt-1 mb-2"></div>
      ) : (
        body
      )}
    </div>
  );
}


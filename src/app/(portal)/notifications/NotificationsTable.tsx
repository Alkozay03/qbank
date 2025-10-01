"use client";

import { useState, useEffect } from "react";

type Notification = {
  id: string;
  shortId: number;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

export default function NotificationsTable() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const url = new URL("/api/notifications/list", window.location.origin);
        url.searchParams.append("take", "100");
        if (showUnreadOnly) {
          url.searchParams.append("unreadOnly", "true");
        }
        
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        } else {
          console.error("Failed to fetch notifications");
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [showUnreadOnly]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setNotifications(
          notifications.map((notification) =>
            notification.id === id
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    try {
      const promises = unreadIds.map((id) =>
        fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        })
      );

      await Promise.all(promises);

      setNotifications(
        notifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format date with time helper
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const filteredNotifications = notifications.filter((notification) =>
    notification.title.toLowerCase().includes(search.toLowerCase()) ||
    notification.body.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="animate-pulse h-8 w-48 bg-slate-200 rounded"></div>
          <div className="animate-pulse h-10 w-32 bg-slate-200 rounded"></div>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 w-full bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search notifications..."
            className="w-full px-3 py-2 border border-[#E6F0F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A5CDE4]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-[#E6F0F7] text-[#2F6F8F] focus:ring-[#A5CDE4]"
            />
            Unread only
          </label>
          <button
            onClick={markAllAsRead}
            disabled={!notifications.some((n) => !n.isRead)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              notifications.some((n) => !n.isRead)
                ? "bg-[#2F6F8F] text-white hover:bg-[#1D4D66]"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No notifications found</div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.isRead ? "border-[#E6F0F7]" : "border-[#A5CDE4] bg-[#F7FBFD]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-slate-800 flex items-center">
                    {notification.title}
                    {!notification.isRead && (
                      <span className="ml-2 w-2 h-2 inline-block bg-blue-500 rounded-full"></span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{notification.body}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDateTime(notification.createdAt)}
                    {notification.readAt && (
                      <span className="ml-2">
                        • Read {formatDate(notification.readAt)}
                      </span>
                    )}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-slate-400 hover:text-[#2F6F8F] p-1"
                    title="Mark as read"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function genShortNumericId(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  if (s[0] === "0") s = "1" + s.slice(1);
  return Number(s);
}

type NotificationRow = {
  id: string;
  shortId: number;
  title: string;
  body: string;
  targetRotation?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function NotificationsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "MASTER_ADMIN" | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRotation, setTargetRotation] = useState<string>("");
  const [searchId, setSearchId] = useState<string>("");
  const [editCuid, setEditCuid] = useState<string | null>(null);
  const [customId, setCustomId] = useState<number>(() => genShortNumericId());

  const pageTitle = useMemo(() => (editCuid ? "Modify Notification" : "Add Notification"), [editCuid]);

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      console.warn("🔵 CLIENT: Fetching admin notifications...");
      const r = await fetch("/api/admin/notifications/list", { cache: "no-store" });
      console.warn("🔵 CLIENT: Response status:", r.status);
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      const data = (await r.json()) as { notifications: NotificationRow[] };
      console.warn("🔵 CLIENT: Received data:", JSON.stringify(data));
      console.warn("🔵 CLIENT: Number of notifications:", data.notifications?.length || 0);
      setRows(data.notifications || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load notifications";
      console.error("🔴 CLIENT: Error loading notifications:", msg, e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/me/role', { cache: 'no-store' });
        const data = await response.json();
        setUserRole(data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => { loadList(); }, []);

  async function onDelete(cuid: string) {
    if (!confirm("Delete this notification?")) return;
    const r = await fetch(`/api/notifications/item?id=${encodeURIComponent(cuid)}`, { method: "DELETE" });
    if (r.ok) await loadList(); else alert("Failed to delete.");
  }

  async function onModify(cuid: string) {
    try {
      const r = await fetch(`/api/notifications/item?id=${encodeURIComponent(cuid)}`, { method: "GET", cache: "no-store" });
      if (!r.ok) throw new Error("Failed to fetch item");
      const { notification } = (await r.json()) as { notification: NotificationRow };
      setEditCuid(notification.id);
      setTitle(notification.title);
      setBody(notification.body);
      setTargetRotation(notification.targetRotation || "");
      setCustomId(notification.shortId);
      setSearchId(String(notification.shortId));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unable to load notification";
      alert(msg);
    }
  }

  async function onSearch() {
    if (!searchId.trim()) return;
    try {
      const r = await fetch(`/api/notifications/item?shortId=${encodeURIComponent(searchId.trim())}`, { method: "GET", cache: "no-store" });
      if (!r.ok) throw new Error("Not found");
      const { notification } = (await r.json()) as { notification: NotificationRow };
      setEditCuid(notification.id);
      setTitle(notification.title);
      setBody(notification.body);
      setTargetRotation(notification.targetRotation || "");
      setCustomId(notification.shortId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      alert("No notification found for that ID.");
    }
  }

  async function onSubmit() {
    const payload = { 
      shortId: customId, 
      title: title.trim(), 
      body: body.trim(),
      targetRotation: targetRotation || null
    };
    if (!payload.title || !payload.body) { alert("Please fill title and details."); return; }
    const url = "/api/notifications/item" + (editCuid ? `?id=${encodeURIComponent(editCuid)}` : "");
    const method = editCuid ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) {
      setEditCuid(null); setTitle(""); setBody(""); setTargetRotation(""); setCustomId(genShortNumericId()); setSearchId(""); await loadList();
      alert(editCuid ? "Notification updated." : "Notification pushed!");
    } else {
      const j = await r.json().catch(() => ({})); alert(j?.error || "Failed to save notification.");
    }
  }

  function resetToAdd() {
    setEditCuid(null); setTitle(""); setBody(""); setTargetRotation(""); setCustomId(genShortNumericId()); setSearchId("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0ea5e9]">Notifications Editor</h1>
        <button
          onClick={() => {
            if (userRole === "MASTER_ADMIN") {
              router.push("/year4/master-admin");
            } else {
              router.push("/year4/admin");
            }
          }}
          className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-[#0284c7] hover:bg-sky-50"
        >
          ← {userRole === "MASTER_ADMIN" ? "Master Admin" : "Admin"}
        </button>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-white shadow-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-[#0ea5e9]">{pageTitle}</div>
          {editCuid ? (<button onClick={resetToAdd} className="text-sm rounded-lg px-2 py-1 border border-sky-200 hover:bg-sky-50">+ New</button>) : null}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#0284c7]">Search by Notification ID</label>
          <div className="mt-1 flex gap-2">
            <input value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Enter short numeric ID" className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200" />
            <button onClick={onSearch} className="rounded-xl bg-[#0ea5e9] px-3 py-2 text-white hover:bg-[#0284c7]">Search</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#0284c7]">Custom Notification ID</label>
            <input value={customId} readOnly className="mt-1 w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-slate-800" />
            <p className="mt-1 text-xs text-slate-500">Generated automatically. Immutable.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#0284c7]">Notification Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline shown in the bell dropdown" className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200" />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#0284c7]">Notification Details</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Full notification text shown in the popup" className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200" />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#0284c7]">Target Rotation</label>
          <select 
            value={targetRotation} 
            onChange={(e) => setTargetRotation(e.target.value)} 
            className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">All Rotations (Global)</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Internal Medicine">Internal Medicine</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">Leave as &quot;All Rotations&quot; to send to everyone, or select a specific rotation</p>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button onClick={onSubmit} className="rounded-xl bg-[#0ea5e9] px-4 py-2 font-semibold text-white hover:bg-[#0284c7]">{editCuid ? "Save Changes" : "Push Notification!"}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-white shadow-lg">
        <div className="px-4 py-3 border-b border-sky-200 flex items-center justify-between">
          <div className="font-semibold text-[#0ea5e9]">Recent Notifications</div>
          <button onClick={loadList} className="text-sm rounded-lg px-2 py-1 border border-sky-200 hover:bg-sky-50">Refresh</button>
        </div>

        {error && <div className="px-4 py-3 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="px-4 py-10 text-center text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-500">No notifications yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[#0284c7] bg-sky-50">
                  <th className="px-4 py-3 font-semibold">Notification ID</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => {
                  const createdDate = new Date(n.createdAt);
                  const dateStr = createdDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  const timeStr = createdDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true
                  });
                  return (
                    <tr key={n.id} className="border-t border-sky-100 hover:bg-sky-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[#0ea5e9] font-semibold">{n.shortId}</td>
                      <td className="px-4 py-3 text-slate-700">{dateStr}</td>
                      <td className="px-4 py-3 text-slate-600">{timeStr}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{n.title}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="max-w-xs truncate" title={n.body}>
                          {n.body}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => onModify(n.id)} 
                            className="rounded-lg border border-[#0ea5e9] bg-white px-3 py-1.5 text-[#0ea5e9] font-medium hover:bg-[#0ea5e9] hover:text-white transition-colors" 
                            title="Edit notification"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => onDelete(n.id)} 
                            className="rounded-lg border border-red-500 bg-white px-3 py-1.5 text-red-600 font-medium hover:bg-red-500 hover:text-white transition-colors" 
                            title="Delete notification"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

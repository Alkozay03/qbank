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
  createdAt: string;
  updatedAt: string;
};

export default function NotificationsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [searchId, setSearchId] = useState<string>("");
  const [editCuid, setEditCuid] = useState<string | null>(null);
  const [customId, setCustomId] = useState<number>(() => genShortNumericId());

  const pageTitle = useMemo(() => (editCuid ? "Modify Notification" : "Add Notification"), [editCuid]);

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/notifications/list", { cache: "no-store" });
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      const data = (await r.json()) as { notifications: NotificationRow[] };
      setRows(data.notifications || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

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
      setCustomId(notification.shortId);
      setSearchId(String(notification.shortId));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      alert(e?.message || "Unable to load notification");
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
      setCustomId(notification.shortId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      alert("No notification found for that ID.");
    }
  }

  async function onSubmit() {
    const payload = { shortId: customId, title: title.trim(), body: body.trim() };
    if (!payload.title || !payload.body) { alert("Please fill title and details."); return; }
    const url = "/api/notifications/item" + (editCuid ? `?id=${encodeURIComponent(editCuid)}` : "");
    const method = editCuid ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) {
      setEditCuid(null); setTitle(""); setBody(""); setCustomId(genShortNumericId()); setSearchId(""); await loadList();
      alert(editCuid ? "Notification updated." : "Notification pushed!");
    } else {
      const j = await r.json().catch(() => ({})); alert(j?.error || "Failed to save notification.");
    }
  }

  function resetToAdd() {
    setEditCuid(null); setTitle(""); setBody(""); setCustomId(genShortNumericId()); setSearchId("");
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2F6F8F]">Notifications Editor</h1>
        <button onClick={() => router.push("/year4")} className="rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[#F3F9FC]">← Year 4 Portal</button>
      </div>

      <div className="rounded-2xl border border-[#E6F0F7] bg-white shadow p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-[#2F6F8F]">{pageTitle}</div>
          {editCuid ? (<button onClick={resetToAdd} className="text-sm rounded-lg px-2 py-1 border border-[#E6F0F7] hover:bg-[#F3F9FC]">+ New</button>) : null}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Search by Notification ID</label>
          <div className="mt-1 flex gap-2">
            <input value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Enter short numeric ID" className="w-full rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]" />
            <button onClick={onSearch} className="rounded-xl bg-[#2F6F8F] px-3 py-2 text-white hover:opacity-90">Search</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Custom Notification ID</label>
            <input value={customId} readOnly className="mt-1 w-full rounded-xl border border-[#E6F0F7] bg-slate-50 px-3 py-2 text-slate-800" />
            <p className="mt-1 text-xs text-slate-500">Generated automatically. Immutable.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Notification Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline shown in the bell dropdown" className="mt-1 w-full rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]" />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Notification Details</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Full notification text shown in the popup" className="mt-1 w-full rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#A5CDE4]" />
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button onClick={onSubmit} className="rounded-xl bg-[#2F6F8F] px-4 py-2 font-semibold text-white hover:opacity-90">{editCuid ? "Save Changes" : "Push Notification!"}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6F0F7] bg-white shadow">
        <div className="px-4 py-3 border-b border-[#E6F0F7] flex items-center justify-between">
          <div className="font-semibold text-[#2F6F8F]">Recent Notifications</div>
          <button onClick={loadList} className="text-sm rounded-lg px-2 py-1 border border-[#E6F0F7] hover:bg-[#F3F9FC]">Refresh</button>
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
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3">Short ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className="border-t border-[#E6F0F7]">
                    <td className="px-4 py-3 font-mono">{n.shortId}</td>
                    <td className="px-4 py-3">{n.title}</td>
                    <td className="px-4 py-3">{new Date(n.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => onModify(n.id)} className="rounded-lg border border-[#E6F0F7] px-2 py-1 hover:bg-[#F3F9FC]" title="Modify">Modify</button>
                        <button onClick={() => onDelete(n.id)} className="rounded-lg border border-[#E6F0F7] px-2 py-1 text-red-600 hover:bg-red-50" title="Delete">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
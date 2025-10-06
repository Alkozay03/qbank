"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ItemType = "HOSPITAL_SHIFT" | "LECTURE";

type ScheduleItem = {
  id?: string;
  dayOfWeek: number;    // 0..6
  type: ItemType;
  startsAt: string;     // ISO
  endsAt: string;       // ISO
  topic?: string;
  tutor?: string;
  location?: string;
  link?: string;
};

export default function ScheduleEditorPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState<string>(() => startOfWeekISO(new Date()));
  const [title, setTitle] = useState<string>("Week Schedule");
  const [targetRotation, setTargetRotation] = useState<string>("");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const weekLabel = useMemo(() => {
    const d = new Date(weekStart);
    const dd = d.toLocaleDateString();
    const end = new Date(d); end.setDate(d.getDate() + 6);
    return `${dd} → ${end.toLocaleDateString()}`;
  }, [weekStart]);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/schedule?weekStart=${encodeURIComponent(weekStart)}`, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json(); // { title, items, targetRotation }
        setTitle(j?.title ?? "Week Schedule");
        setTargetRotation(j?.targetRotation ?? "");
        setItems(j?.items ?? []);
      } else {
        setTitle("Week Schedule"); setTargetRotation(""); setItems([]);
      }
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { void loadCurrent(); }, [loadCurrent]);

  function addRow() {
    const now = new Date(weekStart);
    const startStr = toISOAt(now, 9);  // default 09:00
    const endStr = toISOAt(now, 12);   // default 12:00
    setItems((x) => [...x, { dayOfWeek: 0, type: "LECTURE", startsAt: startStr, endsAt: endStr }]);
  }

  function updateItem(idx: number, patch: Partial<ScheduleItem>) {
    setItems((x) => x.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((x) => x.filter((_, i) => i !== idx));
  }

  async function onSave() {
    const r = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, title, targetRotation: targetRotation || null, items }),
    });
    if (r.ok) { alert("Schedule updated."); } else {
      const j = await r.json().catch(() => ({})); alert(j?.error || "Failed to update schedule.");
    }
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50">`n      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0ea5e9]">Schedule Editor</h1>
        <button onClick={() => router.push("/year4")} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-[#0284c7] hover:bg-sky-50">← Year 4 Portal</button>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-white shadow-lg p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[#0284c7]">Week start (Monday)</label>
            <input type="date" value={weekStart.slice(0,10)} onChange={(e) => setWeekStart(startOfWeekISO(new Date(e.target.value)))} className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2" />
            <div className="text-xs text-slate-500 mt-1">{weekLabel}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#0284c7]">Schedule Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2" />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#0284c7]">Target Rotation</label>
          <select 
            value={targetRotation} 
            onChange={(e) => setTargetRotation(e.target.value)} 
            className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2"
          >
            <option value="">All Rotations (Global)</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Internal Medicine">Internal Medicine</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">Leave as &quot;All Rotations&quot; to show to everyone, or select a specific rotation</p>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold text-[#0ea5e9]">Items</div>
            <button onClick={addRow} className="rounded-xl border border-sky-200 px-3 py-2 hover:bg-sky-50">+ Add row</button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading…</div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-sky-200 p-3">
                  <div className="grid sm:grid-cols-6 gap-2">
                    <select value={it.dayOfWeek} onChange={(e) => updateItem(idx, { dayOfWeek: Number(e.target.value) })} className="rounded-xl border border-sky-200 px-2 py-2">
                      <option value={0}>Mon</option><option value={1}>Tue</option><option value={2}>Wed</option>
                      <option value={3}>Thu</option><option value={4}>Fri</option><option value={5}>Sat</option><option value={6}>Sun</option>
                    </select>
                    <select value={it.type} onChange={(e) => updateItem(idx, { type: e.target.value as ItemType })} className="rounded-xl border border-sky-200 px-2 py-2">
                      <option value="HOSPITAL_SHIFT">Hospital Shift</option>
                      <option value="LECTURE">Lecture</option>
                    </select>
                    <input type="datetime-local" value={localDT(it.startsAt)} onChange={(e) => updateItem(idx, { startsAt: toISO(e.target.value) })} className="rounded-xl border border-sky-200 px-2 py-2" />
                    <input type="datetime-local" value={localDT(it.endsAt)} onChange={(e) => updateItem(idx, { endsAt: toISO(e.target.value) })} className="rounded-xl border border-sky-200 px-2 py-2" />
                    <input placeholder="Topic (lecture)" value={it.topic ?? ""} onChange={(e) => updateItem(idx, { topic: e.target.value })} className="rounded-xl border border-sky-200 px-2 py-2" />
                    <input placeholder="Tutor (lecture)" value={it.tutor ?? ""} onChange={(e) => updateItem(idx, { tutor: e.target.value })} className="rounded-xl border border-sky-200 px-2 py-2" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 mt-2">
                    <input placeholder="Location" value={it.location ?? ""} onChange={(e) => updateItem(idx, { location: e.target.value })} className="rounded-xl border border-sky-200 px-2 py-2" />
                    <input placeholder="Link" value={it.link ?? ""} onChange={(e) => updateItem(idx, { link: e.target.value })} className="rounded-xl border border-sky-200 px-2 py-2" />
                    <button onClick={() => removeItem(idx)} className="rounded-xl border border-sky-200 px-3 py-2 text-red-600 hover:bg-red-50">Remove</button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="text-sm text-slate-500">No items yet. Click “Add row”.</div>}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end">
            <button onClick={onSave} className="rounded-xl bg-[#0ea5e9] px-4 py-2 font-semibold text-white hover:bg-[#0284c7]">Update Schedule</button>
          </div>
        </div>
      </div>
    </div>

  );
}

function startOfWeekISO(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0,0,0,0);
  return x.toISOString();
}

function toISOAt(base: Date, hour: number) {
  const x = new Date(base);
  x.setUTCHours(hour, 0, 0, 0);
  return x.toISOString();
}

function localDT(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISO(local: string) {
  const d = new Date(local);
  return d.toISOString();
}


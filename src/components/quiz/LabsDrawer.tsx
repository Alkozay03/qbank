"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { LAB_SETS, LabSetKey } from "./labs-data";

export default function LabsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<LabSetKey>("serum");
  const [q, setQ] = useState("");

  const list = LAB_SETS[tab].filter((it) =>
    q.trim() ? it.name.toLowerCase().includes(q.toLowerCase()) : true
  );

  return (
    <aside
      className={`fixed right-0 top-12 bottom-12 z-40 w-80 border-l border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Lab Values</div>
          <button className="icon-btn" onClick={onClose} title="Close"><X size={16} /></button>
        </div>

        <div className="p-3 flex gap-2">
          {(["serum", "csf", "hematologic", "urine", "bmi"] as LabSetKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-2 py-1 rounded-md border text-sm ${
                tab === k
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--primary-50)]"
              }`}
            >
              {TAB_NAME[k]}
            </button>
          ))}
        </div>

        <div className="px-3 pb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parameter…"
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-3 py-2">Parameter</th>
                <th className="text-left px-3 py-2">Conventional</th>
                <th className="text-left px-3 py-2">SI</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.name} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.conv}</td>
                  <td className="px-3 py-2">{row.si}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td className="px-3 py-6" colSpan={3}>No matches.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  );
}

const TAB_NAME: Record<LabSetKey, string> = {
  serum: "Serum",
  csf: "CSF",
  hematologic: "Blood",
  urine: "Urine",
  bmi: "BMI",
};

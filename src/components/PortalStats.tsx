"use client";

import { useEffect, useState } from "react";

type PerQuestionRow = {
  questionId: string;
  stem?: string | null;
  attempts: number;
  avgTimeSec: number | null;
  avgChanges: number | null;
};

type StatsData = {
  portal?: string;
  totalAnswered: number;
  avgTimeSec: number | null;
  avgChanges: number | null;
  perQuestion?: PerQuestionRow[];
};

export default function PortalStats({ portal }: { portal: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/stats/portal?portal=${encodeURIComponent(portal)}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (isMounted) setData(json);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load stats";
        setError(msg);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [portal]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div>Loading stats…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Portal Performance{data.portal ? ` - ${data.portal}` : ""}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl shadow p-4">
          <div className="text-sm opacity-70">Total Questions Answered</div>
          <div className="text-2xl font-bold">{data.totalAnswered}</div>
        </div>
        <div className="rounded-2xl shadow p-4">
          <div className="text-sm opacity-70">Average Time (sec)</div>
          <div className="text-2xl font-bold">{data.avgTimeSec ? data.avgTimeSec.toFixed(1) : "—"}</div>
        </div>
        <div className="rounded-2xl shadow p-4">
          <div className="text-sm opacity-70">Average Answer Changes</div>
          <div className="text-2xl font-bold">{(data.avgChanges ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Question</th>
              <th className="text-left p-3">Attempts</th>
              <th className="text-left p-3">Avg Time (s)</th>
              <th className="text-left p-3">Avg Changes</th>
            </tr>
          </thead>
          <tbody>
            {data.perQuestion?.map((row) => (
              <tr key={row.questionId} className="border-t">
                <td className="p-3 max-w-[520px]">
                  <div className="line-clamp-2">
                    {row.stem ? row.stem : <span className="opacity-70">{row.questionId}</span>}
                  </div>
                </td>
                <td className="p-3">{row.attempts}</td>
                <td className="p-3">{row.avgTimeSec ? row.avgTimeSec.toFixed(1) : "—"}</td>
                <td className="p-3">{row.avgChanges ? row.avgChanges.toFixed(2) : "0.00"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

interface DashboardStats {
  avgPercent: number;
  usedPercent: number;
  testsCompleted: number;
}

export default function DashboardStatsClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/year4/dashboard-stats", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 503) {
            setIsOffline(true);
          }
          setStats(null);
          return;
        }
        const data = (await res.json()) as DashboardStats;
        if (!cancelled) {
          setStats(data);
          setIsOffline(false);
        }
      } catch (error) {
        console.warn("Failed to load stats", error);
        if (!cancelled) {
          setStats(null);
          setIsOffline(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchStats();

    const id = setInterval(fetchStats, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-gradient-to-br from-white to-[#F8FCFF] border border-[#E6F0F7] p-6 shadow-lg animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded mb-4" />
            <div className="h-12 bg-slate-200 rounded mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-white to-[#FEFBF0] border border-[#F5E6B3] p-6 shadow-lg">
          <div className="text-sm font-medium text-[#B88300] mb-2">Statistics Unavailable</div>
          <div className="text-base text-[#8B6D00]">
            The database is currently offline, so performance statistics are unavailable. You can still review content
            and use offline notes.
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      <StatCard title="Question Score" value={`${stats.avgPercent}%`} subtitle="Correct Answers" variant="primary" />
      <StatCard
        title="Qbank Usage"
        value={`${stats.usedPercent}%`}
        subtitle="Questions Attempted"
        variant="accent"
      />
      <StatCard
        title="Tests Completed"
        value={stats.testsCompleted}
        subtitle="Practice Sessions"
        variant="primary"
      />
    </div>
  );
}

type StatCardVariant = "primary" | "accent";

function StatCard({
  title,
  value,
  subtitle,
  variant,
}: {
  title: string;
  value: ReactNode;
  subtitle: string;
  variant: StatCardVariant;
}) {
  const gradients: Record<StatCardVariant, string> = {
    primary: "from-[#A5CDE4] to-[#56A2CD]",
    accent: "from-[#56A2CD] to-[#2F6F8F]",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-[#F8FCFF] border border-[#E6F0F7] p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradients[variant]} opacity-10 rounded-full -mt-10 -mr-10`} />
      <div className="relative">
        <div className="text-sm font-medium text-slate-600 mb-2">{title}</div>
        <div className="text-5xl font-extrabold text-[#2F6F8F] mb-1">{value}</div>
        <div className="text-sm text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

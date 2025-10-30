"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getGradientTextClasses } from "@/utils/gradients";

interface DashboardStats {
  avgPercent: number;
  usedPercent: number;
  testsCompleted: number;
  uniqueQuestionsCount: number;
  totalQuestions: number;
  isOffline?: boolean;
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
        const res = await fetch("/api/year2/dashboard-stats", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            if (res.status === 503) {
              setIsOffline(true);
            }
            setStats(null);
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as DashboardStats;
        if (!cancelled) {
          setStats(data);
          setIsOffline(data.isOffline || false);
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

    // Load stats once on mount
    void fetchStats();

    // Refresh when tab becomes visible (student returns to page)
    const handleVisibilityChange = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        void fetchStats();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ REMOVED: Stupid 60-second polling
    // ❌ OLD: const id = setInterval(fetchStats, 60_000);
    // Stats should only refresh when student completes a quiz,
    // which is handled by the quiz completion redirect back to dashboard

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-primary-light border-2 border-primary p-6 shadow-lg animate-pulse"
          >
            <div className="bg-white rounded-xl shadow-inner p-4">
              <div className="h-4 bg-muted rounded mb-4" />
              <div className="h-12 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl bg-primary-light border-2 border-warning p-6 shadow-lg">
          <div className="bg-white rounded-xl shadow-inner p-4">
            <div className="text-sm font-semibold text-warning mb-2 tracking-wide">Statistics Unavailable</div>
            <div className="text-base text-foreground font-medium">
              The database is currently offline, so performance statistics are unavailable. You can still review content
              and use offline notes.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Always show stats even if they're zeros (for new users or years with no questions)
  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Question Score" value="0%" subtitle="Correct Answers" />
        <StatCard
          title="Qbank Usage"
          value="0%"
          subtitle="0/0 Questions Attempted"
        />
        <StatCard
          title="Tests Completed"
          value={0}
          subtitle="Practice Sessions"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      <StatCard title="Question Score" value={`${stats.avgPercent}%`} subtitle="Correct Answers" />
      <StatCard
        title="Qbank Usage"
        value={`${stats.usedPercent}%`}
        subtitle={`${stats.uniqueQuestionsCount}/${stats.totalQuestions} Questions Attempted`}
      />
      <StatCard
        title="Tests Completed"
        value={stats.testsCompleted}
        subtitle="Practice Sessions"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: ReactNode;
  subtitle: string;
}) {

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-primary-light border-2 border-primary p-6 shadow-lg transition-shadow duration-300">
      <div className="relative bg-white rounded-xl shadow-inner p-6">
        <div className="text-sm font-semibold text-primary mb-2 tracking-wide">{title}</div>
        <div className={`text-5xl font-extrabold mb-1 drop-shadow-sm ${getGradientTextClasses()}`}>{value}</div>
        <div className="text-sm text-primary font-medium">{subtitle}</div>
      </div>
    </div>
  );
}

// src/app/year4/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import ClientClock from "@/components/ClientClock";
import DashboardStatsClient from "@/components/year4/DashboardStatsClient";
import { headers } from "next/headers";

type ProfileResponse = {
  firstName?: string | null;
  timezone?: string | null;
};

export default async function Dashboard() {
  const session = await auth();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  let profile: ProfileResponse | null = null;
  let dbUnavailable = false;

  if (host) {
    try {
      const res = await fetch(`${proto}://${host}/api/profile`, { cache: "no-store" });
      if (res.ok) {
        profile = (await res.json()) as ProfileResponse;
      } else if (res.status === 503) {
        dbUnavailable = true;
      }
    } catch {
      dbUnavailable = true;
    }
  }

  const fallbackName = session?.user?.name || session?.user?.email || "Student";
  const name = dbUnavailable ? "Offline Mode" : profile?.firstName || fallbackName;
  const userForClock = { timezone: profile?.timezone || undefined };

  return (
    <Shell title={`Welcome, ${name}`} pageName="Dashboard">
      {dbUnavailable && (
        <div className="mb-6 rounded-xl border border-[#F5C06C] bg-[#FFF7E6] p-4 text-[#8B6D00]">
          We couldn’t reach the database. Some dynamic features are disabled, but you can continue reviewing static
          content. Check your DATABASE_URL/LOCAL_DATABASE_URL or start the local database to restore full
          functionality.
        </div>
      )}

      <DashboardStatsClient />

      <div className="rounded-2xl bg-gradient-to-br from-white to-[#F8FCFF] border border-[#E6F0F7] p-6 shadow-lg">
        <div className="flex justify-center items-center">
          <ClientClock user={userForClock} />
        </div>
      </div>
    </Shell>
  );
}

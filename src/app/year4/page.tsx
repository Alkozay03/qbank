// src/app/year4/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import ClientClock from "@/components/ClientClock";
import DashboardStatsClient from "@/components/year4/DashboardStatsClient";
import { prisma } from "@/server/db";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard() {
  const session = await auth();
  
  let firstName: string | null = null;
  let timezone: string | null = null;
  let dbUnavailable = false;

  // Directly query the database for the most up-to-date profile data
  if (session?.user?.email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { 
          firstName: true,
          timezone: true,
        },
      });
      
      if (user) {
        firstName = user.firstName;
        timezone = user.timezone;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      dbUnavailable = true;
    }
  }

  const fallbackName = session?.user?.name || session?.user?.email || "Student";
  // Ensure we use firstName if it exists and is not empty
  const name = dbUnavailable 
    ? "Offline Mode" 
    : (firstName && firstName.trim() !== "") 
      ? firstName 
      : fallbackName;
  const userForClock = { timezone: timezone || undefined };

  return (
    <Shell title={`Welcome, ${name}`} pageName="Dashboard">
      {dbUnavailable && (
        <div className="mb-4 rounded-xl border-2 border-warning bg-warning/10 p-4 text-warning">
          We couldn&apos;t reach the database. Some dynamic features are disabled, but you can continue reviewing static
          content. Check your DATABASE_URL/LOCAL_DATABASE_URL or start the local database to restore full
          functionality.
        </div>
      )}

      <DashboardStatsClient />

      <div className="rounded-2xl bg-primary-light border-2 border-primary p-6 shadow-lg">
        <div className="flex justify-center items-center bg-white rounded-xl shadow-inner p-4">
          <ClientClock user={userForClock} />
        </div>
      </div>
    </Shell>
  );
}

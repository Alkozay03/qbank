// src/app/year3/page.tsx
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import ClientClock from "@/components/ClientClock";
import DashboardStatsClient from "@/components/year3/DashboardStatsClient";
import { prisma } from "@/server/db";
import { getRandomWelcomeMessage } from "@/lib/welcomeMessages";

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
      // Log detailed error for debugging
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`❌ [YEAR3] Database query failed: ${error}\n`);
        if (error instanceof Error) {
          process.stderr.write(`❌ [YEAR3] Error message: ${error.message}\n`);
          process.stderr.write(`❌ [YEAR3] Error stack: ${error.stack}\n`);
        }
      }
      console.error("Error fetching user profile:", error);
      dbUnavailable = true;
    }
  }

  const fallbackName = session?.user?.name || session?.user?.email || "Student";
  // Use firstName if available, otherwise fall back to session name
  // Don't show "Offline Mode" - just use fallback gracefully
  const name = (firstName && firstName.trim() !== "") 
    ? firstName 
    : fallbackName;
  const userForClock = { timezone: timezone || undefined };
  
  // Generate random welcome message on every page load
  const welcomeMessage = getRandomWelcomeMessage(name);

  return (
    <Shell title={welcomeMessage} pageName="Dashboard">
      {dbUnavailable && (
        <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-blue-800">
          <p className="font-semibold">⚡ Using cached data</p>
          <p className="text-sm mt-1">
            Some features may be temporarily limited. Your session is active and most functionality is available.
          </p>
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

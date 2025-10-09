export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { isWebsiteCreator } from "@/lib/website-creator";
import LiveUsersClient from "./client";

export default async function LiveUsersPage() {
  const session = await auth();
  const email = session?.user?.email;
  
  if (!email) {
    redirect("/login");
  }

  // Only Website Creator can access this page
  if (!isWebsiteCreator(email)) {
    redirect("/year5/master-admin");
  }

  // Get all users with active sessions (expires in the future)
  const now = new Date();
  const activeSessions = await prisma.session.findMany({
    where: {
      expires: {
        gt: now, // Session hasn't expired
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          image: true,
        },
      },
    },
    orderBy: {
      expires: "desc", // Most recent activity first
    },
  });

  // Remove duplicate users (in case they have multiple sessions)
  const uniqueUsers = Array.from(
    new Map(activeSessions.map(s => [s.user.id, s.user])).values()
  );

  return <LiveUsersClient users={uniqueUsers} />;
}

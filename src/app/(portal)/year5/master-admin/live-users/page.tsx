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

  // Get all users with activity in the last 5 minutes
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const activeUsers = await prisma.userActivity.findMany({
    where: {
      lastSeen: {
        gte: fiveMinutesAgo, // Activity in last 5 minutes
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
      lastSeen: "desc", // Most recent activity first
    },
  });

  const uniqueUsers = activeUsers.map(activity => activity.user);

  return <LiveUsersClient users={uniqueUsers} />;
}

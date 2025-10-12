import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { isWebsiteCreator } from "@/lib/website-creator";

/**
 * GET /api/live-users
 * 
 * Returns list of currently active users (activity in last 5 minutes)
 * Only accessible to Website Creator
 */
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email;
    
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Website Creator can access this endpoint
    if (!isWebsiteCreator(email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all users with activity in the last 5 minutes
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const activeUsers = await prisma.userActivity.findMany({
      where: {
        lastSeen: {
          gte: fiveMinutesAgo,
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
        lastSeen: "desc",
      },
    });

    const users = activeUsers.map(activity => activity.user);

    return NextResponse.json({ 
      users,
      count: users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching live users:", error);
    return NextResponse.json(
      { error: "Failed to fetch live users" },
      { status: 500 }
    );
  }
}

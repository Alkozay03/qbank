import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * POST /api/user-activity/heartbeat
 * 
 * Updates the user's lastSeen timestamp
 * Called periodically from the client to track online users
 */
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use session.user.id directly - no need to look up user by email
    const userId = session.user.id;

    // Update or create user activity record
    await prisma.userActivity.upsert({
      where: { userId: userId },
      update: {
        lastSeen: new Date(),
      },
      create: {
        userId: userId,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

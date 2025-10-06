// src/app/api/notifications/unread-count/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * Returns a count of unread notifications for the current user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    // Get user's current rotation for filtering
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rotation: true },
    });
    const userRotation = user?.rotation || null;

    // Build the where clause - only include rotation match if user has a rotation set
    const whereClause: {
      isDeleted: boolean;
      OR?: Array<{ targetRotation: string | null }>;
      targetRotation?: null;
      readReceipts: { none: { userId: string } };
    } = {
      isDeleted: false,
      readReceipts: {
        none: {
          userId: userId
        }
      }
    };

    // If user has a rotation, filter by global OR matching rotation
    // If user has no rotation set, only show global notifications
    if (userRotation) {
      whereClause.OR = [
        { targetRotation: null }, // Global notifications
        { targetRotation: userRotation }, // Match user's specific rotation
      ];
    } else {
      whereClause.targetRotation = null; // Only global notifications
    }

    const count = await prisma.notification.count({
      where: whereClause,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    
    // If table doesn't exist or database connection fails, return 0 instead of error
    if (error instanceof Error && (
      error.message.includes('does not exist') || 
      error.message.includes('relation') ||
      error.message.includes('table') ||
      error.message.includes("Can't reach database") ||
      error.message.includes('connection') ||
      (error as { code?: string }).code === 'P1001'
    )) {
      console.warn("Database connection issue or notification tables don't exist, returning 0");
      return NextResponse.json({ count: 0 });
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to count notifications",
        details: error instanceof Error ? error.stack : "Unknown error"
      },
      { status: 500 }
    );
  }
}

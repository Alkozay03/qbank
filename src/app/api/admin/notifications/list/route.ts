import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/notifications/list
 * Admin-only endpoint to list ALL notifications (including deleted ones)
 */
export async function GET() {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check admin authorization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "master_admin" && user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get ALL notifications (including deleted ones) for admin view
    const notifications = await db.notification.findMany({
      select: {
        id: true,
        shortId: true,
        title: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
        targetRotation: true,
        createdById: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        readReceipts: {
          select: {
            id: true,
            userId: true,
            readAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return wrapped response to match client expectations
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

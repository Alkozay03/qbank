// src/app/api/notifications/mark-read/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

/**
 * Mark a notification as read by creating a read receipt.
 * Accepts a notification ID or shortId.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  try {
    // Accept shortId or notification ID
    const { shortId, id } = (await req.json().catch(() => ({}))) as {
      shortId?: number;
      id?: string;
    };

    if (!shortId && !id) {
      return NextResponse.json({ error: "Either shortId or id is required" }, { status: 400 });
    }

    // Find the notification
    const notification = await prisma.notification.findUnique({
      where: shortId ? { shortId } : { id },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Create the read receipt (using upsert to handle duplicates)
    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: notification.id,
          userId,
        },
      },
      update: {}, // no update needed, just keep the existing record
      create: {
        notificationId: notification.id,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark as read" },
      { status: 500 }
    );
  }
}

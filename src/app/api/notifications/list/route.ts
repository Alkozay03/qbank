// src/app/api/notifications/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * GET /api/notifications/list?take=20
 * Returns latest non-deleted notifications with read status.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const takeParam = Number(searchParams.get("take") ?? "20");
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(50, takeParam)) : 20;
  const showOnlyUnread = searchParams.get("unreadOnly") === "true";

  try {
    // Get notifications with read status
    const rows = await prisma.notification.findMany({
      where: {
        isDeleted: false,
        ...(showOnlyUnread
          ? {
              readReceipts: {
                none: {
                  userId,
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        shortId: true,
        title: true,
        body: true,
        createdAt: true,
        readReceipts: {
          where: {
            userId,
          },
          select: {
            readAt: true,
          },
        },
      },
    });

    // Transform to include isRead flag
    const notifications = rows.map(({ readReceipts, ...notification }) => ({
      ...notification,
      isRead: readReceipts.length > 0,
      readAt: readReceipts[0]?.readAt || null,
    }));

    // Return array directly to match client expectations
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error listing notifications:", error);
    
    // If table doesn't exist, return empty array
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list notifications" },
      { status: 500 }
    );
  }
}

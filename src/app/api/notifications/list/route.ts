// src/app/api/notifications/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * GET /api/notifications/list?take=20
 * Returns latest non-deleted notifications.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const takeParam = Number(searchParams.get("take") ?? "20");
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(50, takeParam)) : 20;

  const rows = await prisma.notification.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      shortId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    },
  });

  return NextResponse.json({ items: rows });
}

// src/app/api/notifications/mark-read/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Stubbed "mark as read" endpoint.
 * Your current schema has no per-user read receipts for notifications,
 * so we simply accept a shortId and return { ok: true }.
 * If you later add a read table, we can persist it here.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept shortId/customId for forward compatibility
  const { shortId, customId } = (await req.json().catch(() => ({}))) as {
    shortId?: number;
    customId?: number;
  };
  void shortId;
  void customId;

  return NextResponse.json({ ok: true });
}

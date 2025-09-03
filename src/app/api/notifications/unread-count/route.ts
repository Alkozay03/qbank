// src/app/api/notifications/unread-count/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * With the current schema there is no per-user "read receipt" table.
 * Return 0 to avoid noisy badges until we add persistence.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ count: 0 });
}

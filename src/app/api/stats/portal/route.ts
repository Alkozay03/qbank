// src/app/api/stats/portal/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * Minimal, schema-aligned stats:
 * - total attempts
 * - total correct
 * - avg timeSeconds
 * - avg changeCount
 *
 * Note: current schema has no `portal` or per-question aggregates on Response.
 * We accept ?portal for forward-compat, but ignore it here.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept but ignore for now (no `portal` field in schema)
  // const portal = new URL(req.url).searchParams.get("portal");

  const [total, correct, agg] = await Promise.all([
    prisma.response.count({ where: { userId } }),
    prisma.response.count({ where: { userId, isCorrect: true } }),
    prisma.response.aggregate({
      where: { userId },
      _avg: { timeSeconds: true, changeCount: true },
    }),
  ]);

  return NextResponse.json({
    totalAnswered: total,
    totalCorrect: correct,
    avgTimeSec: agg._avg.timeSeconds ?? null,
    avgChanges: agg._avg.changeCount ?? null,
  });
}

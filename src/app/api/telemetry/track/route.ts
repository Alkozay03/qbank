// src/app/api/telemetry/track/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * Minimal telemetry endpoint aligned with current schema:
 * Response fields available: userId, quizItemId, choiceId, isCorrect, timeSeconds, changeCount.
 * We upsert by (userId, quizItemId) logically: findFirst then update or create.
 */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    quizItemId: string;
    choiceId: string | null;
    isCorrect: boolean | null;
    timeSeconds: number | null;
    changeDelta: number | null;
  }>;

  const { quizItemId, choiceId, isCorrect, timeSeconds, changeDelta } = body;

  if (!quizItemId) {
    return NextResponse.json({ error: "quizItemId required" }, { status: 400 });
  }

  const existing = await prisma.response.findFirst({
    where: { userId, quizItemId },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.response.update({
      where: { id: existing.id },
      data: {
        choiceId: choiceId ?? undefined,
        isCorrect: typeof isCorrect === "boolean" ? isCorrect : undefined,
        timeSeconds: typeof timeSeconds === "number" ? timeSeconds : undefined,
        changeCount: {
          increment:
            typeof changeDelta === "number" && changeDelta > 0 ? changeDelta : 0,
        },
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: updated.id });
  }

  const created = await prisma.response.create({
    data: {
      userId,
      quizItemId,
      choiceId: choiceId ?? null,
      isCorrect: typeof isCorrect === "boolean" ? isCorrect : null,
      timeSeconds: typeof timeSeconds === "number" ? timeSeconds : null,
      changeCount: Math.max(0, Number(changeDelta || 0)),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}

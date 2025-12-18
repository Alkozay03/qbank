// src/app/api/quiz/[id]/suspend/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * POST /api/quiz/[id]/suspend
 * Body (optional): { action: "suspend" | "resume" }
 * Updates the quiz.status for the signed-in user's quiz.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as {
    action?: "suspend" | "resume";
  };

  // Ensure the quiz belongs to the user
  const quiz = await prisma.quiz.findFirst({
    where: { id, user: { email } },
    select: { id: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Default to "suspend" when no action is provided (UI calls without body)
  const status = action === "resume" ? "Active" : "Suspended";

  await prisma.quiz.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true, status });
}

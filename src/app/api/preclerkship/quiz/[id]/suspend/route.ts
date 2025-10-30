// src/app/api/preclerkship/quiz/[id]/suspend/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * POST /api/preclerkship/quiz/[id]/suspend
 * Body: { action: "suspend" | "resume" }
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

  if (action !== "suspend" && action !== "resume") {
    return NextResponse.json({ error: "action must be 'suspend' or 'resume'" }, { status: 400 });
  }

  // Ensure the quiz belongs to the user
  const quiz = await prisma.preClerkshipQuiz.findFirst({
    where: { id, User: { email } },
    select: { id: true },
  });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = action === "suspend" ? "Suspended" : "Active";

  await prisma.preClerkshipQuiz.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true, status });
}

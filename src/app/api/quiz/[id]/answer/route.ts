// src/app/api/quiz/[id]/answer/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

/**
 * GET /api/quiz/[id]/answer?quizItemId=...
 * Returns the answer choices for the given quiz item (scoped to quiz [id]).
 */
export async function GET(
  req: Request,
  ctx: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quizId = ctx.params.id;
  const { searchParams } = new URL(req.url);
  const quizItemId = searchParams.get("quizItemId");

  if (!quizItemId) {
    return NextResponse.json({ error: "quizItemId required" }, { status: 400 });
  }

  const item = await prisma.quizItem.findFirst({
    where: { id: quizItemId, quizId },
    include: { question: { include: { answers: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    quizId,
    quizItemId,
    questionId: item.questionId,
    choices: item.question.answers.map((a) => ({
      id: a.id,
      text: a.text,
    })),
  });
}

// src/app/api/quiz/[id]/end/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { setQuestionMode } from "@/lib/quiz/questionMode";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, user: { email } },
    select: {
      id: true,
      userId: true,
      items: {
        select: {
          id: true,
          questionId: true,
          marked: true,
          responses: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const omissionTargets = quiz.items.filter((item) => !item.marked && item.responses.length === 0);

  if (omissionTargets.length) {
    await prisma.$transaction(
      omissionTargets.map((item) =>
        prisma.response.create({
          data: {
            quizItemId: item.id,
            userId: quiz.userId,
            choiceId: null,
            isCorrect: null,
          },
        })
      )
    );

    await Promise.all(
      omissionTargets.map((item) => setQuestionMode(item.questionId, "omitted"))
    );
  }

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { status: "Ended" },
  });

  return NextResponse.json({ ok: true, omitted: omissionTargets.length });
}

// src/app/api/quiz/[id]/end/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

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
    where: { id, User: { email } },
    select: {
      id: true,
      userId: true,
      QuizItem: {
        select: {
          id: true,
          questionId: true,
          marked: true,
          Response: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Handle omitted questions (not answered and not marked)
  const omissionTargets = quiz.QuizItem.filter((item) => !item.marked && item.Response.length === 0);

  if (omissionTargets.length) {
    await prisma.$transaction(
      omissionTargets.map((item) =>
        prisma.response.create({
          data: {
            id: crypto.randomUUID(),
            quizItemId: item.id,
            userId: quiz.userId,
            choiceId: null,
            isCorrect: null,
          },
        })
      )
    );
  }

  // Update USER-SPECIFIC question modes in the cached table
  const modeUpdates = [];
  
  for (const item of quiz.QuizItem) {
    // Get the latest response for this question from the CURRENT quiz
    const currentQuizResponse = await prisma.response.findFirst({
      where: { quizItemId: item.id },
      select: { choiceId: true, isCorrect: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Determine the mode based on the quiz state
    let mode: string;
    
    if (item.marked) {
      // Priority 1: If marked, mode is "marked" regardless of answer
      mode = "marked";
    } else if (currentQuizResponse) {
      if (currentQuizResponse.choiceId === null) {
        mode = "omitted";
      } else if (currentQuizResponse.isCorrect === true) {
        mode = "correct";
      } else if (currentQuizResponse.isCorrect === false) {
        mode = "incorrect";
      } else {
        mode = "omitted";
      }
    } else {
      // Not answered and not marked = omitted
      mode = "omitted";
    }
    
    // Update the cached mode in UserQuestionMode table
    modeUpdates.push(
      prisma.userQuestionMode.upsert({
        where: {
          userId_questionId: {
            userId: quiz.userId,
            questionId: item.questionId
          }
        },
        update: {
          mode,
          updatedAt: new Date(),
        },
        create: {
          userId: quiz.userId,
          questionId: item.questionId,
          mode,
          updatedAt: new Date(),
        },
      })
    );
  }
  
  // Execute all mode updates in parallel
  await Promise.all(modeUpdates);

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { status: "Ended" },
  });

  return NextResponse.json({ ok: true, omitted: omissionTargets.length });
}

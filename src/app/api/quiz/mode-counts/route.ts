// src/app/api/quiz/mode-counts/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

type QuestionSnapshot = {
  marked: boolean;
  response?: { createdAt: Date; choiceId: string | null; isCorrect: boolean | null };
};

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [totalQuestions, quizItems] = await Promise.all([
      prisma.question.count(),
      prisma.quizItem.findMany({
        where: { quiz: { userId: user.id } },
        select: {
          questionId: true,
          marked: true,
          responses: {
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, choiceId: true, isCorrect: true },
            take: 1,
          },
        },
      }),
    ]);

    const questionState = new Map<string, QuestionSnapshot>();

    for (const item of quizItems) {
      const snapshot = questionState.get(item.questionId) ?? { marked: false };
      snapshot.marked = snapshot.marked || item.marked;
      const latest = item.responses[0];
      if (latest && (!snapshot.response || latest.createdAt > snapshot.response.createdAt)) {
        snapshot.response = latest;
      }
      questionState.set(item.questionId, snapshot);
    }

    const counts = {
      unused: 0,
      incorrect: 0,
      correct: 0,
      omitted: 0,
      marked: 0,
    };

    questionState.forEach((snapshot) => {
      if (snapshot.marked) {
        counts.marked += 1;
        return;
      }

      const response = snapshot.response;
      if (!response || !response.choiceId) {
        counts.omitted += 1;
        return;
      }

      if (response.isCorrect === true) {
        counts.correct += 1;
      } else {
        counts.incorrect += 1;
      }
    });

    counts.unused = Math.max(0, totalQuestions - questionState.size);

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error calculating mode counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

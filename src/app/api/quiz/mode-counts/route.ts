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
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [totalQuestions, quizItems] = await Promise.all([
      prisma.question.count(),
      prisma.quizItem.findMany({
        where: { quiz: { userId } },
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

    // Count questions by their state
    questionState.forEach((snapshot) => {
      if (snapshot.marked) {
        counts.marked += 1;
        return;
      }

      const response = snapshot.response;
      if (!response) {
        // Question has QuizItem but no response - this means it was in a test but not answered
        // Questions can never be "unused" again once they're in a test, so count as omitted
        counts.omitted += 1;
        return;
      }
      
      if (!response.choiceId) {
        counts.omitted += 1;
        return;
      }

      if (response.isCorrect === true) {
        counts.correct += 1;
      } else {
        counts.incorrect += 1;
      }
    });

    // Unused = questions that have NEVER been in any test
    // Total questions - (questions with quiz items) 
    const questionsInAnyTest = questionState.size;
    counts.unused = Math.max(0, totalQuestions - questionsInAnyTest);

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error calculating mode counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

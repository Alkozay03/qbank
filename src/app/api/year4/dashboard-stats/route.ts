import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { isDatabaseUnavailableError } from "@/server/db/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session?.user?.email || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalQuestions, correctResponses, totalResponses, testsCompleted] = await Promise.all([
      prisma.question.count(),
      prisma.response.count({
        where: {
          quizItem: { quiz: { userId } },
          isCorrect: true,
        },
      }),
      prisma.response.count({
        where: { quizItem: { quiz: { userId } } },
      }),
      prisma.quiz.count({ where: { userId } }),
    ]);

    const avgPercent = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const usedPercent = totalQuestions > 0 ? Math.round((totalResponses / totalQuestions) * 100) : 0;

    return NextResponse.json({
      avgPercent,
      usedPercent,
      testsCompleted,
      totalQuestions,
      totalResponses,
      correctResponses,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        status: "offline",
        message: "Database unavailable",
      }, { status: 503 });
    }
    throw error;
  }
}

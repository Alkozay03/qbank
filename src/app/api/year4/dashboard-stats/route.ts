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
    const [totalQuestions, correctResponses, totalResponses, testsCompleted, uniqueQuestionsSolved] = await Promise.all([
      // Only count questions that have at least one occurrence (properly saved questions)
      prisma.question.count({
        where: {
          QuestionOccurrence: {
            some: {},
          },
        },
      }),
      prisma.response.count({
        where: {
          QuizItem: { Quiz: { userId, status: "Ended" } },
          isCorrect: true,
        },
      }),
      prisma.response.count({
        where: { QuizItem: { Quiz: { userId, status: "Ended" } } },
      }),
      prisma.quiz.count({ where: { userId, status: "Ended" } }),
      // Count unique QUESTIONS the user has answered
      prisma.quizItem.findMany({
        where: { 
          Quiz: { userId, status: "Ended" },
          Response: { some: {} }
        },
        select: {
          questionId: true
        },
        distinct: ['questionId']
      }),
    ]);

    // Get unique question IDs from the quiz items
    const uniqueQuestionIds = new Set(uniqueQuestionsSolved.map(r => r.questionId));
    const uniqueQuestionsCount = uniqueQuestionIds.size;
    const avgPercent = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const usedPercent = totalQuestions > 0 ? Math.round((uniqueQuestionsCount / totalQuestions) * 100) : 0;

    return NextResponse.json({
      avgPercent,
      usedPercent,
      testsCompleted,
      totalQuestions,
      totalResponses,
      correctResponses,
      uniqueQuestionsCount, // Add this for the "X/Y Questions Attempted" display
    });
  } catch (error) {
    console.error("[Year4 Dashboard Stats] Error:", error);
    if (isDatabaseUnavailableError(error)) {
      // Return default values when database is unavailable so UI still works
      return NextResponse.json({
        avgPercent: 0,
        usedPercent: 0,
        testsCompleted: 0,
        totalQuestions: 0,
        totalResponses: 0,
        correctResponses: 0,
        uniqueQuestionsCount: 0,
        isOffline: true
      });
    }
    // Return default values for any other error (e.g., missing tables, schema issues)
    return NextResponse.json({
      avgPercent: 0,
      usedPercent: 0,
      testsCompleted: 0,
      totalQuestions: 0,
      totalResponses: 0,
      correctResponses: 0,
      uniqueQuestionsCount: 0,
      isOffline: false
    });
  }
}

// src/app/api/questions/stats/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json().catch(() => ({}))) as {
      questionIds?: unknown;
    };

    const ids = Array.isArray(payload.questionIds)
      ? payload.questionIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    const questionIds = Array.from(new Set(ids));
    if (questionIds.length === 0) {
      return NextResponse.json({ stats: {} });
    }

    const responses = await prisma.response.findMany({
      where: {
        userId: { not: null },
        quizItem: { questionId: { in: questionIds } },
      },
      select: {
        userId: true,
        isCorrect: true,
        choiceId: true,
        createdAt: true,
        quizItem: {
          select: { questionId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const firstAttemptByUser = new Map<
      string,
      { questionId: string; isCorrect: boolean; choiceId: string | null }
    >();

    for (const response of responses) {
      const questionId = response.quizItem.questionId;
      const userId = response.userId;
      if (!questionId || !userId) continue;
      const key = `${questionId}::${userId}`;
      if (firstAttemptByUser.has(key)) continue;
      firstAttemptByUser.set(key, {
        questionId,
        isCorrect: response.isCorrect === true,
        choiceId: response.choiceId ?? null,
      });
    }

    const aggregates = new Map<
      string,
      { total: number; correct: number; choices: Map<string, number> }
    >();
    firstAttemptByUser.forEach(({ questionId, isCorrect, choiceId }) => {
      const bucket =
        aggregates.get(questionId) ?? {
          total: 0,
          correct: 0,
          choices: new Map<string, number>(),
        };
      bucket.total += 1;
      if (isCorrect) bucket.correct += 1;
      if (choiceId) {
        bucket.choices.set(choiceId, (bucket.choices.get(choiceId) ?? 0) + 1);
      }
      aggregates.set(questionId, bucket);
    });

    const stats = questionIds.reduce<
      Record<
        string,
        {
          totalFirstAttempts: number;
          firstAttemptCorrect: number;
          percent: number | null;
          choiceFirstAttempts: Record<string, { count: number; percent: number | null }>;
        }
      >
    >(
      (acc, questionId) => {
        const bucket =
          aggregates.get(questionId) ?? {
            total: 0,
            correct: 0,
            choices: new Map<string, number>(),
          };
        const percent = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : null;
        const choiceEntries: Record<string, { count: number; percent: number | null }> = {};
        bucket.choices.forEach((count, choiceId) => {
          choiceEntries[choiceId] = {
            count,
            percent: bucket.total > 0 ? Math.round((count / bucket.total) * 100) : null,
          };
        });
        acc[questionId] = {
          totalFirstAttempts: bucket.total,
          firstAttemptCorrect: bucket.correct,
          percent,
          choiceFirstAttempts: choiceEntries,
        };
        return acc;
      },
      {}
    );

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error loading question stats", error);
    return NextResponse.json({ error: "Failed to load question stats" }, { status: 500 });
  }
}

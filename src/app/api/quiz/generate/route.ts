// src/app/api/quiz/generate/route.ts
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { selectQuestions } from "@/lib/quiz/selectQuestions";
import { TagType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<{
      year: string;
      rotationKeys: string[];
      topics: string[];
      count: number;
      mode: string;
      types: string[];
      reviewMode?: boolean;
    }>;

    const year = typeof body.year === "string" ? body.year : "Y4"; // Default to Y4 for backwards compatibility

    const rotationKeys = Array.isArray(body.rotationKeys)
      ? body.rotationKeys.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    const topicValues = Array.isArray(body.topics)
      ? body.topics.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    const types = Array.isArray(body.types)
      ? body.types.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    const reviewMode = body.reviewMode === true;
    const topicValuesWithFallback =
      reviewMode || topicValues.includes("topic_not_selected")
        ? topicValues
        : [...topicValues, "topic_not_selected"];

    const rawCount = Number(body.count);
    const requestedCount = Number.isFinite(rawCount) ? rawCount : 10;
    if (!reviewMode && requestedCount > 100) {
      return NextResponse.json({ error: "Maximum question count is 100" }, { status: 400 });
    }

    const take = reviewMode ? undefined : Math.max(1, Math.min(100, requestedCount));
    if (!rotationKeys.length) {
      return NextResponse.json({ error: "Select at least one rotation" }, { status: 400 });
    }

    const userId = session.user.id;

    let ids: string[] = [];

    const fetchReviewRows = async (topics: string[]) =>
      prisma.question.findMany({
        where: {
          QuestionOccurrence: {
            some: { year },
          },
          AND: [
            {
              QuestionTag: {
                some: {
                  Tag: {
                    type: TagType.ROTATION,
                    value: { in: rotationKeys },
                  },
                },
              },
            },
            ...(topics.length
              ? [
                  {
                    QuestionTag: {
                      some: {
                        Tag: {
                          type: TagType.TOPIC,
                          value: { in: topics },
                        },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

    if (reviewMode) {
      let rows = await fetchReviewRows(topicValues);
      if (rows.length === 0 && topicValues.length > 0) {
        rows = await fetchReviewRows([]);
      }

      // Shuffle to vary ordering
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      ids = rows.map((r) => r.id);
    } else {
      ids = await selectQuestions({
        userId,
        year,
        rotationKeys,
        topicValues: topicValuesWithFallback,
        types,
        take: take ?? 10,
      });

      // If we got some but not enough, widen by dropping mode filter first
      const target = take ?? 10;
      if (types.length > 0 && ids.length < target) {
        const more = await selectQuestions({
          userId,
          year,
          rotationKeys,
          topicValues: topicValuesWithFallback,
          types: [],
          take: target - ids.length,
        });
        if (more.length) {
          const merged = Array.from(new Set([...ids, ...more]));
          ids = merged.slice(0, target);
        }
      }

      // If mode filter is too restrictive, retry without it
      if (ids.length === 0 && types.length > 0) {
        ids = await selectQuestions({
          userId,
          year,
          rotationKeys,
          topicValues: topicValuesWithFallback,
          types: [],
          take: take ?? 10,
        });
      }

      // If topic filter is too restrictive, retry without it
      if (ids.length === 0 && topicValues.length > 0) {
        ids = await selectQuestions({
          userId,
          year,
          rotationKeys,
          topicValues: [],
          types: [],
          take: take ?? 10,
        });
      }

      // Backfill with untagged topics to hit the requested count (temporary safety net)
      if (ids.length < target) {
        const backfill = await selectQuestions({
          userId,
          year,
          rotationKeys,
          topicValues: [], // no topic filter -> includes untagged + tagged
          types: [], // also drop mode filter for the backfill
          take: target - ids.length,
        });
        if (backfill.length) {
          const merged = Array.from(new Set([...ids, ...backfill]));
          ids = merged.slice(0, target);
        }
      }

      // Final backfill: rotation-only (ignores year/topic/mode) to reach target
      if (ids.length < target) {
        const extra = await prisma.question.findMany({
          where: {
            id: { notIn: ids },
            QuestionTag: {
              some: {
                Tag: {
                  type: TagType.ROTATION,
                  value: { in: rotationKeys },
                },
              },
            },
          },
          select: { id: true },
          take: target - ids.length,
          orderBy: { createdAt: "desc" },
        });
        if (extra.length) {
          const merged = Array.from(new Set([...ids, ...extra.map((r) => r.id)]));
          ids = merged.slice(0, target);
        }
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "No questions match your filters." }, { status: 400 });
    }

    const quizId = `quiz-${Date.now()}`;
    const quiz = await prisma.quiz.create({
      data: {
        id: quizId,
        userId,
        status: reviewMode ? "Ended" : "Active",
        mode: reviewMode ? "REVIEW" : "RANDOM",
        count: ids.length,
        QuizItem: {
          create: ids.map((qid, i) => ({ 
            id: `qi-${quizId}-${i}`,
            questionId: qid, 
            orderInQuiz: i,
            updatedAt: new Date(),
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ id: quiz.id });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz" },
      { status: 500 }
    );
  }
}


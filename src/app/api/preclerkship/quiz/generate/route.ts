// src/app/api/preclerkship/quiz/generate/route.ts
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { selectPreClerkshipQuestions } from "@/lib/quiz/selectPreClerkshipQuestions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    yearLevel: number;
    weekKeys: string[];
    lectureKeys: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
    count: number;
    mode: string;
    types: string[];
  }>;

  // Validate yearLevel
  const yearLevel = typeof body.yearLevel === "number" ? body.yearLevel : 1;
  if (![1, 2, 3].includes(yearLevel)) {
    return NextResponse.json({ error: "Invalid year level. Must be 1, 2, or 3." }, { status: 400 });
  }

  const weekKeys = Array.isArray(body.weekKeys)
    ? body.weekKeys.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const lectureKeys = Array.isArray(body.lectureKeys)
    ? body.lectureKeys.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const resourceValues = Array.isArray(body.resources)
    ? body.resources.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const disciplineValues = Array.isArray(body.disciplines)
    ? body.disciplines.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const systemValues = Array.isArray(body.systems)
    ? body.systems.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const types = Array.isArray(body.types)
    ? body.types.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  const take = Math.max(1, Math.min(40, Number(body.count) || 10));
  
  // At least one week or lecture must be selected
  if (!weekKeys.length && !lectureKeys.length) {
    return NextResponse.json({ error: "Select at least one week or lecture" }, { status: 400 });
  }

  const userId = session.user.id;

  const ids = await selectPreClerkshipQuestions({
    userId,
    yearLevel,
    weekKeys,
    lectureKeys,
    resourceValues,
    disciplineValues,
    systemValues,
    types,
    take,
  });

  if (ids.length === 0) {
    return NextResponse.json({ error: "No questions match your filters." }, { status: 400 });
  }

  const quizId = `quiz-${Date.now()}`;
  const quiz = await prisma.preClerkshipQuiz.create({
    data: {
      id: quizId,
      userId,
      yearLevel,
      status: "Active",
      mode: "RANDOM",
      count: ids.length,
      PreClerkshipQuizItem: {
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
}

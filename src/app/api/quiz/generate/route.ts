// src/app/api/quiz/generate/route.ts
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { selectQuestions } from "@/lib/quiz/selectQuestions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    year: string;
    rotationKeys: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
    count: number;
    mode: string;
    types: string[];
  }>;

  const year = typeof body.year === "string" ? body.year : "Y4"; // Default to Y4 for backwards compatibility

  const rotationKeys = Array.isArray(body.rotationKeys)
    ? body.rotationKeys.filter((value): value is string => typeof value === "string" && value.length > 0)
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
  if (!rotationKeys.length) {
    return NextResponse.json({ error: "Select at least one rotation" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ids = await selectQuestions({
    userId: user.id,
    year,
    rotationKeys,
    resourceValues,
    disciplineValues,
    systemValues,
    types,
    take,
  });

  if (ids.length === 0) {
    return NextResponse.json({ error: "No questions match your filters." }, { status: 400 });
  }

  const quiz = await prisma.quiz.create({
    data: {
      userId: user.id,
      status: "Active",
      mode: "RANDOM",
      count: ids.length,
      items: {
        create: ids.map((qid, i) => ({ questionId: qid, orderInQuiz: i })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: quiz.id });
}


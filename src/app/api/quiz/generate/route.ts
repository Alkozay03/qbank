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
    rotationKeys: string[];
    resources: string[];
    disciplines: string[];
    systems: string[];
    count: number;
    mode: string;
    types: string[];
  }>;

  const {
    rotationKeys = [],
    resources: _resources = [],
    disciplines: _disciplines = [],
    systems: _systems = [],
    count = 10,
    mode: _mode = "RANDOM",
    types = [],
  } = body;

  const take = Math.max(1, Math.min(40, Number(count) || 10));
  if (!Array.isArray(rotationKeys) || rotationKeys.length === 0) {
    return NextResponse.json({ error: "Select at least one rotation" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ids = await selectQuestions({
    userId: user.id,
    rotationKeys,
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
      items: {
        create: ids.map((qid, i) => ({ questionId: qid, order: i })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: quiz.id });
}

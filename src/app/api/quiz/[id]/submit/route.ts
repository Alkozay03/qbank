// src/app/api/quiz/[id]/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(req: Request) {
  try {
    const {
      quizItemId,
      choiceId,
      choiceText,
      chosenLabel, // legacy field; if provided, we try to match by text
    } = (await req.json()) as {
      quizItemId: string;
      choiceId?: string;
      choiceText?: string;
      chosenLabel?: string;
    };

    if (!quizItemId || (!choiceId && !choiceText && !chosenLabel)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const item = await prisma.quizItem.findUnique({
      where: { id: quizItemId },
      include: { question: { include: { answers: true } } }, // schema uses Answer[]
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const answers = item.question.answers;
    const correctChoice = answers.find((a) => a.isCorrect) || null;

    // Prefer explicit choiceId, then match by text, then try legacy chosenLabel as text
    const pickedChoice =
      (choiceId && answers.find((a) => a.id === choiceId)) ||
      (choiceText && answers.find((a) => a.text === choiceText)) ||
      (chosenLabel && answers.find((a) => a.text === chosenLabel)) ||
      null;

    if (!pickedChoice || !correctChoice) {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const isCorrect = pickedChoice.id === correctChoice.id;

    // Upsert one response per quiz item (schema has quizItemId, userId optional)
    const existing = await prisma.response.findFirst({ where: { quizItemId } });
    if (existing) {
      await prisma.response.update({
        where: { id: existing.id },
        data: { choiceId: pickedChoice.id, isCorrect },
      });
    } else {
      await prisma.response.create({
        data: { quizItemId, choiceId: pickedChoice.id, isCorrect },
      });
    }

    return NextResponse.json({
      ok: true,
      isCorrect,
      correctText: correctChoice.text,
      pickedId: pickedChoice.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

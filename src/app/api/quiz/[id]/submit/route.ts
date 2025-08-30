// src/app/api/quiz/[id]/submit/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Prisma needs Node runtime
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { quizItemId, chosenLabel } = (await req.json()) as {
      quizItemId: string;
      chosenLabel: string;
    };

    if (!quizItemId || !chosenLabel) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const item = await db.quizItem.findUnique({
      where: { id: quizItemId },
      include: { question: { include: { choices: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const correctChoice = item.question.choices.find((c) => c.isCorrect);
    const pickedChoice = item.question.choices.find((c) => c.label === chosenLabel);

    if (!pickedChoice || !correctChoice) {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const isCorrect = pickedChoice.id === correctChoice.id;

    // Upsert one response per quiz item
    const existing = await db.response.findFirst({ where: { quizItemId } });
    if (existing) {
      await db.response.update({
        where: { id: existing.id },
        data: { choiceId: pickedChoice.id, isCorrect },
      });
    } else {
      await db.response.create({
        data: { quizItemId, choiceId: pickedChoice.id, isCorrect },
      });
    }

    return NextResponse.json({ ok: true, isCorrect, correctLabel: correctChoice.label });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
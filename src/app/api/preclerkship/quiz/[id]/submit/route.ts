// src/app/api/preclerkship/quiz/[id]/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    
    // Use session.user.id directly - no need to look up user by email
    const userId = session?.user?.id ?? null;

    const {
      quizItemId,
      choiceId,
      choiceText,
      chosenLabel, // legacy field; if provided, we try to match by text
      timeSeconds,
      changeCount,
    } = (await req.json()) as {
      quizItemId: string;
      choiceId?: string;
      choiceText?: string;
      chosenLabel?: string;
      timeSeconds?: number;
      changeCount?: number;
    };

    if (!quizItemId || (!choiceId && !choiceText && !chosenLabel)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const { id: quizId } = await ctx.params;
    const item = await prisma.preClerkshipQuizItem.findFirst({
      where: { id: quizItemId, quizId },
      include: { PreClerkshipQuestion: { include: { PreClerkshipAnswer: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const answers = item.PreClerkshipQuestion.PreClerkshipAnswer;
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

    // Upsert one response per quiz item
    const parsedTime = Number(timeSeconds);
    const numericTime = Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : null;
    const parsedChange = Number(changeCount);
    const numericChangeCount = Number.isFinite(parsedChange) && parsedChange >= 0 ? Math.trunc(parsedChange) : null;

    const responseWhere = userId
      ? { quizItemId, userId }
      : { quizItemId, userId: null };

    // OPTIMIZED: Delete old + create new in transaction (atomic, faster than findFirst + update)
    await prisma.$transaction([
      prisma.preClerkshipResponse.deleteMany({ where: responseWhere }),
      prisma.preClerkshipResponse.create({
        data: {
          id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          quizItemId,
          userId: userId ?? null,
          choiceId: pickedChoice.id,
          isCorrect,
          timeSeconds: numericTime ?? undefined,
          changeCount: numericChangeCount ?? undefined,
        },
      }),
    ]);

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

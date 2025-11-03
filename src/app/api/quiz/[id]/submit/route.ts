// src/app/api/quiz/[id]/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    
    // Use session.user.id directly - no need to look up user by email
    const userId = session?.user?.id ?? null;

    const body = (await req.json()) as {
      quizItemId: string;
      choiceId?: string;
      choiceText?: string;
      chosenLabel?: string;
      timeSeconds?: number;
      changeCount?: number;
      // EMQ-specific: answers is a map of stemId -> optionId
      emqAnswers?: Record<string, string>;
    };

    const {
      quizItemId,
      choiceId,
      choiceText,
      chosenLabel, // legacy field; if provided, we try to match by text
      timeSeconds,
      changeCount,
      emqAnswers,
    } = body;

    if (!quizItemId || (!choiceId && !choiceText && !chosenLabel && !emqAnswers)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const { id: quizId } = await ctx.params;
    const item = await prisma.quizItem.findFirst({
      where: { id: quizItemId, quizId },
      include: { Question: { include: { Choice: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const questionType = item.Question.questionType || 'MCQ';
    
    // Handle EMQ questions
    if (questionType === 'EMQ' && emqAnswers) {
      const stems = item.Question.Choice; // Each Choice is a stem for EMQ
      const parsedTime = Number(timeSeconds);
      const numericTime = Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : null;
      const parsedChange = Number(changeCount);
      const numericChangeCount = Number.isFinite(parsedChange) && parsedChange >= 0 ? Math.trunc(parsedChange) : null;

      const results: Array<{ stemId: string; isCorrect: boolean }> = [];
      let correctCount = 0;
      let totalCount = 0;

      // Process each stem answer
      for (const [stemId, selectedOptionId] of Object.entries(emqAnswers)) {
        const stem = stems.find((s) => s.id === stemId);
        if (!stem) continue;

        totalCount++;
        
        // Parse correctOptionIds - it's stored as JSON array of option IDs
        const correctOptionIds = Array.isArray(stem.correctOptionIds) 
          ? stem.correctOptionIds as string[]
          : [];
        
        const isCorrect = correctOptionIds.includes(selectedOptionId);
        if (isCorrect) correctCount++;
        
        results.push({ stemId, isCorrect });

        // Create/update Response for this stem
        const responseWhere = userId
          ? { quizItemId, userId, choiceId: stemId }
          : { quizItemId, userId: null, choiceId: stemId };

        const existing = await prisma.response.findFirst({ where: responseWhere });
        
        if (existing) {
          await prisma.response.update({
            where: { id: existing.id },
            data: {
              isCorrect,
              timeSeconds: numericTime ?? undefined,
              changeCount: numericChangeCount ?? undefined,
            },
          });
        } else {
          await prisma.response.create({
            data: {
              id: crypto.randomUUID(),
              quizItemId,
              userId: userId ?? null,
              choiceId: stemId, // The stem's Choice ID
              isCorrect,
              timeSeconds: numericTime ?? undefined,
              changeCount: numericChangeCount ?? undefined,
            },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        isEMQ: true,
        results,
        correctCount,
        totalCount,
        score: correctCount, // Each stem is 1 point
      });
    }

    // Handle standard MCQ questions
    const answers = item.Question.Choice;
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
  const parsedTime = Number(timeSeconds);
  const numericTime = Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : null;
  const parsedChange = Number(changeCount);
  const numericChangeCount = Number.isFinite(parsedChange) && parsedChange >= 0 ? Math.trunc(parsedChange) : null;

    const responseWhere = userId
      ? { quizItemId, userId }
      : { quizItemId, userId: null };

    const existing = await prisma.response.findFirst({ where: responseWhere });
    if (existing) {
      await prisma.response.update({
        where: { id: existing.id },
        data: {
          choiceId: pickedChoice.id,
          isCorrect,
          timeSeconds: numericTime ?? undefined,
          changeCount: numericChangeCount ?? undefined,
        },
      });
    } else {
      await prisma.response.create({
        data: {
          id: crypto.randomUUID(),
          quizItemId,
          userId: userId ?? null,
          choiceId: pickedChoice.id,
          isCorrect,
          timeSeconds: numericTime ?? undefined,
          changeCount: numericChangeCount ?? undefined,
        },
      });
    }

    // Note: Question modes are updated when the quiz ends, not on individual submissions
    // Marked questions remain marked until manually unmarked or quiz ends

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

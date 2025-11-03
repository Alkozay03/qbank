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

      // OPTIMIZED: Batch fetch existing responses for all stems in ONE query
      const existingResponses = await prisma.response.findMany({
        where: {
          quizItemId,
          userId: userId ?? null,
          choiceId: { in: Object.keys(emqAnswers) }
        },
        select: { id: true, choiceId: true }
      });
      
      const existingMap = new Map(existingResponses.map(r => [r.choiceId, r.id]));
      const responsesToCreate: Array<{
        id: string;
        quizItemId: string;
        userId: string | null;
        choiceId: string;
        isCorrect: boolean;
        timeSeconds: number | null;
        changeCount: number | null;
      }> = [];
      const responsesToUpdate: Array<{
        id: string;
        isCorrect: boolean;
        timeSeconds: number | null;
        changeCount: number | null;
      }> = [];

      // Process each stem answer (prepare batch operations)
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

        // Prepare create or update data
        const existingId = existingMap.get(stemId);
        if (existingId) {
          responsesToUpdate.push({
            id: existingId,
            isCorrect,
            timeSeconds: numericTime,
            changeCount: numericChangeCount,
          });
        } else {
          responsesToCreate.push({
            id: crypto.randomUUID(),
            quizItemId,
            userId: userId ?? null,
            choiceId: stemId,
            isCorrect,
            timeSeconds: numericTime,
            changeCount: numericChangeCount,
          });
        }
      }

      // OPTIMIZED: Execute batch updates and creates in parallel
      await Promise.all([
        // Batch create all new responses
        responsesToCreate.length > 0 
          ? prisma.response.createMany({ data: responsesToCreate })
          : Promise.resolve(),
        // Batch update all existing responses
        ...responsesToUpdate.map(r =>
          prisma.response.update({
            where: { id: r.id },
            data: {
              isCorrect: r.isCorrect,
              timeSeconds: r.timeSeconds ?? undefined,
              changeCount: r.changeCount ?? undefined,
            },
          })
        )
      ]);

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

    // OPTIMIZED: Delete old + create new in transaction (atomic, 2 queries in parallel)
    await prisma.$transaction([
      prisma.response.deleteMany({ where: responseWhere }),
      prisma.response.create({
        data: {
          id: crypto.randomUUID(),
          quizItemId,
          userId: userId ?? null,
          choiceId: pickedChoice.id,
          isCorrect,
          timeSeconds: numericTime ?? undefined,
          changeCount: numericChangeCount ?? undefined,
        },
      }),
    ]);

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

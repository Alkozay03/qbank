"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleFlag(quizItemId: string, flagged: boolean) {
  await db.quizItem.update({ where: { id: quizItemId }, data: { flagged } });
}

export async function submitAnswer(params: {
  quizItemId: string;
  questionId: string;
  chosenLabel: string;
  elapsedMs?: number;
  lockAnswers: boolean;
}) {
  const { quizItemId, questionId, chosenLabel, elapsedMs = 0, lockAnswers } = params;

  const existing = await db.response.findFirst({ where: { quizItemId } });
  const correct = await db.choice.findFirst({
    where: { questionId, isCorrect: true },
    select: { label: true },
  });
  const isCorrect = chosenLabel === correct?.label;

  let resp;
  if (existing) {
    resp = lockAnswers
      ? existing
      : await db.response.update({
          where: { id: existing.id },
          data: { chosenLabel, isCorrect, elapsedMs },
        });
  } else {
    resp = await db.response.create({
      data: { quizItemId, chosenLabel, isCorrect, elapsedMs },
    });
  }

  const all = await db.response.findMany({
    where: { quizItem: { questionId } },
    select: { chosenLabel: true },
  });
  const total = all.length || 1;
  const perChoice = new Map<string, number>();
  for (const r of all) {
    const key = r.chosenLabel ?? "_";
    perChoice.set(key, (perChoice.get(key) ?? 0) + 1);
  }
  const correctCount = await db.response.count({
    where: { quizItem: { questionId }, isCorrect: true },
  });

  return {
    saved: !!resp,
    isCorrect,
    correctLabel: correct?.label ?? null,
    perChoicePercent: Object.fromEntries(
      Array.from(perChoice.entries()).map(([k, v]) => [k, Math.round((v * 100) / total)])
    ),
    percentCorrectOverall: Math.round((correctCount * 100) / total),
  };
}

export async function endBlock(quizId: string) {
  revalidatePath(`/performance`);
  return { redirectTo: "/performance" };
}

import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";

export type QuestionMode = "unused" | "incorrect" | "correct" | "omitted" | "marked";

const VALID_MODES: ReadonlySet<QuestionMode> = new Set([
  "unused",
  "incorrect",
  "correct",
  "omitted",
  "marked",
]);

export function canonicalizeQuestionMode(value: string | null | undefined): QuestionMode | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (VALID_MODES.has(normalized as QuestionMode)) {
    return normalized as QuestionMode;
  }
  return null;
}

export async function getCurrentQuestionMode(questionId: string): Promise<QuestionMode | null> {
  const record = await prisma.questionTag.findFirst({
    where: { questionId, tag: { type: TagType.MODE } },
    include: { tag: true },
  });

  return canonicalizeQuestionMode(record?.tag?.value ?? null);
}

/**
 * Set the USER-SPECIFIC mode for a question
 * This updates the cached UserQuestionMode table
 */
export async function setQuestionModeForUser(
  userId: string,
  questionId: string,
  mode: QuestionMode
): Promise<void> {
  await prisma.userQuestionMode.upsert({
    where: {
      userId_questionId: { userId, questionId }
    },
    update: {
      mode,
      updatedAt: new Date(),
    },
    create: {
      userId,
      questionId,
      mode,
      updatedAt: new Date(),
    },
  });
}

/**
 * @deprecated Use setQuestionModeForUser instead - modes are now user-specific
 */
export async function setQuestionMode(_questionId?: string, _mode?: QuestionMode): Promise<void> {
  void _questionId;
  void _mode;
  // This function is kept for backwards compatibility but does nothing
  // MODE tags should not be stored globally anymore
}

export async function deriveModeFromHistory(questionId: string): Promise<QuestionMode> {
  const latest = await prisma.response.findFirst({
    where: { quizItem: { questionId } },
    orderBy: { createdAt: "desc" },
    select: { choiceId: true, isCorrect: true },
  });

  if (!latest) {
    return "unused";
  }

  if (!latest.choiceId) {
    return "omitted";
  }

  if (latest.isCorrect === true) {
    return "correct";
  }

  if (latest.isCorrect === false) {
    return "incorrect";
  }

  return "unused";
}

export async function ensureQuestionMode(questionId: string, fallback: QuestionMode = "unused"): Promise<QuestionMode> {
  const current = await getCurrentQuestionMode(questionId);
  if (current) {
    return current;
  }
  await setQuestionMode(questionId, fallback);
  return fallback;
}

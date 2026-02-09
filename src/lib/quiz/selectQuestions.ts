// src/lib/quiz/selectQuestions.ts
import { prisma } from "@/server/db";
import { TagType, Prisma } from "@prisma/client";
import { expandTagValues } from "@/lib/tags/server";

function buildTagFilter(type: TagType, rawValues: string[]): Prisma.QuestionWhereInput | null {
  const variants = expandTagValues(type, rawValues);
  if (!variants.length) return null;

  const includeNotSelected = type === TagType.TOPIC && variants.includes("topic_not_selected");
  const explicit = variants
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v !== "topic_not_selected");

  if (type === TagType.TOPIC && includeNotSelected && explicit.length === 0) {
    // Only "Not Selected" chosen: do not filter by topic at all
    return null;
  }

  if (type === TagType.TOPIC && includeNotSelected) {
    const hasExplicit = explicit.length > 0;
    const explicitClause = hasExplicit
      ? {
          QuestionTag: {
            some: {
              Tag: {
                type,
                value: { in: explicit, mode: "insensitive" as const },
              },
            },
          },
        }
      : null;

    return {
      OR: [
        ...(explicitClause ? [explicitClause] : []),
        {
          NOT: {
            QuestionTag: {
              some: {
                Tag: { type: TagType.TOPIC },
              },
            },
          },
        },
      ],
    };
  }

  const uniqueValues = Array.from(new Set(explicit.map((value) => value.trim()).filter(Boolean)));
  if (!uniqueValues.length) return null;

  return {
    QuestionTag: {
      some: {
        Tag: {
          type,
          value: { in: uniqueValues, mode: "insensitive" as const },
        },
      },
    },
  };
}

export async function selectQuestions(opts: {
  userId: string;
  year?: string;
  rotationKeys: string[];
  topicValues?: string[];
  types?: string[];
  take: number;
}): Promise<string[]> {
  const {
    rotationKeys,
    year,
    topicValues = [],
    types = [],
    take,
    userId,
  } = opts;

  const whereClauses: Prisma.QuestionWhereInput[] = [];

  // Build filters with OR within each category
  const rotationFilter = buildTagFilter(TagType.ROTATION, rotationKeys);
  if (rotationFilter) {
    whereClauses.push(rotationFilter);
  }

  const topicFilter = buildTagFilter(TagType.TOPIC, topicValues);
  if (topicFilter) {
    whereClauses.push(topicFilter);
  }

  // Filter by year if provided (Year 5 vs Year 4)
  if (year) {
    whereClauses.push({
      QuestionOccurrence: {
        some: {
          year: year,
        },
      },
    });
  }

  if (types.length > 0) {
    // Pull stored modes first (source of truth, includes "used")
    const userModes = await prisma.userQuestionMode.findMany({
      where: { userId },
      select: { questionId: true, mode: true, updatedAt: true },
    });

    // Latest responses + quiz items (fallback for questions without stored mode)
    const answeredQuestions = await prisma.response.findMany({
      where: { userId },
      include: {
        QuizItem: {
          select: {
            questionId: true,
            marked: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userQuizItems = await prisma.quizItem.findMany({
      where: { Quiz: { userId } },
      select: { questionId: true, marked: true },
    });

    const modeByQuestion = new Map<string, string>();
    for (const row of userModes) {
      if (row.questionId && row.mode) {
        modeByQuestion.set(row.questionId, row.mode);
      }
    }

    const responsesByQuestion = new Map<string, (typeof answeredQuestions)[number]>();
    const markedQuestions = new Set<string>();
    const usedQuestionIds = new Set<string>();

    for (const item of userQuizItems) {
      usedQuestionIds.add(item.questionId);
      if (item.marked) {
        markedQuestions.add(item.questionId);
      }
    }

    for (const response of answeredQuestions) {
      const questionId = response.QuizItem.questionId;
      if (response.QuizItem.marked) {
        markedQuestions.add(questionId);
      }
      const existing = responsesByQuestion.get(questionId);
      if (!existing || response.createdAt > existing.createdAt) {
        responsesByQuestion.set(questionId, response);
      }
    }

    const questionIdsByType: Record<string, Set<string>> = {
      marked: new Set<string>(),
      unused: new Set<string>(),
      correct: new Set<string>(),
      incorrect: new Set<string>(),
      omitted: new Set<string>(),
      used: new Set<string>(),
    };

    // Apply stored modes as the authoritative source
    for (const [questionId, mode] of modeByQuestion.entries()) {
      if (mode === "marked") questionIdsByType.marked.add(questionId);
      else if (mode === "correct") questionIdsByType.correct.add(questionId);
      else if (mode === "incorrect") questionIdsByType.incorrect.add(questionId);
      else if (mode === "omitted") questionIdsByType.omitted.add(questionId);
      else if (mode === "used") questionIdsByType.used.add(questionId);
    }

    // Fallback classification for questions without a stored mode
    for (const [questionId, response] of responsesByQuestion.entries()) {
      if (modeByQuestion.has(questionId)) continue;
      if (response.choiceId === null || response.choiceId === undefined) {
        questionIdsByType.omitted.add(questionId);
      } else if (response.isCorrect === true) {
        questionIdsByType.correct.add(questionId);
      } else if (response.isCorrect === false) {
        questionIdsByType.incorrect.add(questionId);
      }
    }

    for (const questionId of usedQuestionIds) {
      if (modeByQuestion.has(questionId)) continue;
      if (!responsesByQuestion.has(questionId) && !markedQuestions.has(questionId)) {
        questionIdsByType.used.add(questionId); // in a quiz but unanswered (suspended)
      }
    }

    // Marked overrides all other modes
    for (const qid of markedQuestions) {
      questionIdsByType.marked.add(qid);
      questionIdsByType.used.delete(qid);
      questionIdsByType.correct.delete(qid);
      questionIdsByType.incorrect.delete(qid);
      questionIdsByType.omitted.delete(qid);
    }

    // All questions (used to derive "unused" set)
    const allQuestions = await prisma.question.findMany({
      select: { id: true },
    });

    // Only questions that have NEVER been in any test are truly "unused"
    for (const q of allQuestions) {
      const questionId = q.id;
      if (
        !questionIdsByType.correct.has(questionId) &&
        !questionIdsByType.incorrect.has(questionId) &&
        !questionIdsByType.omitted.has(questionId) &&
        !questionIdsByType.marked.has(questionId) &&
        !questionIdsByType.used.has(questionId)
      ) {
        questionIdsByType.unused.add(questionId);
      }
    }

    const includeQuestionIds = new Set<string>();
    for (const type of types) {
      const set = questionIdsByType[type];
      if (!set) continue;
      for (const id of set) {
        includeQuestionIds.add(id);
      }
    }

    if (includeQuestionIds.size === 0) {
      return [];
    }

    whereClauses.push({ id: { in: Array.from(includeQuestionIds) } });
  }

  const where: Prisma.QuestionWhereInput = whereClauses.length
    ? { AND: whereClauses }
    : {};

  let pool: { id: string }[] = [];
  pool = await prisma.question.findMany({
    where,
    select: { id: true },
    take: Math.max(take * 3, take),
    orderBy: { createdAt: "desc" }
  });

  if (pool.length === 0) {
    return [];
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, take).map((q) => q.id);
}

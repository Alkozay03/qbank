// src/lib/quiz/selectQuestions.ts
import { prisma } from "@/server/db";
import { TagType, Prisma } from "@prisma/client";
import { expandTagValues } from "@/lib/tags/server";

function buildTagFilter(type: TagType, rawValues: string[]): Prisma.QuestionWhereInput | null {
  const variants = expandTagValues(type, rawValues);
  if (!variants.length) {
    return null;
  }

  const uniqueValues = Array.from(new Set(variants.map((value) => value.trim()).filter(Boolean)));
  if (!uniqueValues.length) {
    return null;
  }

  const orClauses = uniqueValues.map((value) => ({
    value: { equals: value, mode: "insensitive" as const },
  }));

  return {
    questionTags: {
      some: {
        tag: {
          type,
          ...(orClauses.length ? { OR: orClauses } : {}),
        },
      },
    },
  };
}

export async function selectQuestions(opts: {
  userId: string;
  rotationKeys: string[];
  resourceValues?: string[];
  disciplineValues?: string[];
  systemValues?: string[];
  types?: string[];
  take: number;
}): Promise<string[]> {
  const {
    rotationKeys,
    resourceValues = [],
    disciplineValues = [],
    systemValues = [],
    types = [],
    take,
    userId,
  } = opts;

  const tagFilters: Prisma.QuestionWhereInput[] = [];

  const rotationFilter = buildTagFilter(TagType.ROTATION, rotationKeys);
  if (rotationFilter) {
    tagFilters.push(rotationFilter);
  }

  const resourceFilter = buildTagFilter(TagType.RESOURCE, resourceValues);
  if (resourceFilter) {
    tagFilters.push(resourceFilter);
  }

  const disciplineFilter = buildTagFilter(TagType.SUBJECT, disciplineValues);
  if (disciplineFilter) {
    tagFilters.push(disciplineFilter);
  }

  const systemFilter = buildTagFilter(TagType.SYSTEM, systemValues);
  if (systemFilter) {
    tagFilters.push(systemFilter);
  }

  const whereClauses: Prisma.QuestionWhereInput[] = [...tagFilters];

  if (types.length > 0) {
    const answeredQuestions = await prisma.response.findMany({
      where: { userId },
      include: {
        quizItem: {
          select: {
            questionId: true,
            marked: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userQuizItems = await prisma.quizItem.findMany({
      where: { quiz: { userId } },
      select: { questionId: true, marked: true },
    });

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
      const questionId = response.quizItem.questionId;
      if (response.quizItem.marked) {
        markedQuestions.add(questionId);
      }
      const existing = responsesByQuestion.get(questionId);
      if (!existing || response.createdAt > existing.createdAt) {
        responsesByQuestion.set(questionId, response);
      }
    }

    const questionIdsByType: Record<string, Set<string>> = {
      marked: markedQuestions,
      unused: new Set<string>(),
      correct: new Set<string>(),
      incorrect: new Set<string>(),
      omitted: new Set<string>(),
    };

    const allQuestions = await prisma.question.findMany({ select: { id: true } });
    
    // First, classify all questions based on their response history
    for (const [questionId, response] of responsesByQuestion.entries()) {
      if (response.choiceId === null || response.choiceId === undefined) {
        questionIdsByType.omitted.add(questionId);
      } else if (response.isCorrect === true) {
        questionIdsByType.correct.add(questionId);
      } else if (response.isCorrect === false) {
        questionIdsByType.incorrect.add(questionId);
      }
    }
    
    // Questions that were in tests but have no response should be omitted, not unused
    for (const questionId of usedQuestionIds) {
      if (!responsesByQuestion.has(questionId) && !markedQuestions.has(questionId)) {
        questionIdsByType.omitted.add(questionId);
      }
    }
    
    // Only questions that have NEVER been in any test are truly "unused"
    for (const q of allQuestions) {
      const questionId = q.id;
      if (!questionIdsByType.correct.has(questionId) && 
          !questionIdsByType.incorrect.has(questionId) && 
          !questionIdsByType.omitted.has(questionId) && 
          !markedQuestions.has(questionId) &&
          !usedQuestionIds.has(questionId)) {
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
  try {
    pool = await prisma.question.findMany({
      where,
      select: { id: true },
      take: Math.max(take * 3, take),
      orderBy: { createdAt: "desc" },
    });
  } catch {
    pool = await prisma.question.findMany({
      select: { id: true },
      take: Math.max(take * 3, take),
      orderBy: { createdAt: "desc" },
    });
  }

  if (pool.length === 0) {
    pool = await prisma.question.findMany({
      select: { id: true },
      take: Math.max(take * 3, take),
      orderBy: { createdAt: "desc" },
    });
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, take).map((q) => q.id);
}

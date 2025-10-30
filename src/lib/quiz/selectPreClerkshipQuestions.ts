// src/lib/quiz/selectPreClerkshipQuestions.ts
import { prisma } from "@/server/db";
import { PreClerkshipTagType, Prisma } from "@prisma/client";

function buildPreClerkshipTagFilter(type: PreClerkshipTagType, rawValues: string[]): Prisma.PreClerkshipQuestionWhereInput | null {
  if (!rawValues.length) {
    return null;
  }

  const uniqueValues = Array.from(new Set(rawValues.map((value) => value.trim()).filter(Boolean)));
  if (!uniqueValues.length) {
    return null;
  }

  const orClauses = uniqueValues.map((value) => ({
    value: { equals: value, mode: "insensitive" as const },
  }));

  return {
    PreClerkshipQuestionTag: {
      some: {
        PreClerkshipTag: {
          type,
          ...(orClauses.length ? { OR: orClauses } : {}),
        },
      },
    },
  };
}

export async function selectPreClerkshipQuestions(opts: {
  userId: string;
  yearLevel: number; // 1, 2, or 3
  weekKeys?: string[]; // e.g., ["Week 1", "Week 2"]
  lectureKeys?: string[]; // e.g., ["Lecture 1", "Lecture 2"]
  resourceValues?: string[];
  disciplineValues?: string[]; // SUBJECT type
  systemValues?: string[];
  types?: string[]; // "unused", "marked", "correct", "incorrect", "omitted"
  take: number;
}): Promise<string[]> {
  const {
    yearLevel,
    weekKeys = [],
    lectureKeys = [],
    resourceValues = [],
    disciplineValues = [],
    systemValues = [],
    types = [],
    take,
    userId,
  } = opts;

  const whereClauses: Prisma.PreClerkshipQuestionWhereInput[] = [];

  // Year level is mandatory
  whereClauses.push({ yearLevel });

  // Build filters with OR within each category
  const weekFilter = buildPreClerkshipTagFilter(PreClerkshipTagType.WEEK, weekKeys);
  if (weekFilter) {
    whereClauses.push(weekFilter);
  }

  const lectureFilter = buildPreClerkshipTagFilter(PreClerkshipTagType.LECTURE, lectureKeys);
  if (lectureFilter) {
    whereClauses.push(lectureFilter);
  }

  const resourceFilter = buildPreClerkshipTagFilter(PreClerkshipTagType.RESOURCE, resourceValues);
  if (resourceFilter) {
    whereClauses.push(resourceFilter);
  }

  const disciplineFilter = buildPreClerkshipTagFilter(PreClerkshipTagType.SUBJECT, disciplineValues);
  if (disciplineFilter) {
    whereClauses.push(disciplineFilter);
  }

  const systemFilter = buildPreClerkshipTagFilter(PreClerkshipTagType.SYSTEM, systemValues);
  if (systemFilter) {
    whereClauses.push(systemFilter);
  }

  // Filter by question types if specified
  if (types.length > 0) {
    const answeredQuestions = await prisma.preClerkshipResponse.findMany({
      where: { userId },
      include: {
        PreClerkshipQuizItem: {
          select: {
            questionId: true,
            marked: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userQuizItems = await prisma.preClerkshipQuizItem.findMany({
      where: { PreClerkshipQuiz: { userId, yearLevel } },
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
      const questionId = response.PreClerkshipQuizItem.questionId;
      if (response.PreClerkshipQuizItem.marked) {
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

    const allQuestions = await prisma.preClerkshipQuestion.findMany({ 
      where: { yearLevel },
      select: { id: true },
    });
    
    // Classify all questions based on their response history
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

  const where: Prisma.PreClerkshipQuestionWhereInput = whereClauses.length
    ? { AND: whereClauses }
    : {};

  let pool: { id: string }[] = [];
  try {
    pool = await prisma.preClerkshipQuestion.findMany({
      where,
      select: { id: true },
      take: Math.max(take * 3, take),
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching pre-clerkship questions:", error);
    return [];
  }

  if (pool.length === 0) {
    return [];
  }

  // Shuffle and take the requested number
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, take).map((q) => q.id);
}

// src/app/api/quiz/dynamic-counts/route.ts
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { TagType, Prisma } from "@prisma/client";
import { expandTagValues } from "@/lib/tags/server";

interface DynamicCountsRequest {
  year: string;
  selectedMode?: string;
  selectedRotations?: string[];
  selectedResources?: string[];
  selectedDisciplines?: string[];
  selectedSystems?: string[];
}

function buildTagFilter(type: TagType, rawValues: string[]): Prisma.QuestionWhereInput | null {
  if (!rawValues || rawValues.length === 0) return null;
  
  const variants = expandTagValues(type, rawValues);
  if (!variants.length) return null;

  const uniqueValues = Array.from(new Set(variants.map((value) => value.trim()).filter(Boolean)));
  if (!uniqueValues.length) return null;

  const orClauses = uniqueValues.map((value) => ({
    value: { equals: value, mode: "insensitive" as const },
  }));

  return {
    questionTags: {
      some: {
        tag: {
          type,
          OR: orClauses,
        },
      },
    },
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as DynamicCountsRequest;

  const {
    year = "Y4",
    selectedMode,
    selectedRotations = [],
    selectedResources = [],
    selectedDisciplines = [],
  } = body;

  const userId = session.user.id;

  try {
    // Step 1: Get question IDs filtered by mode (if selected)
    let modeFilteredIds: Set<string> | null = null;

    if (selectedMode && selectedMode !== "all") {
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

      for (const [questionId, response] of responsesByQuestion.entries()) {
        if (response.choiceId === null || response.choiceId === undefined) {
          questionIdsByType.omitted.add(questionId);
        } else if (response.isCorrect === true) {
          questionIdsByType.correct.add(questionId);
        } else if (response.isCorrect === false) {
          questionIdsByType.incorrect.add(questionId);
        }
      }

      for (const questionId of usedQuestionIds) {
        if (!responsesByQuestion.has(questionId) && !markedQuestions.has(questionId)) {
          questionIdsByType.omitted.add(questionId);
        }
      }

      // ✅ CACHE THIS: All questions is global data (same for all users)
      const allQuestions = await prisma.question.findMany({ 
        select: { id: true },
        cacheStrategy: { ttl: 3600, swr: 600 }  // 1h cache, 10min stale
      });

      for (const q of allQuestions) {
        const questionId = q.id;
        if (
          !questionIdsByType.correct.has(questionId) &&
          !questionIdsByType.incorrect.has(questionId) &&
          !questionIdsByType.omitted.has(questionId) &&
          !markedQuestions.has(questionId) &&
          !usedQuestionIds.has(questionId)
        ) {
          questionIdsByType.unused.add(questionId);
        }
      }

      modeFilteredIds = questionIdsByType[selectedMode] || new Set();
    }

    // Step 2: Build base where clause
    const baseWhere: Prisma.QuestionWhereInput = {
      occurrences: {
        some: { year },
      },
      ...(modeFilteredIds ? { id: { in: Array.from(modeFilteredIds) } } : {}),
    };

    // Step 3: Calculate counts for each category progressively

    // --- ROTATIONS ---
    const rotationCounts: Record<string, number> = {};
    const rotationKeys = ["peds", "surgery", "medicine", "obgyn", "psych", "fp"];
    
    for (const rotation of rotationKeys) {
      const rotationFilter = buildTagFilter(TagType.ROTATION, [rotation]);
      if (!rotationFilter) continue;

      const count = await prisma.question.count({
        where: {
          AND: [baseWhere, rotationFilter],
        },
        cacheStrategy: { ttl: 3600, swr: 600 },  // 1h cache, 10min stale
      });
      rotationCounts[rotation] = count;
    }

    // --- RESOURCES ---
    const resourceCounts: Record<string, number> = {};
    const resourceKeys = ["fa", "uworld", "amboss", "previouses"];

    const rotationWhere = selectedRotations.length > 0
      ? buildTagFilter(TagType.ROTATION, selectedRotations)
      : null;

    for (const resource of resourceKeys) {
      const resourceFilter = buildTagFilter(TagType.RESOURCE, [resource]);
      if (!resourceFilter) continue;

      const whereClauses = [baseWhere, resourceFilter];
      if (rotationWhere) whereClauses.push(rotationWhere);

      const count = await prisma.question.count({
        where: { AND: whereClauses },
        cacheStrategy: { ttl: 3600, swr: 600 },  // 1h cache, 10min stale
      });
      resourceCounts[resource] = count;
    }

    // --- DISCIPLINES ---
    const disciplineCounts: Record<string, number> = {};
    const disciplineKeys = [
      "anatomy",
      "behavioral",
      "biochem",
      "biostat",
      "development",
      "embryology",
      "genetics",
      "histology",
      "immunology",
      "micro",
      "neonatology",
      "path",
      "pathophys",
      "pharm",
      "physio",
    ];

    const resourceWhere = selectedResources.length > 0
      ? buildTagFilter(TagType.RESOURCE, selectedResources)
      : null;

    for (const discipline of disciplineKeys) {
      const disciplineFilter = buildTagFilter(TagType.SUBJECT, [discipline]);
      if (!disciplineFilter) continue;

      const whereClauses = [baseWhere, disciplineFilter];
      if (rotationWhere) whereClauses.push(rotationWhere);
      if (resourceWhere) whereClauses.push(resourceWhere);

      const count = await prisma.question.count({
        where: { AND: whereClauses },
        cacheStrategy: { ttl: 3600, swr: 600 },  // 1h cache, 10min stale
      });
      disciplineCounts[discipline] = count;
    }

    // --- SYSTEMS ---
    const systemCounts: Record<string, number> = {};
    const systemKeys = [
      "bio_general",
      "gen_general",
      "micro_general",
      "path_general",
      "pharm_general",
      "biostat_epi",
      "poison_env",
      "psych",
      "social",
      "misc",
      "allergy_immuno",
      "cardio",
      "derm",
      "endo",
      "gi_nutrition",
      "hemeonc",
      "musculoskeletal",
      "neuro_psych",
      "renal",
      "repro",
      "respiratory",
    ];

    const disciplineWhere = selectedDisciplines.length > 0
      ? buildTagFilter(TagType.SUBJECT, selectedDisciplines)
      : null;

    for (const system of systemKeys) {
      const systemFilter = buildTagFilter(TagType.SYSTEM, [system]);
      if (!systemFilter) continue;

      const whereClauses = [baseWhere, systemFilter];
      if (rotationWhere) whereClauses.push(rotationWhere);
      if (resourceWhere) whereClauses.push(resourceWhere);
      if (disciplineWhere) whereClauses.push(disciplineWhere);

      const count = await prisma.question.count({
        where: { AND: whereClauses },
        cacheStrategy: { ttl: 3600, swr: 600 },  // 1h cache, 10min stale
      });
      systemCounts[system] = count;
    }

    return NextResponse.json({
      rotations: rotationCounts,
      resources: resourceCounts,
      disciplines: disciplineCounts,
      systems: systemCounts,
    });
  } catch (error) {
    console.error("Error calculating dynamic counts:", error);
    return NextResponse.json(
      { error: "Failed to calculate counts" },
      { status: 500 }
    );
  }
}

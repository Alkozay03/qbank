// src/app/api/quiz/filtered-counts/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Prisma, TagType } from "@prisma/client";
import { expandTagValues } from "@/lib/tags/server";

type Payload = {
  year?: string;
  selectedModes?: string[];
  rotationKeys?: string[];
  resourceValues?: string[];
  disciplineValues?: string[];
  systemValues?: string[];
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use session.user.id directly instead of looking up by email
    const userId = session.user.id;

    const body = (await req.json().catch(() => ({}))) as Payload;

    const year = body.year ?? "Y4"; // Default to Y4 for backwards compatibility

    // Expand tag values
    const rotValues = expandTagValues(TagType.ROTATION, body.rotationKeys ?? []);
    const resValues = expandTagValues(TagType.RESOURCE, body.resourceValues ?? []);
    const discValues = expandTagValues(TagType.SUBJECT, body.disciplineValues ?? []);
    const sysValues = expandTagValues(TagType.SYSTEM, body.systemValues ?? []);
    const selectedModes = body.selectedModes ?? [];

    // First, get all questions that match the static tag filters
    // Using OR within each category (IN clause handles OR), AND across categories
    const staticFilterConditions: Prisma.Sql[] = [];
    
    if (rotValues.length) {
      // OR within rotations: questions with ANY of the selected rotations
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr
          JOIN "Tag" tr ON tr.id = qr."tagId"
          WHERE qr."questionId" = q.id
            AND tr.type = ${Prisma.raw(`'${TagType.ROTATION}'::"TagType"`)}
            AND tr.value IN (${Prisma.join(rotValues.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (resValues.length) {
      // OR within resources: questions with ANY of the selected resources
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr2
          JOIN "Tag" tr2 ON tr2.id = qr2."tagId"
          WHERE qr2."questionId" = q.id
            AND tr2.type = ${Prisma.raw(`'${TagType.RESOURCE}'::"TagType"`)}
            AND tr2.value IN (${Prisma.join(resValues.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (discValues.length) {
      // OR within disciplines: questions with ANY of the selected disciplines
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qs
          JOIN "Tag" ts ON ts.id = qs."tagId"
          WHERE qs."questionId" = q.id
            AND ts.type = ${Prisma.raw(`'${TagType.SUBJECT}'::"TagType"`)}
            AND ts.value IN (${Prisma.join(discValues.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (sysValues.length) {
      // OR within systems: questions with ANY of the selected systems
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qy
          JOIN "Tag" ty ON ty.id = qy."tagId"
          WHERE qy."questionId" = q.id
            AND ty.type = ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
            AND ty.value IN (${Prisma.join(sysValues.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    // Add year filtering to the static conditions
    if (year) {
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionOccurrence" qo
          WHERE qo."questionId" = q.id
            AND qo.year = ${year}
        )`
      );
    }

    const staticWhere = staticFilterConditions.length 
      ? Prisma.sql`WHERE ${Prisma.join(staticFilterConditions, ' AND ')}`
      : Prisma.empty;

    // Get all questions that match static filters
    const matchingQuestions = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT DISTINCT q.id
        FROM "Question" q
        ${staticWhere}
      `
    );

    const matchingQuestionIds = matchingQuestions.map(q => q.id);

    if (matchingQuestionIds.length === 0) {
      return NextResponse.json({
        modeCounts: { unused: 0, incorrect: 0, correct: 0, omitted: 0, marked: 0 },
        tagCounts: { rotations: {}, resources: {}, disciplines: {}, systems: {} }
      });
    }

    // Get USER-SPECIFIC question modes from the cached table (with index optimization)
    const userQuestionModes = await prisma.userQuestionMode.findMany({
      where: {
        userId: userId,
        questionId: { in: matchingQuestionIds }
      },
      select: {
        questionId: true,
        mode: true,
      },
      // Use cacheStrategy for repeated queries with same filters
      cacheStrategy: {
        ttl: 60, // Cache for 60 seconds
        swr: 30  // Stale-while-revalidate for 30 seconds
      }
    });

    // Create a map of questionId -> mode for fast lookup
    const modeMap = new Map<string, string>();
    for (const uqm of userQuestionModes) {
      modeMap.set(uqm.questionId, uqm.mode);
    }

    // Count by USER-SPECIFIC mode from cached table
    const modeCounts = {
      unused: 0,
      incorrect: 0,
      correct: 0,
      omitted: 0,
      marked: 0,
    };

    // Count all matching questions by their cached USER-SPECIFIC mode
    matchingQuestionIds.forEach(questionId => {
      const mode = modeMap.get(questionId);
      
      // No cached mode = unused (question never used by this user)
      if (!mode || mode === "unused") {
        modeCounts.unused += 1;
      } else if (mode === "correct") {
        modeCounts.correct += 1;
      } else if (mode === "incorrect") {
        modeCounts.incorrect += 1;
      } else if (mode === "omitted") {
        modeCounts.omitted += 1;
      } else if (mode === "marked") {
        modeCounts.marked += 1;
      } else {
        // Unknown mode, treat as unused
        modeCounts.unused += 1;
      }
    });

    // OPTIMIZED V2: Fetch ALL question data with tags in ONE query, then filter in memory
    // This eliminates 8 database queries → replaces with 1 query + fast in-memory operations
    
    type QuestionWithTags = {
      id: string;
      tags: Array<{ type: string; value: string }>;
    };

    // Single query to get ALL approved questions with their tags for the selected year
    const allQuestionsData = await prisma.$queryRaw<Array<{
      id: string;
      tags: unknown;
    }>>`
      SELECT 
        q.id,
        COALESCE(
          json_agg(
            json_build_object('type', t.type::text, 'value', t.value)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM "Question" q
      LEFT JOIN "QuestionTag" qt ON q.id = qt."questionId"
      LEFT JOIN "Tag" t ON qt."tagId" = t.id
      WHERE q.status = 'APPROVED'
        ${year ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "QuestionOccurrence" qo 
          WHERE qo."questionId" = q.id AND qo.year = ${year}
        )` : Prisma.empty}
      GROUP BY q.id
    `;

    // Parse tags and create lookup structure
    const allQuestions: QuestionWithTags[] = allQuestionsData.map(q => ({
      id: q.id,
      tags: Array.isArray(q.tags) ? q.tags as Array<{ type: string; value: string }> : []
    }));

    // Create tag lookup maps for fast filtering
    const questionTagMap = new Map<string, Map<string, Set<string>>>();
    for (const q of allQuestions) {
      const tagsByType = new Map<string, Set<string>>();
      for (const tag of q.tags) {
        if (!tagsByType.has(tag.type)) {
          tagsByType.set(tag.type, new Set());
        }
        tagsByType.get(tag.type)!.add(tag.value);
      }
      questionTagMap.set(q.id, tagsByType);
    }

    // Helper: Filter questions by tags (in-memory, very fast)
    function filterQuestionsByTags(
      questions: QuestionWithTags[],
      includeRotation: boolean,
      includeResource: boolean,
      includeDiscipline: boolean,
      includeSystem: boolean
    ): string[] {
      return questions
        .filter(q => {
          const tagsByType = questionTagMap.get(q.id)!;
          
          // Check rotation filter (OR within category)
          if (includeRotation && rotValues.length > 0) {
            const rotTags = tagsByType.get(TagType.ROTATION) || new Set();
            if (!rotValues.some(val => rotTags.has(val))) return false;
          }
          
          // Check resource filter (OR within category)
          if (includeResource && resValues.length > 0) {
            const resTags = tagsByType.get(TagType.RESOURCE) || new Set();
            if (!resValues.some(val => resTags.has(val))) return false;
          }
          
          // Check discipline filter (OR within category)
          if (includeDiscipline && discValues.length > 0) {
            const discTags = tagsByType.get(TagType.SUBJECT) || new Set();
            if (!discValues.some(val => discTags.has(val))) return false;
          }
          
          // Check system filter (OR within category)
          if (includeSystem && sysValues.length > 0) {
            const sysTags = tagsByType.get(TagType.SYSTEM) || new Set();
            if (!sysValues.some(val => sysTags.has(val))) return false;
          }
          
          return true;
        })
        .filter(q => {
          // Apply mode filter (user-specific)
          if (selectedModes.length === 0) return true;
          
          const mode = modeMap.get(q.id);
          if (!mode || mode === "unused") {
            return selectedModes.includes("unused");
          }
          return selectedModes.includes(mode);
        })
        .map(q => q.id);
    }

    // Helper: Count tags in filtered questions (in-memory, very fast)
    function countTagsInQuestions(questionIds: Set<string>): {
      rotations: Record<string, number>;
      resources: Record<string, number>;
      disciplines: Record<string, number>;
      systems: Record<string, number>;
    } {
      const counts = {
        rotations: new Map<string, number>(),
        resources: new Map<string, number>(),
        disciplines: new Map<string, number>(),
        systems: new Map<string, number>()
      };
      
      for (const q of allQuestions) {
        if (!questionIds.has(q.id)) continue;
        
        for (const tag of q.tags) {
          let map: Map<string, number> | undefined;
          if (tag.type === TagType.ROTATION) map = counts.rotations;
          else if (tag.type === TagType.RESOURCE) map = counts.resources;
          else if (tag.type === TagType.SUBJECT) map = counts.disciplines;
          else if (tag.type === TagType.SYSTEM) map = counts.systems;
          
          if (map) {
            map.set(tag.value, (map.get(tag.value) || 0) + 1);
          }
        }
      }
      
      return {
        rotations: Object.fromEntries(counts.rotations),
        resources: Object.fromEntries(counts.resources),
        disciplines: Object.fromEntries(counts.disciplines),
        systems: Object.fromEntries(counts.systems)
      };
    }

    // Calculate counts for each cascade level (all in-memory now, no more DB queries!)
    
    // Rotation counts: mode filter only (no tag filters)
    const rotationFiltered = filterQuestionsByTags(allQuestions, false, false, false, false);
    const rotationCounts = countTagsInQuestions(new Set(rotationFiltered));
    
    // Resource counts: mode + rotation filters
    const resourceFiltered = filterQuestionsByTags(allQuestions, true, false, false, false);
    const resourceCounts = countTagsInQuestions(new Set(resourceFiltered));
    
    // Discipline counts: mode + rotation + resource filters
    const disciplineFiltered = filterQuestionsByTags(allQuestions, true, true, false, false);
    const disciplineCounts = countTagsInQuestions(new Set(disciplineFiltered));
    
    // System counts: mode + rotation + resource + discipline filters
    const systemFiltered = filterQuestionsByTags(allQuestions, true, true, true, false);
    const systemCounts = countTagsInQuestions(new Set(systemFiltered));
    
    // Extract results from each cascade level
    const rotations = rotationCounts.rotations;
    const resources = resourceCounts.resources;
    const disciplines = disciplineCounts.disciplines;
    const systems = systemCounts.systems;

    return NextResponse.json({
      modeCounts,
      tagCounts: { rotations, resources, disciplines, systems }
    });
  } catch (error) {
    console.error("Error calculating filtered counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
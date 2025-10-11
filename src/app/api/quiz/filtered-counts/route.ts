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
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Get USER-SPECIFIC question modes from the cached table
    const userQuestionModes = await prisma.userQuestionMode.findMany({
      where: {
        userId: user.id,
        questionId: { in: matchingQuestionIds }
      },
      select: {
        questionId: true,
        mode: true,
      },
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

    // Count tags with proper OR within category logic
    // For each tag category, calculate counts based on UPSTREAM filters only (not same category)
    
    // Helper: Get questions matching specific upstream filters
    async function getQuestionsWithFilters(includeMode: boolean, includeRotation: boolean, includeResource: boolean, includeDiscipline: boolean) {
      const conditions: Prisma.Sql[] = [];
      
      // Always include year filter
      if (year) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "QuestionOccurrence" qo
            WHERE qo."questionId" = q.id AND qo.year = ${year}
          )`
        );
      }
      
      // Conditionally add other filters
      if (includeRotation && rotValues.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "QuestionTag" qr
            JOIN "Tag" tr ON tr.id = qr."tagId"
            WHERE qr."questionId" = q.id
              AND tr.type = ${Prisma.raw(`'${TagType.ROTATION}'::"TagType"`)}
              AND tr.value IN (${Prisma.join(rotValues.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      if (includeResource && resValues.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "QuestionTag" qr2
            JOIN "Tag" tr2 ON tr2.id = qr2."tagId"
            WHERE qr2."questionId" = q.id
              AND tr2.type = ${Prisma.raw(`'${TagType.RESOURCE}'::"TagType"`)}
              AND tr2.value IN (${Prisma.join(resValues.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      if (includeDiscipline && discValues.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "QuestionTag" qs
            JOIN "Tag" ts ON ts.id = qs."tagId"
            WHERE qs."questionId" = q.id
              AND ts.type = ${Prisma.raw(`'${TagType.SUBJECT}'::"TagType"`)}
              AND ts.value IN (${Prisma.join(discValues.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      const where = conditions.length 
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;
        
      const questions = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT DISTINCT q.id FROM "Question" q ${where}`
      );
      
      const questionIds = questions.map(q => q.id);
      
      // Apply mode filter if needed
      if (includeMode && selectedModes.length > 0) {
        return questionIds.filter(questionId => {
          const mode = modeMap.get(questionId);
          if (!mode || mode === "unused") {
            return selectedModes.includes("unused");
          }
          return selectedModes.includes(mode);
        });
      }
      
      return questionIds;
    }
    
    async function countTagsInQuestions(tagType: TagType, questionIds: string[]) {
      if (questionIds.length === 0) return {};
      
      const rows = await prisma.$queryRaw<Array<{ value: string; c: number }>>(
        Prisma.sql`
          SELECT t.value, COUNT(DISTINCT q.id)::int AS c
          FROM "Question" q
          JOIN "QuestionTag" qt ON qt."questionId" = q.id
          JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${tagType}'::"TagType"`)}
          WHERE q.id IN (${Prisma.join(questionIds.map(id => Prisma.sql`${id}`))})
          GROUP BY t.value
        `
      );
      
      const map: Record<string, number> = {};
      for (const r of rows) {
        map[r.value] = r.c;
      }
      return map;
    }

    // Rotation counts: based on mode only (not filtered by rotations themselves)
    const rotationQuestions = await getQuestionsWithFilters(true, false, false, false);
    const rotations = await countTagsInQuestions(TagType.ROTATION, rotationQuestions);
    
    // Resource counts: based on mode + rotations (not filtered by resources themselves)
    const resourceQuestions = await getQuestionsWithFilters(true, true, false, false);
    const resources = await countTagsInQuestions(TagType.RESOURCE, resourceQuestions);
    
    // Discipline counts: based on mode + rotations + resources (not filtered by disciplines themselves)
    const disciplineQuestions = await getQuestionsWithFilters(true, true, true, false);
    const disciplines = await countTagsInQuestions(TagType.SUBJECT, disciplineQuestions);
    
    // System counts: based on mode + rotations + resources + disciplines
    const systemQuestions = await getQuestionsWithFilters(true, true, true, true);
    const systems = await countTagsInQuestions(TagType.SYSTEM, systemQuestions);

    return NextResponse.json({
      modeCounts,
      tagCounts: { rotations, resources, disciplines, systems }
    });
  } catch (error) {
    console.error("Error calculating filtered counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
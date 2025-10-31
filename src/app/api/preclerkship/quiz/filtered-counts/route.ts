// src/app/api/preclerkship/quiz/filtered-counts/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Prisma, PreClerkshipTagType } from "@prisma/client";

type Payload = {
  yearLevel: number; // 1, 2, or 3
  selectedModes?: string[];
  weekKeys?: string[];
  lectureKeys?: string[];
  disciplines?: string[];
  systems?: string[];
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await req.json().catch(() => ({}))) as Payload;

    const yearLevel = body.yearLevel ?? 1;
    const weekKeys = body.weekKeys ?? [];
    const lectureKeys = body.lectureKeys ?? [];
    const disciplines = body.disciplines ?? [];
    const systems = body.systems ?? [];
    const selectedModes = body.selectedModes ?? [];

    // First, get all questions for this year level that match static filters
    const staticFilterConditions: Prisma.Sql[] = [];
    
    // Always filter by year level
    staticFilterConditions.push(
      Prisma.sql`q."yearLevel" = ${yearLevel}`
    );

    if (weekKeys.length) {
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "PreClerkshipQuestionTag" qt
          JOIN "PreClerkshipTag" t ON t.id = qt."tagId"
          WHERE qt."questionId" = q.id
            AND t.type = ${Prisma.raw(`'${PreClerkshipTagType.WEEK}'::"PreClerkshipTagType"`)}
            AND t.value IN (${Prisma.join(weekKeys.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (lectureKeys.length) {
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "PreClerkshipQuestionTag" qt2
          JOIN "PreClerkshipTag" t2 ON t2.id = qt2."tagId"
          WHERE qt2."questionId" = q.id
            AND t2.type = ${Prisma.raw(`'${PreClerkshipTagType.LECTURE}'::"PreClerkshipTagType"`)}
            AND t2.value IN (${Prisma.join(lectureKeys.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (disciplines.length) {
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "PreClerkshipQuestionTag" qt3
          JOIN "PreClerkshipTag" t3 ON t3.id = qt3."tagId"
          WHERE qt3."questionId" = q.id
            AND t3.type = ${Prisma.raw(`'${PreClerkshipTagType.SUBJECT}'::"PreClerkshipTagType"`)}
            AND t3.value IN (${Prisma.join(disciplines.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    if (systems.length) {
      staticFilterConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "PreClerkshipQuestionTag" qt4
          JOIN "PreClerkshipTag" t4 ON t4.id = qt4."tagId"
          WHERE qt4."questionId" = q.id
            AND t4.type = ${Prisma.raw(`'${PreClerkshipTagType.SYSTEM}'::"PreClerkshipTagType"`)}
            AND t4.value IN (${Prisma.join(systems.map((value) => Prisma.sql`${value}`))})
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
        FROM "PreClerkshipQuestion" q
        ${staticWhere}
      `
    );

    const matchingQuestionIds = matchingQuestions.map(q => q.id);

    if (matchingQuestionIds.length === 0) {
      return NextResponse.json({
        modeCounts: { unused: 0, incorrect: 0, correct: 0, omitted: 0, marked: 0 },
        tagCounts: { weeks: {}, lectures: {}, disciplines: {}, systems: {} }
      });
    }

    // Get user-specific quiz items and responses to determine modes
    const userQuizItems = await prisma.preClerkshipQuizItem.findMany({
      where: {
        questionId: { in: matchingQuestionIds },
        PreClerkshipQuiz: { 
          userId: userId,
          yearLevel: yearLevel,
          status: "Ended" 
        }
      },
      include: {
        PreClerkshipResponse: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Build mode map: questionId -> mode
    const modeMap = new Map<string, string>();
    const markedQuestions = new Set<string>();
    
    for (const item of userQuizItems) {
      const questionId = item.questionId;
      
      if (item.marked) {
        markedQuestions.add(questionId);
      }
      
      // Get latest response for this question
      if (item.PreClerkshipResponse.length > 0) {
        const latestResponse = item.PreClerkshipResponse[0];
        if (latestResponse.isCorrect === true) {
          modeMap.set(questionId, 'correct');
        } else if (latestResponse.isCorrect === false) {
          modeMap.set(questionId, 'incorrect');
        } else {
          modeMap.set(questionId, 'omitted');
        }
      }
    }

    // Override with marked status
    for (const questionId of markedQuestions) {
      modeMap.set(questionId, 'marked');
    }

    // Count by mode
    const modeCounts = {
      unused: 0,
      incorrect: 0,
      correct: 0,
      omitted: 0,
      marked: 0,
    };

    matchingQuestionIds.forEach(questionId => {
      const mode = modeMap.get(questionId);
      
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
        modeCounts.unused += 1;
      }
    });

    // Helper to get filtered question IDs for cascade
    async function getFilteredQuestionIds(
      includeWeek: boolean, 
      includeLecture: boolean, 
      includeDiscipline: boolean, 
      includeSystem: boolean
    ) {
      const conditions: Prisma.Sql[] = [];
      
      // Always include year level
      conditions.push(Prisma.sql`q."yearLevel" = ${yearLevel}`);
      
      if (includeWeek && weekKeys.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "PreClerkshipQuestionTag" qt
            JOIN "PreClerkshipTag" t ON t.id = qt."tagId"
            WHERE qt."questionId" = q.id
              AND t.type = ${Prisma.raw(`'${PreClerkshipTagType.WEEK}'::"PreClerkshipTagType"`)}
              AND t.value IN (${Prisma.join(weekKeys.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      if (includeLecture && lectureKeys.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "PreClerkshipQuestionTag" qt2
            JOIN "PreClerkshipTag" t2 ON t2.id = qt2."tagId"
            WHERE qt2."questionId" = q.id
              AND t2.type = ${Prisma.raw(`'${PreClerkshipTagType.LECTURE}'::"PreClerkshipTagType"`)}
              AND t2.value IN (${Prisma.join(lectureKeys.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      if (includeDiscipline && disciplines.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "PreClerkshipQuestionTag" qt3
            JOIN "PreClerkshipTag" t3 ON t3.id = qt3."tagId"
            WHERE qt3."questionId" = q.id
              AND t3.type = ${Prisma.raw(`'${PreClerkshipTagType.SUBJECT}'::"PreClerkshipTagType"`)}
              AND t3.value IN (${Prisma.join(disciplines.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      if (includeSystem && systems.length) {
        conditions.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "PreClerkshipQuestionTag" qt4
            JOIN "PreClerkshipTag" t4 ON t4.id = qt4."tagId"
            WHERE qt4."questionId" = q.id
              AND t4.type = ${Prisma.raw(`'${PreClerkshipTagType.SYSTEM}'::"PreClerkshipTagType"`)}
              AND t4.value IN (${Prisma.join(systems.map((value) => Prisma.sql`${value}`))})
          )`
        );
      }
      
      const where = conditions.length 
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;
        
      const questions = await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT DISTINCT q.id FROM "PreClerkshipQuestion" q ${where}`
      );
      
      const questionIds = questions.map(q => q.id);
      
      // Apply mode filter
      if (selectedModes.length > 0) {
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
    
    // Count tags in given questions
    async function countAllTagsInQuestions(questionIds: string[]) {
      if (questionIds.length === 0) {
        return {
          weeks: {},
          lectures: {},
          disciplines: {},
          systems: {}
        };
      }
      
      const rows = await prisma.$queryRaw<Array<{ type: string; value: string; c: number }>>(
        Prisma.sql`
          SELECT 
            t.type::text as type,
            t.value,
            COUNT(DISTINCT q.id)::int AS c
          FROM "PreClerkshipQuestion" q
          JOIN "PreClerkshipQuestionTag" qt ON qt."questionId" = q.id
          JOIN "PreClerkshipTag" t ON t.id = qt."tagId"
          WHERE q.id IN (${Prisma.join(questionIds.map(id => Prisma.sql`${id}`))})
            AND t.type IN (
              ${Prisma.raw(`'${PreClerkshipTagType.WEEK}'::"PreClerkshipTagType"`)},
              ${Prisma.raw(`'${PreClerkshipTagType.LECTURE}'::"PreClerkshipTagType"`)},
              ${Prisma.raw(`'${PreClerkshipTagType.SUBJECT}'::"PreClerkshipTagType"`)},
              ${Prisma.raw(`'${PreClerkshipTagType.SYSTEM}'::"PreClerkshipTagType"`)}
            )
          GROUP BY t.type, t.value
        `
      );
      
      const result = {
        weeks: {} as Record<string, number>,
        lectures: {} as Record<string, number>,
        disciplines: {} as Record<string, number>,
        systems: {} as Record<string, number>
      };
      
      for (const row of rows) {
        if (row.type === PreClerkshipTagType.WEEK) {
          result.weeks[row.value] = row.c;
        } else if (row.type === PreClerkshipTagType.LECTURE) {
          result.lectures[row.value] = row.c;
        } else if (row.type === PreClerkshipTagType.SUBJECT) {
          result.disciplines[row.value] = row.c;
        } else if (row.type === PreClerkshipTagType.SYSTEM) {
          result.systems[row.value] = row.c;
        }
      }
      
      return result;
    }

    // Calculate counts for cascade: mode → system → discipline → week → lecture
    const systemQuestions = await getFilteredQuestionIds(false, false, false, false);
    const systemCounts = await countAllTagsInQuestions(systemQuestions);
    
    const disciplineQuestions = await getFilteredQuestionIds(false, false, false, true);
    const disciplineCounts = await countAllTagsInQuestions(disciplineQuestions);
    
    const weekQuestions = await getFilteredQuestionIds(false, false, true, true);
    const weekCounts = await countAllTagsInQuestions(weekQuestions);
    
    const lectureQuestions = await getFilteredQuestionIds(false, false, true, true); // Week counts include lectures
    const lectureCounts = await countAllTagsInQuestions(lectureQuestions);

    return NextResponse.json({
      modeCounts,
      tagCounts: { 
        systems: systemCounts.systems, 
        disciplines: disciplineCounts.disciplines, 
        weeks: weekCounts.weeks, 
        lectures: lectureCounts.lectures 
      }
    });
  } catch (error) {
    console.error("Error calculating filtered counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

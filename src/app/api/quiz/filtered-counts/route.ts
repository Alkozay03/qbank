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

    const userId = session.user.id;
    const body = (await req.json().catch(() => ({}))) as Payload;

    const year = typeof body.year === "string" ? body.year : "Y4"; // Default to Y4 for backwards compatibility

    // Expand tag values
    const rotValues = expandTagValues(TagType.ROTATION, body.rotationKeys ?? []);
    const resValues = expandTagValues(TagType.RESOURCE, body.resourceValues ?? []);
    const discValues = expandTagValues(TagType.SUBJECT, body.disciplineValues ?? []);
    const sysValues = expandTagValues(TagType.SYSTEM, body.systemValues ?? []);
    const selectedModes = Array.isArray(body.selectedModes)
      ? body.selectedModes.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];

    // Build static filters (tag + year). OR within each category, AND across categories.
    const baseConditions: Prisma.Sql[] = [];

    if (rotValues.length) {
      baseConditions.push(
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
      baseConditions.push(
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
      baseConditions.push(
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
      baseConditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qy
          JOIN "Tag" ty ON ty.id = qy."tagId"
          WHERE qy."questionId" = q.id
            AND ty.type = ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
            AND ty.value IN (${Prisma.join(sysValues.map((value) => Prisma.sql`${value}`))})
        )`
      );
    }

    // Always scope to year
    baseConditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "QuestionOccurrence" qo
        WHERE qo."questionId" = q.id
          AND qo.year = ${year}
      )`
    );

    const baseWhere = baseConditions.length
      ? Prisma.sql`WHERE ${Prisma.join(baseConditions, ' AND ')}`
      : Prisma.empty;

    const modeFilter = selectedModes.length
      ? Prisma.sql`WHERE mode_lookup.mode IN (${Prisma.join(selectedModes.map((value) => Prisma.sql`${value}`))})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{ section: string; key: string; c: number }>>(
      Prisma.sql`
        WITH base AS (
          SELECT q.id
          FROM "Question" q
          ${baseWhere}
        ),
        mode_lookup AS (
          SELECT b.id,
                 COALESCE(uqm.mode, 'unused') AS mode
          FROM base b
          LEFT JOIN "UserQuestionMode" uqm
            ON uqm."questionId" = b.id
           AND uqm."userId" = ${userId}
        ),
        mode_counts AS (
          SELECT mode AS key, COUNT(*)::int AS c
          FROM mode_lookup
          GROUP BY mode
        ),
        filtered AS (
          SELECT id, mode
          FROM mode_lookup
          ${modeFilter}
        ),
        tag_counts AS (
          SELECT t.type::text AS section, t.value AS key, COUNT(DISTINCT f.id)::int AS c
          FROM filtered f
          JOIN "QuestionTag" qt ON qt."questionId" = f.id
          JOIN "Tag" t ON t.id = qt."tagId"
          WHERE t.type IN (
            ${Prisma.raw(`'${TagType.ROTATION}'::"TagType"`)},
            ${Prisma.raw(`'${TagType.RESOURCE}'::"TagType"`)},
            ${Prisma.raw(`'${TagType.SUBJECT}'::"TagType"`)},
            ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
          )
          GROUP BY t.type, t.value
        )
        SELECT 'mode' AS section, key, c FROM mode_counts
        UNION ALL
        SELECT section, key, c FROM tag_counts;
      `
    );

    const modeCounts = {
      unused: 0,
      incorrect: 0,
      correct: 0,
      omitted: 0,
      marked: 0,
    };

    const tagCounts = {
      rotations: {} as Record<string, number>,
      resources: {} as Record<string, number>,
      disciplines: {} as Record<string, number>,
      systems: {} as Record<string, number>,
    };

    for (const row of rows) {
      if (row.section === "mode") {
        if (row.key in modeCounts) {
          modeCounts[row.key as keyof typeof modeCounts] = row.c;
        }
        continue;
      }

      if (row.section === TagType.ROTATION) {
        tagCounts.rotations[row.key] = row.c;
      } else if (row.section === TagType.RESOURCE) {
        tagCounts.resources[row.key] = row.c;
      } else if (row.section === TagType.SUBJECT) {
        tagCounts.disciplines[row.key] = row.c;
      } else if (row.section === TagType.SYSTEM) {
        tagCounts.systems[row.key] = row.c;
      }
    }

    return NextResponse.json({
      modeCounts,
      tagCounts,
    });
  } catch (error) {
    console.error("Error calculating filtered counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

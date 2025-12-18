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

    // Optional filters for cascade (applied to downstream scopes only)
    const rotationFilter = rotValues.length
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr
          JOIN "Tag" tr ON tr.id = qr."tagId"
          WHERE qr."questionId" = scope.id
            AND tr.type = ${Prisma.raw(`'${TagType.ROTATION}'::"TagType"`)}
            AND tr.value IN (${Prisma.join(rotValues.map((value) => Prisma.sql`${value}`))})
        )`
      : null;

    const resourceFilter = resValues.length
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr
          JOIN "Tag" tr ON tr.id = qr."tagId"
          WHERE qr."questionId" = scope.id
            AND tr.type = ${Prisma.raw(`'${TagType.RESOURCE}'::"TagType"`)}
            AND tr.value IN (${Prisma.join(resValues.map((value) => Prisma.sql`${value}`))})
        )`
      : null;

    const disciplineFilter = discValues.length
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr
          JOIN "Tag" tr ON tr.id = qr."tagId"
          WHERE qr."questionId" = scope.id
            AND tr.type = ${Prisma.raw(`'${TagType.SUBJECT}'::"TagType"`)}
            AND tr.value IN (${Prisma.join(discValues.map((value) => Prisma.sql`${value}`))})
        )`
      : null;

    const systemFilter = sysValues.length
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "QuestionTag" qr
          JOIN "Tag" tr ON tr.id = qr."tagId"
          WHERE qr."questionId" = scope.id
            AND tr.type = ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
            AND tr.value IN (${Prisma.join(sysValues.map((value) => Prisma.sql`${value}`))})
        )`
      : null;

    const modeFilter = selectedModes.length
      ? Prisma.sql`WHERE mode_lookup.mode IN (${Prisma.join(selectedModes.map((value) => Prisma.sql`${value}`))})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{ section: string; key: string; c: number }>>(
      Prisma.sql`
        WITH base AS (
          -- Year-scoped base set
          SELECT q.id
          FROM "Question" q
          WHERE EXISTS (
            SELECT 1 FROM "QuestionOccurrence" qo
            WHERE qo."questionId" = q.id
              AND qo.year = ${year}
          )
        ),
        mode_lookup AS (
          -- Attach per-user mode; missing rows -> unused
          SELECT b.id,
                 COALESCE(uqm.mode, 'unused') AS mode
          FROM base b
          LEFT JOIN "UserQuestionMode" uqm
            ON uqm."questionId" = b.id
           AND uqm."userId" = ${userId}
        ),
        mode_counts AS (
          -- Mode counts do NOT depend on downstream selections
          SELECT mode AS key, COUNT(*)::int AS c
          FROM mode_lookup
          GROUP BY mode
        ),
        mode_filtered AS (
          -- Apply mode selection (if any) once, reuse downstream
          SELECT * FROM mode_lookup
          ${modeFilter}
        ),
        rotation_scope AS (
          -- Cascade level: mode only (no rotation filter)
          SELECT id FROM mode_filtered
        ),
        resource_scope AS (
          -- Cascade level: mode + rotation selection
          SELECT scope.id
          FROM rotation_scope scope
          WHERE 1=1
          ${rotationFilter ? Prisma.sql`AND ${rotationFilter}` : Prisma.empty}
        ),
        discipline_scope AS (
          -- Cascade level: mode + rotation + resource selection
          SELECT scope.id
          FROM resource_scope scope
          WHERE 1=1
          ${resourceFilter ? Prisma.sql`AND ${resourceFilter}` : Prisma.empty}
        ),
        system_scope AS (
          -- Cascade level: mode + rotation + resource + discipline selection
          SELECT scope.id
          FROM discipline_scope scope
          WHERE 1=1
          ${disciplineFilter ? Prisma.sql`AND ${disciplineFilter}` : Prisma.empty}
        ),
        rotation_counts AS (
          SELECT 'rotation'::text AS section, t.value AS key, COUNT(DISTINCT r.id)::int AS c
          FROM rotation_scope r
          JOIN "QuestionTag" qt ON qt."questionId" = r.id
          JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${TagType.ROTATION}'::"TagType"`)}
          GROUP BY t.value
        ),
        resource_counts AS (
          SELECT 'resource'::text AS section, t.value AS key, COUNT(DISTINCT r.id)::int AS c
          FROM resource_scope r
          JOIN "QuestionTag" qt ON qt."questionId" = r.id
          JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${TagType.RESOURCE}'::"TagType"`)}
          GROUP BY t.value
        ),
        discipline_counts AS (
          SELECT 'discipline'::text AS section, t.value AS key, COUNT(DISTINCT r.id)::int AS c
          FROM discipline_scope r
          JOIN "QuestionTag" qt ON qt."questionId" = r.id
          JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${TagType.SUBJECT}'::"TagType"`)}
          GROUP BY t.value
        ),
        system_counts AS (
          SELECT 'system'::text AS section, t.value AS key, COUNT(DISTINCT r.id)::int AS c
          FROM system_scope r
          JOIN "QuestionTag" qt ON qt."questionId" = r.id
          JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
          GROUP BY t.value
        )
        SELECT 'mode' AS section, key, c FROM mode_counts
        UNION ALL
        SELECT section, key, c FROM rotation_counts
        UNION ALL
        SELECT section, key, c FROM resource_counts
        UNION ALL
        SELECT section, key, c FROM discipline_counts
        UNION ALL
        SELECT section, key, c FROM system_counts;
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

      if (row.section === "rotation") {
        tagCounts.rotations[row.key] = row.c;
      } else if (row.section === "resource") {
        tagCounts.resources[row.key] = row.c;
      } else if (row.section === "discipline") {
        tagCounts.disciplines[row.key] = row.c;
      } else if (row.section === "system") {
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

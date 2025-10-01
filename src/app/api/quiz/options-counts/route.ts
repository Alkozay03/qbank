// src/app/api/quiz/options-counts/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { Prisma, TagType } from "@prisma/client";
import { canonicalizeTagValue, expandTagValues } from "@/lib/tags/server";

type Payload = {
  rotationKeys?: string[];
  resourceValues?: string[];
  disciplineValues?: string[];
  systemValues?: string[];
};

// (no helpers)

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Payload;

  const rotValues = expandTagValues(TagType.ROTATION, body.rotationKeys ?? []);
  const resValues = expandTagValues(TagType.RESOURCE, body.resourceValues ?? []);
  const discValues = expandTagValues(TagType.SUBJECT, body.disciplineValues ?? []);
  const sysValues = expandTagValues(TagType.SYSTEM, body.systemValues ?? []);

  // Build common WHERE fragments using Tag/QuestionTag filters
  const conds: Prisma.Sql[] = [];
  if (rotValues.length) {
    conds.push(
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
    conds.push(
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
    conds.push(
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
    conds.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "QuestionTag" qy
        JOIN "Tag" ty ON ty.id = qy."tagId"
        WHERE qy."questionId" = q.id
          AND ty.type = ${Prisma.raw(`'${TagType.SYSTEM}'::"TagType"`)}
          AND ty.value IN (${Prisma.join(sysValues.map((value) => Prisma.sql`${value}`))})
      )`
    );
  }

  const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;

  async function groupBy(tagType: TagType) {
    const rows = await prisma.$queryRaw<Array<{ value: string; c: number }>>(
      Prisma.sql`
        SELECT t.value, COUNT(DISTINCT q.id)::int AS c
        FROM "Question" q
  JOIN "QuestionTag" qt ON qt."questionId" = q.id
  JOIN "Tag" t ON t.id = qt."tagId" AND t.type = ${Prisma.raw(`'${tagType}'::"TagType"`)}
        ${where}
        GROUP BY t.value
      `
    );
    const map: Record<string, number> = {};
    for (const r of rows) {
      const canonical = canonicalizeTagValue(tagType, r.value);
      const key = canonical || r.value;
      map[key] = (map[key] ?? 0) + r.c;
    }
    return map;
  }

  const rotations = await groupBy(TagType.ROTATION);
  const resources = await groupBy(TagType.RESOURCE);
  const disciplines = await groupBy(TagType.SUBJECT);
  const systems = await groupBy(TagType.SYSTEM);

  return NextResponse.json({ rotations, resources, disciplines, systems, topics: {} });
} catch (error) {
  console.error("Database connection error in options-counts:", error);
  
  // Return empty counts if database is unavailable
  if (error instanceof Error && (
    error.message.includes("Can't reach database") ||
    error.message.includes('connection') ||
    ('code' in error && error.code === 'P1001')
  )) {
    return NextResponse.json({ 
      rotations: {}, 
      resources: {}, 
      disciplines: {}, 
      systems: {}, 
      topics: {} 
    });
  }
  
  return NextResponse.json(
    { error: "Failed to fetch tag counts" },
    { status: 500 }
  );
}
}

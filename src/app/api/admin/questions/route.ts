// src/app/api/admin/questions/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { generateShortNumericId } from "@/lib/ids";
import { TagType } from "@prisma/client";

/**
 * GET /api/admin/questions?customId=123456
 * Returns a question with answers, tags, and resource refs.
 */
export async function GET(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);

  const { searchParams } = new URL(req.url);
  const customIdParam = searchParams.get("customId");
  const customId = customIdParam ? Number(customIdParam) : NaN;
  if (!Number.isFinite(customId)) {
    return NextResponse.json({ error: "customId required" }, { status: 400 });
  }

  const q = await prisma.question.findUnique({
    where: { customId },
    include: {
      answers: true,
      questionTags: { include: { tag: true } },
    },
  });

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const refs = await prisma.tag.findMany({
    where: { type: TagType.RESOURCE, questions: { some: { questionId: q.id } } },
  });

  return NextResponse.json({
    customId: q.customId,
    text: q.text,
    explanation: q.explanation,
    objective: q.objective,
    answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
    refs: refs.map((r) => ({ url: r.value })),
    tags: q.questionTags.map((t) => ({ type: t.tag.type, value: t.tag.value })),
  });
}

/**
 * POST /api/admin/questions
 * Body: { text, answers: [{text,isCorrect}], explanation?, objective?, refs?:[{url}], tags?:[{type,value}] }
 * Creates a question with a unique numeric customId and attaches tags/refs.
 */
export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);

  const body = (await req.json()) as {
    text: string;
    answers: Array<{ text: string; isCorrect: boolean }>;
    explanation?: string | null;
    objective?: string | null;
    refs?: Array<{ url: string }>;
    tags?: Array<{ type: keyof typeof TagType; value: string }>;
  };

  if (!body?.text || !Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: "text and answers[] are required" }, { status: 400 });
  }

  // generate a unique short id, retry a few times if collision
  let customId = generateShortNumericId();
  for (let i = 0; i < 4; i++) {
    const exists = await prisma.question.findUnique({ where: { customId } });
    if (!exists) break;
    customId = generateShortNumericId();
  }

  const q = await prisma.question.create({
    data: {
      customId,
      text: body.text,
      explanation: body.explanation ?? null,
      objective: body.objective ?? null,
      answers: {
        create: body.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
      },
    },
  });

  // attach tags
  if (Array.isArray(body.tags) && body.tags.length) {
    for (const t of body.tags) {
      const type = TagType[t.type] ?? TagType.TOPIC; // fallback, but ideally validated client-side
      const tag = await prisma.tag.upsert({
        where: { type_value: { type, value: t.value } },
        update: {},
        create: { type, value: t.value },
      });
      await prisma.questionTag.create({ data: { questionId: q.id, tagId: tag.id } });
    }
  }

  // attach resource refs as Tag(type=RESOURCE, value=url)
  if (Array.isArray(body.refs) && body.refs.length) {
    for (const r of body.refs) {
      const tag = await prisma.tag.upsert({
        where: { type_value: { type: TagType.RESOURCE, value: r.url } },
        update: {},
        create: { type: TagType.RESOURCE, value: r.url },
      });
      await prisma.questionTag.create({ data: { questionId: q.id, tagId: tag.id } });
    }
  }

  return NextResponse.json({ ok: true, customId: q.customId });
}

/**
 * PUT /api/admin/questions
 * Body: { customId, text, answers:[{text,isCorrect}], explanation?, objective?, refs?, tags? }
 * Replaces answers and tags/refs.
 */
export async function PUT(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);

  const body = (await req.json()) as {
    customId: number;
    text: string;
    answers: Array<{ text: string; isCorrect: boolean }>;
    explanation?: string | null;
    objective?: string | null;
    refs?: Array<{ url: string }>;
    tags?: Array<{ type: keyof typeof TagType; value: string }>;
  };

  if (!Number.isFinite(body?.customId)) {
    return NextResponse.json({ error: "customId required" }, { status: 400 });
  }

  const existing = await prisma.question.findUnique({ where: { customId: body.customId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.question.update({
    where: { id: existing.id },
    data: {
      text: body.text,
      explanation: body.explanation ?? null,
      objective: body.objective ?? null,
    },
  });

  // Replace answers
  await prisma.answer.deleteMany({ where: { questionId: existing.id } });
  if (Array.isArray(body.answers) && body.answers.length) {
    await prisma.answer.createMany({
      data: body.answers.map((a) => ({
        questionId: existing.id,
        text: a.text,
        isCorrect: a.isCorrect,
      })),
    });
  }

  // Replace tags & refs
  await prisma.questionTag.deleteMany({ where: { questionId: existing.id } });

  if (Array.isArray(body.tags) && body.tags.length) {
    for (const t of body.tags) {
      const type = TagType[t.type] ?? TagType.TOPIC;
      const tag = await prisma.tag.upsert({
        where: { type_value: { type, value: t.value } },
        update: {},
        create: { type, value: t.value },
      });
      await prisma.questionTag.create({ data: { questionId: existing.id, tagId: tag.id } });
    }
  }

  if (Array.isArray(body.refs) && body.refs.length) {
    for (const r of body.refs) {
      const tag = await prisma.tag.upsert({
        where: { type_value: { type: TagType.RESOURCE, value: r.url } },
        update: {},
        create: { type: TagType.RESOURCE, value: r.url },
      });
      await prisma.questionTag.create({ data: { questionId: existing.id, tagId: tag.id } });
    }
  }

  return NextResponse.json({ ok: true });
}

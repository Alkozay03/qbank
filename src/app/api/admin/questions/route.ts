// src/app/api/admin/questions/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { generateShortNumericId } from "@/lib/ids";
import { TagType } from "@prisma/client";
import {
  canonicalizeQuestionMode,
  deriveModeFromHistory,
  getCurrentQuestionMode,
  setQuestionMode,
} from "@/lib/quiz/questionMode";

function normalizeReferenceInput(
  referenceText?: string | null,
  referenceList?: Array<{ url: string }>
): string | null {
  const values = new Set<string>();

  if (typeof referenceText === "string") {
    referenceText
      .replace(/\r/g, "")
      .split(/\n+|,|;|\u2022|\u2023|\u25E6/g)
      .forEach((piece) => {
        const trimmed = piece.trim();
        if (trimmed) values.add(trimmed);
      });
  }

  if (Array.isArray(referenceList)) {
    referenceList.forEach((entry) => {
      const trimmed = typeof entry?.url === "string" ? entry.url.trim() : "";
      if (trimmed) values.add(trimmed);
    });
  }

  if (!values.size) return null;
  return Array.from(values).join("\n");
}

/**
 * GET /api/admin/questions?customId=123456
 * Returns a question with answers, tags, and resource refs.
 */
export async function GET(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

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

  const referencesList = (q.references ?? "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  return NextResponse.json({
    customId: q.customId,
    text: q.text,
    explanation: q.explanation,
    objective: q.objective,
    references: q.references ?? "",
    refs: referencesList.map((url) => ({ url })),
    answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
    tags: q.questionTags.map((t) => ({ type: t.tag.type, value: t.tag.value })),
  });
}

/**
 * POST /api/admin/questions
 * Body: { text, answers: [{text,isCorrect}], explanation?, objective?, refs?:[{url}], tags?:[{type,value}] }
 * Creates a question with a unique numeric customId and attaches tags/refs.
 */
export async function POST(req: Request) {
  try {
    console.error("🔵 [QUESTIONS POST] Request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [QUESTIONS POST] Permission granted:", userInfo);

    const body = (await req.json()) as {
      text: string;
      answers: Array<{ text: string; isCorrect: boolean }>;
      explanation?: string | null;
      objective?: string | null;
      refs?: Array<{ url: string }>;
      references?: string | null;
      tags?: Array<{ type: keyof typeof TagType; value: string }>;
    };

    console.error("🔵 [QUESTIONS POST] Request body:", {
      hasText: !!body?.text,
      textLength: body?.text?.length,
      answersCount: body?.answers?.length,
      hasExplanation: !!body?.explanation,
      tagsCount: body?.tags?.length
    });

    if (!body?.text || !Array.isArray(body.answers) || body.answers.length === 0) {
      console.error("🔴 [QUESTIONS POST] Invalid request body");
      return NextResponse.json({ error: "text and answers[] are required" }, { status: 400 });
    }

    // generate a unique short id, retry a few times if collision
    console.error("🔵 [QUESTIONS POST] Generating unique customId...");
    let customId = generateShortNumericId();
    for (let i = 0; i < 4; i++) {
      const exists = await prisma.question.findUnique({ where: { customId } });
      if (!exists) break;
      customId = generateShortNumericId();
    }
    console.error("🔵 [QUESTIONS POST] Generated customId:", customId);

    console.error("🔵 [QUESTIONS POST] Creating question in database...");
    const q = await prisma.question.create({
      data: {
        customId,
        text: body.text,
        explanation: body.explanation ?? null,
        objective: body.objective ?? null,
        references: normalizeReferenceInput(body.references, body.refs),
        answers: {
          create: body.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
        },
      },
    });
    console.error("🟢 [QUESTIONS POST] Question created:", { id: q.id, customId: q.customId });

    // attach tags
    if (Array.isArray(body.tags) && body.tags.length) {
      console.error("🔵 [QUESTIONS POST] Attaching", body.tags.length, "tags...");
      for (const t of body.tags) {
        const type = TagType[t.type] ?? TagType.TOPIC; // fallback, but ideally validated client-side
        const tag = await prisma.tag.upsert({
          where: { type_value: { type, value: t.value } },
          update: {},
          create: { type, value: t.value },
        });
        await prisma.questionTag.create({ data: { questionId: q.id, tagId: tag.id } });
      }
      console.error("🟢 [QUESTIONS POST] Tags attached successfully");
    }

    // Ensure new questions always start as unused
    console.error("🔵 [QUESTIONS POST] Setting question mode to 'unused'...");
    await setQuestionMode(q.id, "unused");

    // Check for similar questions in the background (don't block response)
    // Determine year context from the request URL or yearCaptured field
    const urlPath = new URL(req.url).pathname;
    const yearContext: "year4" | "year5" = urlPath.includes("year5") || q.yearCaptured === "5" ? "year5" : "year4";
    
    console.error("🔵 [QUESTIONS POST] Starting background similarity check for", yearContext);
    // Run similarity check asynchronously (don't await)
    import("@/lib/similar-questions")
      .then(({ checkForSimilarQuestions }) => {
        return checkForSimilarQuestions(
          { id: q.id, text: q.text ?? "", customId: q.customId },
          yearContext
        );
      })
      .catch((error) => {
        console.error("Failed to check for similar questions:", error);
      });

    console.error("🟢 [QUESTIONS POST] Success! Returning response");
    return NextResponse.json({ ok: true, customId: q.customId });
  } catch (error) {
    console.error("🔴 [QUESTIONS POST] Error:", error);
    
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/questions
 * Body: { customId, text, answers:[{text,isCorrect}], explanation?, objective?, refs?, tags? }
 * Replaces answers and tags/refs.
 */
export async function PUT(req: Request) {
  try {
    console.error("🔵 [QUESTIONS PUT] Request received");
    
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [QUESTIONS PUT] Permission granted:", userInfo);

    const body = (await req.json()) as {
      customId: number;
      text: string;
      answers: Array<{ text: string; isCorrect: boolean }>;
      explanation?: string | null;
      objective?: string | null;
      refs?: Array<{ url: string }>;
      references?: string | null;
      tags?: Array<{ type: keyof typeof TagType; value: string }>;
    };

    console.error("🔵 [QUESTIONS PUT] Request body:", {
      customId: body?.customId,
      hasText: !!body?.text,
      answersCount: body?.answers?.length,
      tagsCount: body?.tags?.length
    });

    if (!Number.isFinite(body?.customId)) {
      console.error("🔴 [QUESTIONS PUT] Invalid customId");
      return NextResponse.json({ error: "customId required" }, { status: 400 });
    }

    console.error("🔵 [QUESTIONS PUT] Finding existing question:", body.customId);
    const existing = await prisma.question.findUnique({ where: { customId: body.customId } });
    if (!existing) {
      console.error("🔴 [QUESTIONS PUT] Question not found:", body.customId);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("🟢 [QUESTIONS PUT] Found existing question:", existing.id);

  const previousMode = await getCurrentQuestionMode(existing.id);

  await prisma.question.update({
    where: { id: existing.id },
    data: {
      text: body.text,
      explanation: body.explanation ?? null,
      objective: body.objective ?? null,
      references: normalizeReferenceInput(body.references, body.refs),
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

  let providedMode: string | null = null;

  if (Array.isArray(body.tags) && body.tags.length) {
    for (const t of body.tags) {
      const type = TagType[t.type] ?? TagType.TOPIC;
      if (type === TagType.MODE) {
        providedMode = typeof t.value === "string" ? t.value : null;
        continue;
      }
      const tag = await prisma.tag.upsert({
        where: { type_value: { type, value: t.value } },
        update: {},
        create: { type, value: t.value },
      });
      await prisma.questionTag.create({ data: { questionId: existing.id, tagId: tag.id } });
    }
  }

    const normalizedMode = canonicalizeQuestionMode(providedMode);
    if (normalizedMode) {
      await setQuestionMode(existing.id, normalizedMode);
    } else if (previousMode) {
      await setQuestionMode(existing.id, previousMode);
    } else {
      const derived = await deriveModeFromHistory(existing.id);
      await setQuestionMode(existing.id, derived);
    }

    console.error("🟢 [QUESTIONS PUT] Success! Question updated");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔴 [QUESTIONS PUT] Error:", error);
    
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status: number; message: string };
      return NextResponse.json(
        { error: httpError.message || "Permission denied" },
        { status: httpError.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

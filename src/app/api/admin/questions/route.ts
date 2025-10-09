// src/app/api/admin/questions/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { generateShortNumericId } from "@/lib/ids";
import { TagType, Prisma } from "@prisma/client";
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

function resolveYearContext(raw?: string | null): "4" | "5" | "" {
  if (typeof raw !== "string") return "";
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "5" || normalized === "y5" || normalized === "year5") return "5";
  if (normalized === "4" || normalized === "y4" || normalized === "year4") return "4";
  return "";
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
      questionYear?: string | null;
    };

    console.error("🔵 [QUESTIONS POST] Request body:", {
      hasText: !!body?.text,
      textLength: body?.text?.length,
      answersCount: body?.answers?.length,
      hasExplanation: !!body?.explanation,
      tagsCount: body?.tags?.length,
      questionYear: body?.questionYear ?? null,
    });

    if (!body?.text || !Array.isArray(body.answers) || body.answers.length === 0) {
      console.error("🔴 [QUESTIONS POST] Invalid request body");
      return NextResponse.json({ error: "text and answers[] are required" }, { status: 400 });
    }

    const referer = req.headers.get("referer") ?? "";
    const refererLower = referer.toLowerCase();
    const normalizedBodyYear = resolveYearContext(body?.questionYear);
    const yearContext: "year4" | "year5" =
      refererLower.includes("/year5") || refererLower.includes("year5") || normalizedBodyYear === "5"
        ? "year5"
        : "year4";
    const storedYear = normalizedBodyYear || (yearContext === "year5" ? "5" : "4");

    console.error("🔵 [QUESTIONS POST] Derived year context:", {
      referer,
      bodyYear: body?.questionYear ?? null,
      resolvedContext: yearContext,
      storedYear,
    });

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
        yearCaptured: storedYear,
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

    // NOTE: Similarity checking is now manual-only via the Similar Questions page
    // It does NOT run automatically on question creation
    console.error("� [QUESTIONS POST] Similarity check skipped (manual-only feature)");

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
      questionYear?: string | null;
    };

    console.error("🔵 [QUESTIONS PUT] Request body:", {
      customId: body?.customId,
      hasText: !!body?.text,
      answersCount: body?.answers?.length,
      tagsCount: body?.tags?.length,
      questionYear: body?.questionYear ?? null,
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

    const referer = req.headers.get("referer") ?? "";
    const refererLower = referer.toLowerCase();
    const normalizedBodyYear = resolveYearContext(body?.questionYear);
    const existingYear = resolveYearContext(existing.yearCaptured ?? null);
    const derivedContext: "year4" | "year5" =
      refererLower.includes("/year5") || refererLower.includes("year5") || normalizedBodyYear === "5" || existingYear === "5"
        ? "year5"
        : "year4";
    const storedYear = normalizedBodyYear || existingYear || (derivedContext === "year5" ? "5" : "4");
    console.error("🔵 [QUESTIONS PUT] Derived year context:", {
      referer,
      normalizedBodyYear,
      existingYear,
      storedYear,
      derivedContext,
    });

    const previousMode = await getCurrentQuestionMode(existing.id);

    const updateData: Prisma.QuestionUpdateInput = {
      text: body.text,
      explanation: body.explanation ?? null,
      objective: body.objective ?? null,
      references: normalizeReferenceInput(body.references, body.refs),
    };

    if (storedYear) {
      updateData.yearCaptured = storedYear;
    }

    await prisma.question.update({
      where: { id: existing.id },
      data: updateData,
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

    // NOTE: Similarity checking is now manual-only via the Similar Questions page
    // It does NOT run automatically on question updates
    console.error("� [QUESTIONS PUT] Similarity check skipped (manual-only feature)");

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

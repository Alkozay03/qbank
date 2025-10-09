// src/app/api/admin/questions/bulk/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { generateShortNumericId } from "@/lib/ids";
import { TagType } from "@prisma/client";
import { CATEGORY_TO_TAG_TYPE, canonicalizeTagValue } from "@/lib/tags/server";
import { canonicalizeQuestionMode, setQuestionMode } from "@/lib/quiz/questionMode";
import type { TagCategory } from "@/lib/tags/catalog";

type AnswerInput = { text: unknown; isCorrect: unknown };
type TagInput = { type: string; value: unknown };

function normalizeAnswers(input: unknown): Array<{ text: string; isCorrect: boolean }> {
  if (!Array.isArray(input)) return [];
  return input.map((a): { text: string; isCorrect: boolean } => ({
    text: String((a as AnswerInput).text ?? ""),
    isCorrect: Boolean((a as AnswerInput).isCorrect),
  }));
}

function normalizeReferences(input: unknown): string | null {
  const values = new Set<string>();

  if (typeof input === "string") {
    input
      .replace(/\r/g, "")
      .split(/\n+|,|;|\u2022|\u2023|\u25E6/g)
      .forEach((piece) => {
        const trimmed = piece.trim();
        if (trimmed) values.add(trimmed);
      });
  }

  if (Array.isArray(input)) {
    input.forEach((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) values.add(trimmed);
      } else if (entry && typeof entry === "object") {
        const maybeUrl = (entry as { url?: unknown }).url;
        if (typeof maybeUrl === "string") {
          const trimmed = maybeUrl.trim();
          if (trimmed) values.add(trimmed);
        }
      }
    });
  }

  if (!values.size) return null;
  return Array.from(values).join("\n");
}

function normalizeTags(input: unknown): Array<{ type: TagType; value: string }> | undefined {
  if (!Array.isArray(input)) return undefined;
  const arr = input as TagInput[];
  const seen = new Set<string>();
  const results: Array<{ type: TagType; value: string }> = [];

  const resolveType = (value: string): TagType | undefined => {
    const upper = value.toUpperCase();
    if (upper in TagType) {
      return TagType[upper as keyof typeof TagType];
    }
    const lower = value.toLowerCase() as TagCategory;
    return CATEGORY_TO_TAG_TYPE[lower];
  };

  for (const entry of arr) {
    if (!entry || typeof entry.type !== "string" || entry.value == null) continue;
    const tagType = resolveType(entry.type);
    if (!tagType) continue;
    const canonical = canonicalizeTagValue(tagType, String(entry.value));
    if (!canonical) continue;
    const key = `${tagType}:${canonical}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ type: tagType, value: canonical });
  }

  return results.length ? results : undefined;
}

function normalizeTextForDup(t: string): string {
  const noImgs = t.replace(/!\[[^\]]*\]\([^\)]+\)/g, " ");
  const noHtml = noImgs.replace(/<[^>]+>/g, " ");
  const onlyText = noHtml.replace(/[\t\f\v]+/g, " ").replace(/\r\n?/g, "\n");
  const compact = onlyText.replace(/\s+/g, " ").trim().toLowerCase();
  return compact;
}

function jaccard(aWords: string[], bWords: string[]): number {
  const a = new Set(aWords);
  const b = new Set(bWords);
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const uni = a.size + b.size - inter || 1;
  return inter / uni;
}

async function findPossibleDuplicate(text: string) {
  const norm = normalizeTextForDup(text);
  if (!norm) return null;
  const snippet = norm.slice(0, Math.max(60, Math.min(200, Math.floor(norm.length * 0.4))));
  const candidates = await prisma.question.findMany({
    where: { text: { contains: snippet, mode: "insensitive" } },
    select: { id: true, customId: true, text: true },
    take: 20,
  });
  const aWords = norm.split(/[^a-z0-9]+/g).filter(Boolean);
  for (const c of candidates) {
    const cNorm = normalizeTextForDup(String(c.text || ""));
    if (!cNorm) continue;
    if (cNorm === norm) return c;
    const bWords = cNorm.split(/[^a-z0-9]+/g).filter(Boolean);
    const sim = jaccard(aWords, bWords);
    if (sim >= 0.9) return c;
  }
  return null;
}

export async function POST(req: Request) {
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
  
  // Determine year context from request URL or referer header
  const referer = req.headers.get("referer") || "";
  const yearContext: "year4" | "year5" = referer.includes("year5") ? "year5" : "year4";
  console.warn(`🔵 [BULK] Processing bulk questions for ${yearContext}`);
  
  try {
    const body = (await req.json()) as unknown as {
      questions?: Array<{
        text?: unknown;
        explanation?: unknown;
        objective?: unknown;
        answers?: unknown;
        refs?: unknown;
        tags?: unknown;
      }>;
    };

    const items = Array.isArray(body?.questions) ? body!.questions : [];
    if (!items.length) return NextResponse.json({ error: "questions[] required" }, { status: 400 });

    const results: Array<{ index: number; status: "created" | "duplicate" | "error"; customId?: number; error?: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i] ?? {};
      try {
        const text = String(it.text ?? "").trim();
        const explanation = (it.explanation as string | null | undefined) ?? null;
    const answers = normalizeAnswers(it.answers);
    const references = normalizeReferences(it.refs);
        const tags = normalizeTags(it.tags);

        if (!text) { results.push({ index: i, status: "error", error: "text required" }); continue; }
        if (!answers.length || answers.every((a) => !a.text.trim())) { results.push({ index: i, status: "error", error: "answers required" }); continue; }

        const dup = await findPossibleDuplicate(text);
        if (dup) { results.push({ index: i, status: "duplicate", customId: dup.customId ?? undefined }); continue; }

    const customId = await generateShortNumericId();
    const q = await prisma.question.create({ data: { customId, text, explanation, references } });

        if (answers.length) {
          await prisma.answer.createMany({ data: answers.map((a) => ({ questionId: q.id, text: a.text, isCorrect: a.isCorrect })) });
        }

        // Create tags and attach
        const tagAssociations: Array<{ questionId: string; tagId: string }> = [];
        let providedMode: string | null = null;
        if (Array.isArray(tags) && tags.length) {
          for (const t of tags) {
            if (t.type === TagType.MODE) {
              providedMode = t.value;
              continue;
            }
            const type = t.type;
            const tag = await prisma.tag.upsert({
              where: { type_value: { type, value: t.value } },
              update: {},
              create: { type, value: t.value },
            });
            tagAssociations.push({ questionId: q.id, tagId: tag.id });
          }
        }
        if (tagAssociations.length) {
          // de-dup just in case
          const uniq = tagAssociations.filter((assoc, idx, arr) => idx === arr.findIndex((a) => a.questionId === assoc.questionId && a.tagId === assoc.tagId));
          await prisma.questionTag.createMany({ data: uniq, skipDuplicates: true });
        }

        const normalizedMode = canonicalizeQuestionMode(providedMode) ?? "unused";
        await setQuestionMode(q.id, normalizedMode);

        // Check for similar questions in the background (don't block response)
        // yearContext was determined at the start of POST from referer header
        console.warn(`🔵 [BULK] Starting background similarity check for question ${customId} (${yearContext})`);
        // Run similarity check asynchronously (don't await)
        import("@/lib/similar-questions")
          .then(({ checkForSimilarQuestions }) => {
            return checkForSimilarQuestions(
              { id: q.id, text: q.text ?? "", customId: q.customId },
              yearContext
            );
          })
          .catch((error) => {
            console.error("🔴 [BULK] Failed to check for similar questions:", error);
          });

        results.push({ index: i, status: "created", customId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "failed";
        results.push({ index: i, status: "error", error: msg });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to add questions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


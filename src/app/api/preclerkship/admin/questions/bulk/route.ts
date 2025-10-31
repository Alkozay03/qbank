// src/app/api/preclerkship/admin/questions/bulk/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole } from "@/lib/rbac";
import { generateShortNumericId } from "@/lib/ids";
import { PreClerkshipTagType } from "@prisma/client";
import { canonicalizeTagValue } from "@/lib/tags/server";

type AnswerInput = { text: unknown; isCorrect: unknown };
type TagInput = { type: string; value: unknown };

// Map category names to PreClerkshipTagType enum values
const CATEGORY_TO_PRECLERKSHIP_TAG_TYPE: Record<string, PreClerkshipTagType> = {
  subject: PreClerkshipTagType.SUBJECT,
  discipline: PreClerkshipTagType.SUBJECT,
  system: PreClerkshipTagType.SYSTEM,
  topic: PreClerkshipTagType.TOPIC,
  week: PreClerkshipTagType.WEEK,
  lecture: PreClerkshipTagType.LECTURE,
  resource: PreClerkshipTagType.RESOURCE,
  mode: PreClerkshipTagType.MODE,
};

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

function normalizeTags(input: unknown): Array<{ type: PreClerkshipTagType; value: string }> | undefined {
  if (!Array.isArray(input)) return undefined;
  const arr = input as TagInput[];
  const seen = new Set<string>();
  const results: Array<{ type: PreClerkshipTagType; value: string }> = [];

  const resolveType = (value: string): PreClerkshipTagType | undefined => {
    const upper = value.toUpperCase();
    if (upper in PreClerkshipTagType) {
      return PreClerkshipTagType[upper as keyof typeof PreClerkshipTagType];
    }
    const lower = value.toLowerCase();
    return CATEGORY_TO_PRECLERKSHIP_TAG_TYPE[lower];
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

async function findPossibleDuplicate(text: string, yearLevel: number) {
  const norm = normalizeTextForDup(text);
  if (!norm) return null;
  const snippet = norm.slice(0, Math.max(60, Math.min(200, Math.floor(norm.length * 0.4))));
  const candidates = await prisma.preClerkshipQuestion.findMany({
    where: { 
      yearLevel,
      text: { contains: snippet, mode: "insensitive" } 
    },
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
  console.error(`[PRECLERKSHIP BULK] POST request received`);
  await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
  console.error(`[PRECLERKSHIP BULK] Permission check passed`);
  
  // Determine year level from request URL or referer header
  const referer = req.headers.get("referer") || "";
  let yearLevel = 1; // default
  if (referer.includes("year3")) yearLevel = 3;
  else if (referer.includes("year2")) yearLevel = 2;
  else if (referer.includes("year1")) yearLevel = 1;
  
  console.error(`[PRECLERKSHIP BULK] Processing bulk questions for Year ${yearLevel}`);
  
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

    const results: Array<{ 
      index: number; 
      status: "created" | "duplicate" | "error"; 
      customId?: number; 
      error?: string;
      questionId?: string;
      questionText?: string;
    }> = [];

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

        const dup = await findPossibleDuplicate(text, yearLevel);
        if (dup) { results.push({ index: i, status: "duplicate", customId: dup.customId ?? undefined }); continue; }

        const customId = await generateShortNumericId();
        const q = await prisma.preClerkshipQuestion.create({
          data: {
            customId,
            yearLevel,
            text,
            explanation,
            references,
          },
        });

        if (answers.length) {
          await prisma.preClerkshipAnswer.createMany({ 
            data: answers.map((a) => ({ 
              questionId: q.id, 
              text: a.text, 
              isCorrect: a.isCorrect 
            })) 
          });
        }

        // Create tags and attach
        const tagAssociations: Array<{ questionId: string; tagId: string }> = [];
        let providedMode: string | null = null;
        if (Array.isArray(tags) && tags.length) {
          for (const t of tags) {
            if (t.type === PreClerkshipTagType.MODE) {
              providedMode = t.value;
              continue;
            }
            const type = t.type;
            const tag = await prisma.preClerkshipTag.upsert({
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
          await prisma.preClerkshipQuestionTag.createMany({ data: uniq, skipDuplicates: true });
        }

        // Set question mode if provided
        if (providedMode) {
          await prisma.preClerkshipUserQuestionMode.upsert({
            where: {
              userId_questionId: {
                userId: "system",
                questionId: q.id,
              },
            },
            update: { mode: providedMode, updatedAt: new Date() },
            create: {
              userId: "system",
              questionId: q.id,
              mode: providedMode,
              updatedAt: new Date(),
            },
          });
        }

        results.push({ index: i, status: "created", customId, questionId: q.id, questionText: text });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "failed";
        results.push({ index: i, status: "error", error: msg });
      }
    }

    console.error(`[PRECLERKSHIP BULK] All ${results.length} questions processed`);

    const created = results.filter((r) => r.status === "created").length;
    const duplicates = results.filter((r) => r.status === "duplicate").length;
    const errors = results.filter((r) => r.status === "error");

    let message = `Created ${created} questions`;
    if (duplicates > 0) message += `, skipped ${duplicates} duplicates`;
    if (errors.length > 0) message += `, ${errors.length} errors`;

    return NextResponse.json({ 
      ok: true, 
      results,
      message,
      successCount: created,
      errors: errors.length > 0 ? errors.map(e => ({ index: e.index, error: e.error })) : undefined
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to add questions";
    console.error(`[PRECLERKSHIP BULK] Error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

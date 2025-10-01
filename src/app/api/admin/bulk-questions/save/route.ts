import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";
import { CATEGORY_TO_TAG_TYPE, canonicalizeTagValue } from "@/lib/tags/server";
import { canonicalizeQuestionMode, setQuestionMode } from "@/lib/quiz/questionMode";
import type { TagCategory } from "@/lib/tags/catalog";

interface QuestionPayload {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanation?: string;
  educationalObjective?: string;
  references?: string;
  tags?: string[];
}

function normalizeReferences(raw?: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r/g, "")
    .split(/\n+|,|;|\u2022|\u2023|\u25E6/g)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n");
}

function parseTags(source?: string[] | string): Array<{ type: TagType; value: string }> {
  if (!source) return [];
  const list = Array.isArray(source)
    ? source
    : String(source)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const normalised: Array<{ type: TagType; value: string }> = [];
  const seen = new Set<string>();

  for (const entry of list) {
    const [category, value] = entry.split(":");
    if (!category || !value) continue;
    const tagType = CATEGORY_TO_TAG_TYPE[category.toLowerCase() as TagCategory] ?? (TagType as unknown as Record<string, TagType>)[category.toUpperCase()];
    if (!tagType) continue;
    const canonical = canonicalizeTagValue(tagType, value);
    if (!canonical) continue;
    const key = `${tagType}:${canonical}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalised.push({ type: tagType, value: canonical });
  }

  return normalised;
}

async function attachTags(questionId: string, tags: Array<{ type: TagType; value: string }>) {
  for (const tagPayload of tags) {
    if (tagPayload.type === TagType.MODE) continue;
    const tag = await prisma.tag.upsert({
      where: { type_value: { type: tagPayload.type, value: tagPayload.value } },
      update: {},
      create: { type: tagPayload.type, value: tagPayload.value },
    });

    await prisma.questionTag.create({
      data: {
        questionId,
        tagId: tag.id,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MASTER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (await request.json()) as { questions?: QuestionPayload[] };
    const questions = Array.isArray(payload?.questions) ? payload.questions : [];

    if (!questions.length) {
      return NextResponse.json({ error: "questions[] required" }, { status: 400 });
    }

    const errors: string[] = [];
    let savedCount = 0;

    for (let index = 0; index < questions.length; index += 1) {
      const item = questions[index];
      try {
        if (!item?.questionText?.trim()) {
          errors.push(`Question ${index + 1}: missing question text`);
          continue;
        }

        const answerMap = [
          { label: 'A', text: item.optionA?.trim() ?? '' },
          { label: 'B', text: item.optionB?.trim() ?? '' },
          { label: 'C', text: item.optionC?.trim() ?? '' },
          { label: 'D', text: item.optionD?.trim() ?? '' },
          { label: 'E', text: item.optionE?.trim() ?? '' },
        ].filter((choice) => choice.text.length > 0);

        if (answerMap.length < 2) {
          errors.push(`Question ${index + 1}: at least two answer choices are required`);
          continue;
        }

        const correctLetter = (item.correctAnswer ?? '').trim().toUpperCase();
        const validLetter = answerMap.some((choice) => choice.label === correctLetter);
        if (!validLetter) {
          errors.push(`Question ${index + 1}: correct answer must be one of A, B, C, D, or E`);
          continue;
        }

        const question = await prisma.question.create({
          data: {
            text: item.questionText.trim(),
            explanation: item.explanation?.trim() ?? null,
            objective: item.educationalObjective?.trim() ?? null,
            references: (() => {
              const normalized = normalizeReferences(item.references);
              return normalized.length > 0 ? normalized : null;
            })(),
          },
        });

        await prisma.answer.createMany({
          data: answerMap.map((choice) => ({
            questionId: question.id,
            text: choice.text,
            isCorrect: choice.label === correctLetter,
          })),
        });

    const tagPayloads = parseTags(item.tags);

    const required = [TagType.ROTATION, TagType.RESOURCE, TagType.SUBJECT, TagType.SYSTEM];
    const missing = required.filter((type) => !tagPayloads.some((tag) => tag.type === type));
        if (missing.length) {
          errors.push(`Question ${index + 1}: missing tags for ${missing.map((t) => t.toLowerCase()).join(', ')}`);
          await prisma.question.delete({ where: { id: question.id } });
          continue;
        }

        const requestedMode = tagPayloads.find((tag) => tag.type === TagType.MODE)?.value ?? "unused";
        const normalizedMode = canonicalizeQuestionMode(requestedMode) ?? "unused";
        const nonModeTags = tagPayloads.filter((tag) => tag.type !== TagType.MODE);

        await attachTags(question.id, nonModeTags);
        await setQuestionMode(question.id, normalizedMode);

        savedCount += 1;
      } catch (error) {
        console.error(`Error saving question ${index + 1}:`, error);
        errors.push(`Question ${index + 1}: failed to save`);
      }
    }

    return NextResponse.json({
      savedCount,
      totalQuestions: questions.length,
      errors: errors.length ? errors : null,
      message: `Successfully saved ${savedCount} out of ${questions.length} questions`,
    });
  } catch (error) {
    console.error('Error saving questions:', error);
    return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }
}

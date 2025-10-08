import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";
import {
  canonicalizeQuestionMode,
  deriveModeFromHistory,
  getCurrentQuestionMode,
  setQuestionMode,
} from "@/lib/quiz/questionMode";

type TagPayload = {
  type: TagType;
  value: string;
};

type IncomingTag = string | TagPayload;

type QuestionUpdateBody = {
  questionText?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  correctAnswer?: string;
  explanation?: string;
  educationalObjective?: string;
  references?: string;
  rotation?: string;
  system?: string;
  discipline?: string;
  resource?: string;
  tags?: IncomingTag[];
  questionYear?: string;
  rotationNumber?: string;
  iduScreenshotUrl?: string;
  questionImageUrl?: string;
  explanationImageUrl?: string;
  isAnswerConfirmed?: boolean;
  occurrences?: Array<{
    id?: string;
    year?: string | null;
    rotation?: string | null;
    orderIndex?: number | null;
  }>;
};

const CATEGORY_TO_TAGTYPE: Record<string, TagType> = {
  rotation: TagType.ROTATION,
  resource: TagType.RESOURCE,
  discipline: TagType.SUBJECT,
  system: TagType.SYSTEM,
  mode: TagType.MODE,
};

function normalizeReferences(raw?: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/\r/g, "")
    .split(/\n+|,|;|\u2022|\u2023|\u25E6/g)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n");
  return cleaned.length > 0 ? cleaned : null;
}

function normaliseTags(raw: IncomingTag[] | undefined): TagPayload[] {
  if (!Array.isArray(raw)) return [];
  const results: TagPayload[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    if (typeof entry === "string") {
      const [category, value] = entry.split(":");
      if (!category || !value) continue;
      const tagType = CATEGORY_TO_TAGTYPE[category];
      if (!tagType) continue;
      const typedValue = tagType === TagType.MODE ? value.trim().toLowerCase() : value.trim();
      results.push({ type: tagType, value: typedValue });
      continue;
    }
    if (entry.type && entry.value) {
      const typedValue = entry.type === TagType.MODE
        ? String(entry.value).trim().toLowerCase()
        : String(entry.value).trim();
      results.push({ type: entry.type, value: typedValue });
    }
  }
  // de-dupe by type/value combination
  const seen = new Set<string>();
  return results.filter((tag) => {
    const key = `${tag.type}:${tag.value}`;
    if (!tag.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function upsertTag(questionId: string, payload: TagPayload) {
  const tag = await prisma.tag.upsert({
    where: { type_value: { type: payload.type, value: payload.value } },
    update: {},
    create: { type: payload.type, value: payload.value },
  });

  await prisma.questionTag.create({
    data: { questionId, tagId: tag.id },
  });
}

type RouteContext = { params: { questionId: string } } | { params: Promise<{ questionId: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { questionId } = await Promise.resolve(context.params);
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

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: { orderBy: { id: "asc" } },
        questionTags: {
          include: { tag: true },
        },
        occurrences: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const tags = question.questionTags.map((qt) => ({
      type: qt.tag.type,
      value: qt.tag.value,
    }));

    const answerLabels = ['A', 'B', 'C', 'D', 'E'];
    const optionsByLabel: Record<string, string> = {} as Record<string, string>;
    question.answers.forEach((answer, index) => {
      if (index < answerLabels.length) {
        optionsByLabel[answerLabels[index]] = answer.text;
      }
    });

    const correctIndex = question.answers.findIndex((ans) => ans.isCorrect);
    const correctLetter = correctIndex >= 0 && correctIndex < answerLabels.length ? answerLabels[correctIndex] : '';

    return NextResponse.json({
      id: question.id,
      customId: question.customId,
      questionText: question.text ?? '',
      optionA: optionsByLabel['A'] ?? '',
      optionB: optionsByLabel['B'] ?? '',
      optionC: optionsByLabel['C'] ?? '',
      optionD: optionsByLabel['D'] ?? '',
      optionE: optionsByLabel['E'] ?? '',
      correctAnswer: correctLetter,
      explanation: question.explanation ?? '',
      educationalObjective: question.objective ?? '',
      references: question.references ?? '',
      rotation: question.questionTags.find((qt) => qt.tag.type === TagType.ROTATION)?.tag.value ?? '',
      system: question.questionTags.find((qt) => qt.tag.type === TagType.SYSTEM)?.tag.value ?? '',
      discipline: question.questionTags.find((qt) => qt.tag.type === TagType.SUBJECT)?.tag.value ?? '',
      resource: question.questionTags.find((qt) => qt.tag.type === TagType.RESOURCE)?.tag.value ?? '',
      tags,
      questionYear: question.yearCaptured ?? '',
      rotationNumber: question.rotationNumber ?? '',
      iduScreenshotUrl: question.iduScreenshotUrl ?? '',
      questionImageUrl: question.questionImageUrl ?? '',
      explanationImageUrl: question.explanationImageUrl ?? '',
      occurrences: question.occurrences
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((occ) => ({
          id: occ.id,
          year: occ.year ?? '',
          rotation: occ.rotation ?? '',
          orderIndex: occ.orderIndex,
        })),
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json({
      error: "Failed to fetch question",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { questionId } = await Promise.resolve(context.params);
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

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const body = (await request.json()) as QuestionUpdateBody;

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const normalizedQuestionYear =
      body.questionYear === undefined
        ? undefined
        : typeof body.questionYear === "string"
        ? body.questionYear.trim()
        : "";
    const normalizedRotationNumber =
      body.rotationNumber === undefined
        ? undefined
        : typeof body.rotationNumber === "string"
        ? body.rotationNumber.trim()
        : "";
    const normalizedScreenshotUrl =
      body.iduScreenshotUrl === undefined
        ? undefined
        : typeof body.iduScreenshotUrl === "string"
        ? body.iduScreenshotUrl.trim()
        : "";
    const normalizedQuestionImageUrl =
      body.questionImageUrl === undefined
        ? undefined
        : typeof body.questionImageUrl === "string"
        ? body.questionImageUrl.trim()
        : "";
    const normalizedExplanationImageUrl =
      body.explanationImageUrl === undefined
        ? undefined
        : typeof body.explanationImageUrl === "string"
        ? body.explanationImageUrl.trim()
        : "";

    const answerCandidates = [
      { label: 'A', text: body.optionA?.trim() ?? '' },
      { label: 'B', text: body.optionB?.trim() ?? '' },
      { label: 'C', text: body.optionC?.trim() ?? '' },
      { label: 'D', text: body.optionD?.trim() ?? '' },
      { label: 'E', text: body.optionE?.trim() ?? '' },
    ].filter((entry) => entry.text.length > 0);

    if (answerCandidates.length < 2) {
      return NextResponse.json({ error: "At least two answer choices are required" }, { status: 400 });
    }

    const normalizedCorrect = (body.correctAnswer ?? '').trim().toUpperCase();
    const hasMatchingLabel = answerCandidates.some((answer) => answer.label === normalizedCorrect);
    if (!hasMatchingLabel) {
      return NextResponse.json({ error: "Correct answer must match one of the provided options (A-E)" }, { status: 400 });
    }

    const rawOccurrences = Array.isArray(body.occurrences) ? body.occurrences : [];
    const seenOccurrences = new Set<string>();
    const cleanOccurrences = rawOccurrences
      .map((occ, index) => {
        const year = typeof occ?.year === "string" ? occ.year.trim() : "";
        const rotation = typeof occ?.rotation === "string" ? occ.rotation.trim() : "";
        const orderIndex = typeof occ?.orderIndex === "number" && Number.isFinite(occ.orderIndex)
          ? occ.orderIndex
          : index;
        return { year, rotation, orderIndex };
      })
      .filter((occ) => occ.year.length > 0 || occ.rotation.length > 0)
      .filter((occ) => {
        const key = `${occ.year}::${occ.rotation}`;
        if (seenOccurrences.has(key)) return false;
        seenOccurrences.add(key);
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((occ, index) => ({ ...occ, orderIndex: index }));

    const primaryOccurrence = cleanOccurrences[0] ?? null;

    await prisma.question.update({
      where: { id: questionId },
      data: {
        text: body.questionText ?? existing.text,
        explanation: body.explanation ?? existing.explanation,
        objective: body.educationalObjective ?? existing.objective,
        references:
          body.references === undefined
            ? existing.references
            : normalizeReferences(body.references),
        yearCaptured:
          normalizedQuestionYear !== undefined
            ? normalizedQuestionYear
            : primaryOccurrence?.year ?? existing.yearCaptured,
        rotationNumber:
          normalizedRotationNumber !== undefined
            ? normalizedRotationNumber
            : primaryOccurrence?.rotation ?? existing.rotationNumber,
        iduScreenshotUrl:
          normalizedScreenshotUrl !== undefined
            ? (normalizedScreenshotUrl.length > 0 ? normalizedScreenshotUrl : null)
            : existing.iduScreenshotUrl,
        questionImageUrl:
          normalizedQuestionImageUrl !== undefined
            ? (normalizedQuestionImageUrl.length > 0 ? normalizedQuestionImageUrl : null)
            : existing.questionImageUrl,
        explanationImageUrl:
          normalizedExplanationImageUrl !== undefined
            ? (normalizedExplanationImageUrl.length > 0 ? normalizedExplanationImageUrl : null)
            : existing.explanationImageUrl,
        isAnswerConfirmed:
          body.isAnswerConfirmed !== undefined
            ? body.isAnswerConfirmed
            : existing.isAnswerConfirmed,
      },
    });

    await prisma.answer.deleteMany({ where: { questionId } });
    await prisma.answer.createMany({
      data: answerCandidates.map((candidate) => ({
        questionId,
        text: candidate.text!.trim(),
        isCorrect: candidate.label === normalizedCorrect,
      })),
    });

    if (Array.isArray(body.occurrences)) {
      await prisma.questionOccurrence.deleteMany({ where: { questionId } });
      if (cleanOccurrences.length > 0) {
        await prisma.questionOccurrence.createMany({
          data: cleanOccurrences.map((occ) => ({
            questionId,
            year: occ.year || null,
            rotation: occ.rotation || null,
            orderIndex: occ.orderIndex,
          })),
        });
      }
    }

    const tags = normaliseTags(body.tags);
    const providedModeTag = tags.find((tag) => tag.type === TagType.MODE) ?? null;
    const otherTags = tags.filter((tag) => tag.type !== TagType.MODE);
    const previousMode = await getCurrentQuestionMode(questionId);

    await prisma.questionTag.deleteMany({ where: { questionId } });
    for (const tag of otherTags) {
      await upsertTag(questionId, tag);
    }

    if (providedModeTag) {
      const normalized = canonicalizeQuestionMode(providedModeTag.value);
      if (normalized) {
        await setQuestionMode(questionId, normalized);
      } else if (previousMode) {
        await setQuestionMode(questionId, previousMode);
      } else {
        const derived = await deriveModeFromHistory(questionId);
        await setQuestionMode(questionId, derived);
      }
    } else if (previousMode) {
      await setQuestionMode(questionId, previousMode);
    } else {
      const derived = await deriveModeFromHistory(questionId);
      await setQuestionMode(questionId, derived);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { PreClerkshipTagType } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { randomUUID } from "crypto";

type TagPayload = {
  type: PreClerkshipTagType;
  value: string;
};

type IncomingTag = string | TagPayload;

type PreClerkshipQuestionUpdateBody = {
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
  tags?: IncomingTag[];
  iduScreenshotUrl?: string;
  questionImageUrl?: string;
  explanationImageUrl?: string;
  isAnswerConfirmed?: boolean;
  occurrences?: Array<{
    id?: string;
    year?: string | null;
    weekNumber?: number | null;
    lecture?: string | null;
    orderIndex?: number | null;
  }>;
};

const CATEGORY_TO_PRECLERKSHIP_TAGTYPE: Record<string, PreClerkshipTagType> = {
  subject: PreClerkshipTagType.SUBJECT,
  discipline: PreClerkshipTagType.SUBJECT, // Alias
  system: PreClerkshipTagType.SYSTEM,
  topic: PreClerkshipTagType.TOPIC,
  week: PreClerkshipTagType.WEEK,
  lecture: PreClerkshipTagType.LECTURE,
  resource: PreClerkshipTagType.RESOURCE,
  mode: PreClerkshipTagType.MODE,
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
      const tagType = CATEGORY_TO_PRECLERKSHIP_TAGTYPE[category.toLowerCase()];
      if (!tagType) continue;
      const typedValue = tagType === PreClerkshipTagType.MODE ? value.trim().toLowerCase() : value.trim();
      results.push({ type: tagType, value: typedValue });
      continue;
    }
    if (entry.type && entry.value) {
      const typedValue = entry.type === PreClerkshipTagType.MODE
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

async function upsertPreClerkshipTag(questionId: string, payload: TagPayload) {
  // Check if tag exists first
  let tag = await prisma.preClerkshipTag.findUnique({
    where: { type_value: { type: payload.type, value: payload.value } },
  });

  // Create tag if it doesn't exist
  if (!tag) {
    tag = await prisma.preClerkshipTag.create({
      data: {
        id: randomUUID(),
        type: payload.type,
        value: payload.value,
      },
    });
  }

  await prisma.preClerkshipQuestionTag.create({
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
    // Verify user has permission to read questions
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const question = await prisma.preClerkshipQuestion.findUnique({
      where: { id: questionId },
      include: {
        PreClerkshipAnswer: { orderBy: { id: "asc" } },
        PreClerkshipQuestionTag: {
          include: { PreClerkshipTag: true },
        },
        PreClerkshipQuestionOccurrence: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const tags = question.PreClerkshipQuestionTag.map((qt) => ({
      type: qt.PreClerkshipTag.type,
      value: qt.PreClerkshipTag.value,
    }));

    const answerLabels = ['A', 'B', 'C', 'D', 'E'];
    const optionsByLabel: Record<string, string> = {} as Record<string, string>;
    question.PreClerkshipAnswer.forEach((answer, index) => {
      if (index < answerLabels.length) {
        optionsByLabel[answerLabels[index]] = answer.text;
      }
    });

    const correctIndex = question.PreClerkshipAnswer.findIndex((ans) => ans.isCorrect);
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
      tags,
      iduScreenshotUrl: question.iduScreenshotUrl ?? '',
      questionImageUrl: question.questionImageUrl ?? '',
      explanationImageUrl: question.explanationImageUrl ?? '',
      occurrences: question.PreClerkshipQuestionOccurrence
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((occ) => ({
          id: occ.id,
          year: occ.year ?? '',
          weekNumber: occ.weekNumber,
          lecture: occ.lecture ?? '',
          orderIndex: occ.orderIndex,
        })),
    });
  } catch (error) {
    console.error("Error fetching preclerkship question:", error);
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
    
    // Verify user has permission to update questions
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const body = (await request.json()) as PreClerkshipQuestionUpdateBody;

    const existing = await prisma.preClerkshipQuestion.findUnique({
      where: { id: questionId },
      include: { PreClerkshipAnswer: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

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
        const weekNumber = typeof occ?.weekNumber === "number" && Number.isFinite(occ.weekNumber)
          ? occ.weekNumber
          : null;
        const lecture = typeof occ?.lecture === "string" ? occ.lecture.trim() : "";
        const orderIndex = typeof occ?.orderIndex === "number" && Number.isFinite(occ.orderIndex)
          ? occ.orderIndex
          : index;
        return { year, weekNumber, lecture, orderIndex };
      })
      .filter((occ) => occ.year.length > 0 || occ.weekNumber !== null || occ.lecture.length > 0)
      .filter((occ) => {
        const key = `${occ.year}::${occ.weekNumber}::${occ.lecture}`;
        if (seenOccurrences.has(key)) return false;
        seenOccurrences.add(key);
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((occ, index) => ({ ...occ, orderIndex: index }));

    await prisma.preClerkshipQuestion.update({
      where: { id: questionId },
      data: {
        text: body.questionText ?? existing.text,
        explanation: body.explanation ?? existing.explanation,
        objective: body.educationalObjective ?? existing.objective,
        references:
          body.references === undefined
            ? existing.references
            : normalizeReferences(body.references),
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

    await prisma.preClerkshipAnswer.deleteMany({ where: { questionId } });
    await prisma.preClerkshipAnswer.createMany({
      data: answerCandidates.map((candidate) => ({
        id: randomUUID(),
        questionId,
        text: candidate.text!.trim(),
        isCorrect: candidate.label === normalizedCorrect,
      })),
    });

    if (Array.isArray(body.occurrences)) {
      await prisma.preClerkshipQuestionOccurrence.deleteMany({ where: { questionId } });
      if (cleanOccurrences.length > 0) {
        const now = new Date();
        await prisma.preClerkshipQuestionOccurrence.createMany({
          data: cleanOccurrences.map((occ) => ({
            id: randomUUID(),
            questionId,
            year: occ.year || null,
            weekNumber: occ.weekNumber,
            lecture: occ.lecture || null,
            orderIndex: occ.orderIndex,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    }

    const tags = normaliseTags(body.tags);
    
    await prisma.preClerkshipQuestionTag.deleteMany({ where: { questionId } });
    for (const tag of tags) {
      await upsertPreClerkshipTag(questionId, tag);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating preclerkship question:", error);
    return NextResponse.json({ 
      error: "Failed to update question",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    // Verify user has permission to delete questions
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const resolvedParams = await params;
    const questionId = resolvedParams.questionId;

    // Check if question exists
    const question = await prisma.preClerkshipQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Delete the question (cascade will handle related records)
    await prisma.preClerkshipQuestion.delete({
      where: { id: questionId },
    });

    console.warn(`🗑️ [DELETE] PreClerkship Question ${questionId} deleted`);

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting preclerkship question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}

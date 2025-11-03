import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { TagType } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
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

type EMQOption = {
  id: string;
  text: string;
};

type EMQStem = {
  id: string;
  text: string;
  correctOptionIds: string[];
  stemImageUrl?: string;
};

type QuestionUpdateBody = {
  questionType?: 'MCQ' | 'EMQ';
  // MCQ fields
  questionText?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  correctAnswer?: string;
  // EMQ fields
  emqTheme?: string;
  emqOptions?: EMQOption[];
  emqStems?: EMQStem[];
  // Common fields
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
    // Verify user has permission to read questions
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        Choice: { orderBy: { id: "asc" } },
        QuestionTag: {
          include: { Tag: true },
        },
        QuestionOccurrence: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const tags = question.QuestionTag.map((qt) => ({
      type: qt.Tag.type,
      value: qt.Tag.value,
    }));

    // Handle both MCQ and EMQ question types
    const questionType = question.questionType || 'MCQ';
    
    let mcqData = {};
    let emqData = {};
    
    if (questionType === 'EMQ') {
      // For EMQ: stems are stored as Choice records, options in emqOptions JSON
      emqData = {
        emqTheme: question.emqTheme ?? '',
        emqOptions: (question.emqOptions as EMQOption[]) || [],
        emqStems: question.Choice.map(choice => ({
          id: choice.id,
          text: choice.text,
          correctOptionIds: (choice.correctOptionIds as string[]) || [],
          stemImageUrl: choice.stemImageUrl || '',
        })),
      };
    } else {
      // For MCQ: options are stored as Choice records
      const answerLabels = ['A', 'B', 'C', 'D', 'E'];
      const optionsByLabel: Record<string, string> = {} as Record<string, string>;
      question.Choice.forEach((answer, index) => {
        if (index < answerLabels.length) {
          optionsByLabel[answerLabels[index]] = answer.text;
        }
      });

      const correctIndex = question.Choice.findIndex((ans) => ans.isCorrect);
      const correctLetter = correctIndex >= 0 && correctIndex < answerLabels.length ? answerLabels[correctIndex] : '';
      
      mcqData = {
        optionA: optionsByLabel['A'] ?? '',
        optionB: optionsByLabel['B'] ?? '',
        optionC: optionsByLabel['C'] ?? '',
        optionD: optionsByLabel['D'] ?? '',
        optionE: optionsByLabel['E'] ?? '',
        correctAnswer: correctLetter,
      };
    }

    return NextResponse.json({
      id: question.id,
      customId: question.customId,
      questionType,
      questionText: question.text ?? '',
      ...mcqData,
      ...emqData,
      explanation: question.explanation ?? '',
      educationalObjective: question.objective ?? '',
      references: question.references ?? '',
      rotation: question.QuestionTag.find((qt) => qt.Tag.type === TagType.ROTATION)?.Tag.value ?? '',
      system: question.QuestionTag.find((qt) => qt.Tag.type === TagType.SYSTEM)?.Tag.value ?? '',
      discipline: question.QuestionTag.find((qt) => qt.Tag.type === TagType.SUBJECT)?.Tag.value ?? '',
      resource: question.QuestionTag.find((qt) => qt.Tag.type === TagType.RESOURCE)?.Tag.value ?? '',
      tags,
      questionYear: question.yearCaptured ?? '',
      rotationNumber: question.rotationNumber ?? '',
      iduScreenshotUrl: question.iduScreenshotUrl ?? '',
      questionImageUrl: question.questionImageUrl ?? '',
      explanationImageUrl: question.explanationImageUrl ?? '',
      occurrences: question.QuestionOccurrence
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
    
    // Verify user has permission to update questions
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const body = (await request.json()) as QuestionUpdateBody;

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: { Choice: true },
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

    const questionType = body.questionType || existing.questionType || 'MCQ';
    
    // Validate based on question type
    if (questionType === 'EMQ') {
      // EMQ validation
      if (!body.emqTheme || !body.emqOptions || !body.emqStems) {
        return NextResponse.json({ error: "EMQ requires theme, options, and stems" }, { status: 400 });
      }
      if (body.emqOptions.length < 3) {
        return NextResponse.json({ error: "EMQ requires at least 3 options" }, { status: 400 });
      }
      if (body.emqStems.length < 1) {
        return NextResponse.json({ error: "EMQ requires at least 1 stem" }, { status: 400 });
      }
      // Validate each stem has at least one correct option
      for (const stem of body.emqStems) {
        if (!stem.correctOptionIds || stem.correctOptionIds.length === 0) {
          return NextResponse.json({ error: "Each EMQ stem must have at least one correct answer" }, { status: 400 });
        }
      }
    } else {
      // MCQ validation
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
        questionType: questionType,
        text: questionType === 'EMQ' ? (body.emqTheme ?? existing.text) : (body.questionText ?? existing.text),
        emqTheme: questionType === 'EMQ' ? (body.emqTheme ?? null) : null,
        emqOptions: questionType === 'EMQ' ? (body.emqOptions || []) : [],
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

    // Update choices based on question type
    await prisma.choice.deleteMany({ where: { questionId } });
    
    if (questionType === 'EMQ' && body.emqStems) {
      // Create EMQ stems as Choice records
      await prisma.choice.createMany({
        data: body.emqStems.map((stem) => ({
          questionId,
          text: stem.text.trim(),
          isCorrect: false, // Not used for EMQ
          correctOptionIds: stem.correctOptionIds,
          stemImageUrl: stem.stemImageUrl || null,
        })),
      });
    } else {
      // Create MCQ options as Choice records
      const answerCandidates = [
        { label: 'A', text: body.optionA?.trim() ?? '' },
        { label: 'B', text: body.optionB?.trim() ?? '' },
        { label: 'C', text: body.optionC?.trim() ?? '' },
        { label: 'D', text: body.optionD?.trim() ?? '' },
        { label: 'E', text: body.optionE?.trim() ?? '' },
      ].filter((entry) => entry.text.length > 0);
      
      const normalizedCorrect = (body.correctAnswer ?? '').trim().toUpperCase();
      
      await prisma.choice.createMany({
        data: answerCandidates.map((candidate) => ({
          questionId,
          text: candidate.text.trim(),
          isCorrect: candidate.label === normalizedCorrect,
        })),
      });
    }

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
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Delete the question (cascade will handle related records)
    await prisma.question.delete({
      where: { id: questionId },
    });

    console.warn(`🗑️ [DELETE] Question ${questionId} deleted`);

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}

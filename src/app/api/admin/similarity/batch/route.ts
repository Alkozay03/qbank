import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { findSimilarQuestions } from "@/lib/similarity";
import { requireRole } from "@/lib/rbac";

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

interface BatchRequest {
  yearContext: "year4" | "year5";
  questionId: string; // Process ONE question at a time
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    
    const body = (await request.json()) as BatchRequest;
    const { yearContext, questionId } = body;

    // Get the question to check
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        customId: true,
        text: true,
        yearCaptured: true,
        QuestionTag: {
          include: {
            Tag: true,
          },
        },
      },
    });

    if (!question || !question.text) {
      return NextResponse.json({
        success: false,
        error: "Question not found or has no text",
      });
    }

    // Get rotation
    const rotationTag = question.QuestionTag.find(
      (qt) => qt.Tag.type === "ROTATION"
    );
    const rotation = rotationTag?.Tag.value ?? "No Rotation";

    // Support both "4" and "Y4" year formats
    const yearNumber = yearContext === "year4" ? "4" : "5";
    const yearWithPrefix = yearContext === "year4" ? "Y4" : "Y5";

    // Get ALL other questions in this rotation to compare against
    const existingQuestions = await prisma.question.findMany({
      where: {
        yearCaptured: {
          in: [yearNumber, yearWithPrefix],
        },
        id: { not: questionId }, // Exclude the question itself
        text: { not: null },
        ...(rotation !== "No Rotation" && {
          QuestionTag: {
            some: {
              Tag: {
                type: "ROTATION",
                value: rotation,
              },
            },
          },
        }),
      },
      select: {
        id: true,
        text: true,
        customId: true,
      },
    });

    if (existingQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        questionId,
        customId: question.customId,
        rotation,
        similarCount: 0,
        message: "No existing questions to compare against",
      });
    }

    // Find similar questions
    const similarQuestions = await findSimilarQuestions(
      { id: question.id, text: question.text },
      existingQuestions.map((q) => ({
        id: q.id,
        text: q.text ?? "",
      })),
      40 // 40% similarity threshold
    );

    let groupAction = "none";

    if (similarQuestions.length > 0) {
      // Get all question IDs in this similar set
      const questionIdsInSet = [
        question.id,
        ...similarQuestions.map((sq) => sq.questionId),
      ];

      // Check if any existing groups contain these questions
      const existingGroups = await prisma.similarQuestionGroup.findMany({
        where: {
          yearContext,
          questionIds: {
            hasSome: questionIdsInSet,
          },
        },
      });

      // Build similarity scores map
      const similarityScores: Record<string, number> = {};
      for (const sq of similarQuestions) {
        const key = [question.id, sq.questionId].sort().join(":");
        similarityScores[key] = sq.similarity;
      }

      if (existingGroups.length > 0) {
        // Update existing group - merge all question IDs
        const group = existingGroups[0]!;
        const allQuestionIds = Array.from(
          new Set([...group.questionIds, ...questionIdsInSet]),
        );

        // Merge similarity scores
        const existingScores =
          (group.similarityScores as Record<string, number>) || {};
        const mergedScores = { ...existingScores, ...similarityScores };

        await prisma.similarQuestionGroup.update({
          where: { id: group.id },
          data: {
            questionIds: allQuestionIds,
            similarityScores: mergedScores,
            updatedAt: new Date(),
          },
        });
        groupAction = "updated";
      } else {
        // Create new group
        await prisma.similarQuestionGroup.create({
          data: {
            id: crypto.randomUUID(),
            yearContext,
            questionIds: questionIdsInSet,
            similarityScores,
            updatedAt: new Date(),
          },
        });
        groupAction = "created";
      }
    }

    return NextResponse.json({
      success: true,
      questionId,
      customId: question.customId,
      rotation,
      similarCount: similarQuestions.length,
      groupAction,
      similarQuestions: similarQuestions.map((sq) => ({
        id: sq.questionId,
        similarity: sq.similarity,
      })),
    });

  } catch (error) {
    console.error("Batch similarity error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

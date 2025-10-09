import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { findSimilarQuestions } from "@/lib/similarity";
import { requireRole } from "@/lib/rbac";

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

interface SingleCheckRequest {
  questionId: string;
  yearContext: "year4" | "year5";
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const { questionId, yearContext } = (await request.json()) as SingleCheckRequest;

    // Get the question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        customId: true,
        text: true,
        questionTags: {
          include: { tag: true },
        },
      },
    });

    if (!question || !question.text) {
      return NextResponse.json({ 
        success: false, 
        questionId,
        similarFound: 0 
      });
    }

    // Get rotation tag
    const rotationTag = question.questionTags.find((qt) =>
      ["peds", "surgery", "medicine", "obgyn", "psych", "fp"].includes(
        qt.tag.value.toLowerCase()
      )
    );

    if (!rotationTag) {
      return NextResponse.json({ 
        success: false, 
        questionId,
        similarFound: 0,
        reason: "No rotation tag found"
      });
    }

    const rotation = rotationTag.tag.value.toLowerCase();

    // Get other questions in same rotation and year created in last 24 hours
    const yearNumber = yearContext === "year4" ? "4" : "5";
    const yearWithPrefix = yearContext === "year4" ? "Y4" : "Y5";
    
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { not: questionId },
        yearCaptured: { in: [yearNumber, yearWithPrefix] },
        text: { not: null },
        createdAt: { gte: twentyFourHoursAgo }, // Only questions from last 24 hours
        questionTags: {
          some: {
            tag: {
              value: { equals: rotation, mode: "insensitive" },
            },
          },
        },
      },
      select: {
        id: true,
        text: true,
      },
    });

    // Find similar questions using AI
    const similarQuestions = await findSimilarQuestions(
      { id: question.id, text: question.text },
      existingQuestions.map(q => ({ id: q.id, text: q.text! })),
      50 // 50% similarity threshold
    );

    let groupCreated = false;

    if (similarQuestions.length > 0) {
      // Check if already in a group
      const existingGroup = await prisma.similarQuestionGroup.findFirst({
        where: {
          questionIds: { has: question.id },
        },
      });

      if (!existingGroup) {
        // Build similarity scores object
        const similarityScores: Record<string, number> = {};
        similarQuestions.forEach(sq => {
          similarityScores[`${question.id}-${sq.questionId}`] = sq.similarity; // Already 0-100, no need to multiply
        });

        // Create new group
        await prisma.similarQuestionGroup.create({
          data: {
            questionIds: [question.id, ...similarQuestions.map((q) => q.questionId)],
            similarityScores,
            yearContext,
          },
        });
        groupCreated = true;
      }
    }

    return NextResponse.json({
      success: true,
      questionId: question.id,
      customId: question.customId,
      similarFound: similarQuestions.length,
      groupCreated,
    });

  } catch (error) {
    console.error("Error checking single question:", error);
    return NextResponse.json(
      { error: "Failed to check question" },
      { status: 500 }
    );
  }
}

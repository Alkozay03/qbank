import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const maxDuration = 10;

interface BatchRequest {
  yearContext: "year4" | "year5";
  dateFrom?: string;
  dateTo?: string;
  hoursAgo?: number;
}

export async function POST(request: Request) {
  try {
    // Check authorization
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const body = (await request.json()) as BatchRequest;
    const { yearContext, dateFrom, dateTo, hoursAgo = 24 } = body;

    // Calculate date range
    let startDate: Date;
    const endDate = dateTo ? new Date(dateTo) : new Date();

    if (dateFrom) {
      startDate = new Date(dateFrom);
    } else {
      startDate = new Date();
      startDate.setHours(startDate.getHours() - hoursAgo);
    }

    // Support both "4" and "Y4" year formats
    const yearNumber = yearContext === "year4" ? "4" : "5";
    const yearWithPrefix = yearContext === "year4" ? "Y4" : "Y5";

    // Get questions in date range
    const newQuestions = await prisma.question.findMany({
      where: {
        yearCaptured: {
          in: [yearNumber, yearWithPrefix],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        text: { not: null },
      },
      select: {
        id: true,
        customId: true,
        text: true,
        questionTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (newQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No questions found in the specified date range",
        processedQuestions: 0,
        newGroupsCreated: 0,
        questionsWithDuplicates: 0,
        details: [],
      });
    }

    // Group questions by rotation
    const questionsByRotation = new Map<
      string,
      Array<{ id: string; customId: number | null; text: string }>
    >();

    for (const question of newQuestions) {
      const rotationTag = question.questionTags.find(
        (qt) => qt.tag.type === "ROTATION"
      );
      const rotation = rotationTag?.tag.value ?? "No Rotation";

      if (!questionsByRotation.has(rotation)) {
        questionsByRotation.set(rotation, []);
      }

      questionsByRotation.get(rotation)!.push({
        id: question.id,
        customId: question.customId,
        text: question.text ?? "",
      });
    }

    // For now, just return what we found (no similarity checking yet)
    const summary = Array.from(questionsByRotation.entries()).map(([rotation, questions]) => ({
      rotation,
      count: questions.length,
      questionIds: questions.map(q => q.customId),
    }));

    return NextResponse.json({
      success: true,
      message: `Found ${newQuestions.length} questions to check across ${questionsByRotation.size} rotations. Similarity checking coming soon!`,
      processedQuestions: 0,
      newGroupsCreated: 0,
      questionsWithDuplicates: 0,
      details: [],
      debug: {
        totalQuestions: newQuestions.length,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
        rotationGroups: summary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        processedQuestions: 0,
        newGroupsCreated: 0,
        questionsWithDuplicates: 0,
        details: [],
      },
      { status: 500 }
    );
  }
}

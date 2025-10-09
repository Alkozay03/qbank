import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { getEmbedding } from "@/lib/similarity";
import { requireRole } from "@/lib/rbac";

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!;
    normA += vecA[i]! * vecA[i]!;
    normB += vecB[i]! * vecB[i]!;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

interface SingleCheckRequest {
  questionId: string;
  yearContext: "year4" | "year5";
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const { questionId, yearContext } = (await request.json()) as SingleCheckRequest;

    // Get the question with its embedding
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        customId: true,
        text: true,
        embedding: true,
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
    
    // If no embedding exists, compute it now
    let questionEmbedding: number[] | null = null;
    if (question.embedding && Array.isArray(question.embedding)) {
      questionEmbedding = question.embedding as number[];
    } else if (process.env.OPENAI_API_KEY) {
      try {
        console.error(`Computing embedding for question ${question.customId}...`);
        questionEmbedding = await getEmbedding(question.text);
        // Save it for future use
        await prisma.question.update({
          where: { id: question.id },
          data: { embedding: questionEmbedding },
        });
      } catch (error) {
        console.error("Failed to compute embedding:", error);
        return NextResponse.json({ 
          success: false, 
          questionId,
          similarFound: 0,
          reason: "Failed to compute embedding"
        });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        questionId,
        similarFound: 0,
        reason: "No embedding and no OpenAI key"
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
        embedding: { not: Prisma.JsonNull }, // Only compare questions that have embeddings
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
        embedding: true,
        customId: true,
      },
    });

    // Compare embeddings (instant, no API calls!)
    const similarQuestions: Array<{ questionId: string; similarity: number }> = [];
    const threshold = 50; // 50% similarity threshold
    
    for (const existingQ of existingQuestions) {
      if (!existingQ.embedding || !Array.isArray(existingQ.embedding)) continue;
      
      const existingEmbedding = existingQ.embedding as number[];
      const similarity = cosineSimilarity(questionEmbedding, existingEmbedding);
      const similarityPercent = Math.round(similarity * 100);
      
      if (similarityPercent >= threshold) {
        similarQuestions.push({
          questionId: existingQ.id,
          similarity: similarityPercent,
        });
      }
    }
    
    console.error(`Found ${similarQuestions.length} similar questions (>= ${threshold}%)`);

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

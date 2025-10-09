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
  let questionId: string | undefined;
  
  try {
    console.error("🔵 [SIMILARITY] Starting single question check...");
    
    // Step 1: Authentication
    try {
      await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
      console.error("🟢 [SIMILARITY] Authentication successful");
    } catch (authError) {
      console.error("🔴 [SIMILARITY] Authentication failed:", authError);
      return NextResponse.json(
        { 
          error: "Unauthorized",
          details: "You must be an admin to check similarities",
          errorType: "AUTH_ERROR"
        },
        { status: 403 }
      );
    }

    // Step 2: Parse request
    let body: SingleCheckRequest;
    try {
      body = (await request.json()) as SingleCheckRequest;
      questionId = body.questionId;
      console.error("🟢 [SIMILARITY] Request parsed:", { questionId, yearContext: body.yearContext });
    } catch (parseError) {
      console.error("🔴 [SIMILARITY] Failed to parse request:", parseError);
      return NextResponse.json(
        { 
          error: "Invalid request",
          details: "Request body must be valid JSON with questionId and yearContext",
          errorType: "PARSE_ERROR"
        },
        { status: 400 }
      );
    }

    const { yearContext } = body;

    // Step 3: Fetch question from database
    let question;
    try {
      console.error(`🔵 [SIMILARITY] Fetching question ${questionId} from database...`);
      question = await prisma.question.findUnique({
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
      
      if (!question) {
        console.error(`🔴 [SIMILARITY] Question ${questionId} not found in database`);
        return NextResponse.json(
          { 
            error: "Question not found",
            details: `No question exists with ID: ${questionId}`,
            errorType: "NOT_FOUND",
            success: false,
            questionId,
            similarFound: 0
          },
          { status: 404 }
        );
      }
      
      if (!question.text) {
        console.error(`🔴 [SIMILARITY] Question ${question.customId} has no text`);
        return NextResponse.json({
          error: "Question has no text",
          details: "Cannot check similarity for questions without text content",
          errorType: "NO_TEXT",
          success: false,
          questionId,
          similarFound: 0
        });
      }
      
      console.error(`🟢 [SIMILARITY] Question loaded: Q${question.customId}`);
    } catch (dbError) {
      console.error("🔴 [SIMILARITY] Database error fetching question:", dbError);
      return NextResponse.json(
        { 
          error: "Database error",
          details: dbError instanceof Error ? dbError.message : "Failed to fetch question from database",
          errorType: "DATABASE_ERROR"
        },
        { status: 500 }
      );
    }
    
    // Step 4: Get or compute embedding
    let questionEmbedding: number[] | null = null;
    
    if (question.embedding && Array.isArray(question.embedding)) {
      questionEmbedding = question.embedding as number[];
      console.error(`🟢 [SIMILARITY] Using existing embedding for Q${question.customId}`);
    } else {
      console.error(`🟡 [SIMILARITY] No embedding found for Q${question.customId}, computing...`);
      
      if (!process.env.OPENAI_API_KEY) {
        console.error("🔴 [SIMILARITY] OpenAI API key not configured");
        return NextResponse.json({
          error: "OpenAI not configured",
          details: "OPENAI_API_KEY environment variable is not set. Cannot compute embeddings.",
          errorType: "CONFIG_ERROR",
          success: false,
          questionId,
          similarFound: 0
        }, { status: 500 });
      }
      
      try {
        console.error(`🔵 [SIMILARITY] Calling OpenAI API for Q${question.customId}...`);
        questionEmbedding = await getEmbedding(question.text);
        console.error(`🟢 [SIMILARITY] Embedding computed successfully (${questionEmbedding.length} dimensions)`);
        
        // Save it for future use
        try {
          await prisma.question.update({
            where: { id: question.id },
            data: { embedding: questionEmbedding },
          });
          console.error(`🟢 [SIMILARITY] Embedding saved to database for Q${question.customId}`);
        } catch (saveError) {
          console.error("🟡 [SIMILARITY] Warning: Failed to save embedding to database:", saveError);
          // Continue anyway - we can still use the embedding
        }
      } catch (embeddingError) {
        console.error("🔴 [SIMILARITY] Failed to compute embedding:", embeddingError);
        
        const errorMessage = embeddingError instanceof Error ? embeddingError.message : String(embeddingError);
        let errorDetails = "Failed to generate embedding from OpenAI";
        let errorType = "OPENAI_ERROR";
        
        // Identify specific error types
        if (errorMessage.includes("rate_limit")) {
          errorDetails = "OpenAI rate limit exceeded. Please wait a moment and try again.";
          errorType = "RATE_LIMIT";
        } else if (errorMessage.includes("timeout")) {
          errorDetails = "OpenAI request timed out. Please try again.";
          errorType = "TIMEOUT";
        } else if (errorMessage.includes("API key")) {
          errorDetails = "Invalid OpenAI API key. Please check your configuration.";
          errorType = "INVALID_KEY";
        } else if (errorMessage.includes("network")) {
          errorDetails = "Network error connecting to OpenAI. Please check your internet connection.";
          errorType = "NETWORK_ERROR";
        }
        
        return NextResponse.json({
          error: "Failed to compute embedding",
          details: errorDetails,
          errorMessage: errorMessage,
          errorType,
          success: false,
          questionId,
          similarFound: 0
        }, { status: 500 });
      }
    }

    // Step 5: Get rotation tag
    console.error(`🔵 [SIMILARITY] Checking rotation tags for Q${question.customId}...`);
    const rotationTag = question.questionTags.find((qt) =>
      ["peds", "surgery", "medicine", "obgyn", "psych", "fp"].includes(
        qt.tag.value.toLowerCase()
      )
    );

    if (!rotationTag) {
      console.error(`🔴 [SIMILARITY] No rotation tag found for Q${question.customId}`);
      console.error(`   Available tags:`, question.questionTags.map(qt => qt.tag.value).join(", "));
      return NextResponse.json({
        error: "No rotation tag",
        details: `Question ${question.customId} must have a rotation tag (peds, surgery, medicine, obgyn, psych, or fp)`,
        errorType: "NO_ROTATION_TAG",
        success: false,
        questionId,
        similarFound: 0,
        availableTags: question.questionTags.map(qt => qt.tag.value)
      });
    }

    const rotation = rotationTag.tag.value.toLowerCase();
    console.error(`🟢 [SIMILARITY] Rotation tag found: ${rotation}`);

    // Step 6: Fetch candidate questions for comparison
    const yearNumber = yearContext === "year4" ? "4" : "5";
    const yearWithPrefix = yearContext === "year4" ? "Y4" : "Y5";
    
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    console.error(`🔵 [SIMILARITY] Fetching candidate questions...`);
    console.error(`   Filters: year=${yearNumber}, rotation=${rotation}, since=${twentyFourHoursAgo.toISOString()}`);
    
    let existingQuestions;
    try {
      existingQuestions = await prisma.question.findMany({
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
      console.error(`🟢 [SIMILARITY] Found ${existingQuestions.length} candidate questions to compare`);
    } catch (fetchError) {
      console.error("🔴 [SIMILARITY] Failed to fetch candidate questions:", fetchError);
      return NextResponse.json({
        error: "Database error",
        details: "Failed to fetch questions for comparison",
        errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
        errorType: "DATABASE_ERROR",
        success: false,
        questionId,
        similarFound: 0
      }, { status: 500 });
    }
    
    if (existingQuestions.length === 0) {
      console.error(`🟡 [SIMILARITY] No candidate questions found - skipping comparison`);
      return NextResponse.json({
        success: true,
        questionId: question.id,
        customId: question.customId,
        similarFound: 0,
        groupCreated: false,
        message: "No questions found in the same rotation and year from last 24 hours"
      });
    }

    // Step 7: Compare embeddings (instant, no API calls!)
    console.error(`🔵 [SIMILARITY] Comparing embeddings (threshold: 50%)...`);
    const similarQuestions: Array<{ questionId: string; similarity: number }> = [];
    const threshold = 50; // 50% similarity threshold
    let comparisonErrors = 0;
    
    try {
      for (const existingQ of existingQuestions) {
        try {
          if (!existingQ.embedding || !Array.isArray(existingQ.embedding)) {
            console.error(`🟡 [SIMILARITY] Skipping Q${existingQ.customId} - invalid embedding`);
            continue;
          }
          
          const existingEmbedding = existingQ.embedding as number[];
          
          // Validate embedding dimensions match
          if (existingEmbedding.length !== questionEmbedding.length) {
            console.error(`🟡 [SIMILARITY] Skipping Q${existingQ.customId} - dimension mismatch (${existingEmbedding.length} vs ${questionEmbedding.length})`);
            comparisonErrors++;
            continue;
          }
          
          const similarity = cosineSimilarity(questionEmbedding, existingEmbedding);
          const similarityPercent = Math.round(similarity * 100);
          
          if (similarityPercent >= threshold) {
            similarQuestions.push({
              questionId: existingQ.id,
              similarity: similarityPercent,
            });
            console.error(`   🎯 Q${existingQ.customId}: ${similarityPercent}% similar`);
          }
        } catch (compError) {
          console.error(`🔴 [SIMILARITY] Error comparing with Q${existingQ.customId}:`, compError);
          comparisonErrors++;
        }
      }
      
      console.error(`🟢 [SIMILARITY] Comparison complete: ${similarQuestions.length} similar questions found`);
      if (comparisonErrors > 0) {
        console.error(`🟡 [SIMILARITY] ${comparisonErrors} comparison errors encountered`);
      }
    } catch (comparisonError) {
      console.error("🔴 [SIMILARITY] Fatal error during comparison:", comparisonError);
      return NextResponse.json({
        error: "Comparison error",
        details: "Failed to compare question embeddings",
        errorMessage: comparisonError instanceof Error ? comparisonError.message : String(comparisonError),
        errorType: "COMPARISON_ERROR",
        success: false,
        questionId,
        similarFound: 0
      }, { status: 500 });
    }

    // Step 8: Create or update similarity group
    let groupCreated = false;

    if (similarQuestions.length > 0) {
      console.error(`🔵 [SIMILARITY] Creating/updating similarity group...`);
      
      try {
        // Check if already in a group
        const existingGroup = await prisma.similarQuestionGroup.findFirst({
          where: {
            questionIds: { has: question.id },
          },
        });

        if (existingGroup) {
          console.error(`🟡 [SIMILARITY] Q${question.customId} already in group ${existingGroup.id}`);
        } else {
          // Build similarity scores object
          const similarityScores: Record<string, number> = {};
          similarQuestions.forEach(sq => {
            similarityScores[`${question.id}-${sq.questionId}`] = sq.similarity;
          });

          // Create new group
          const newGroup = await prisma.similarQuestionGroup.create({
            data: {
              questionIds: [question.id, ...similarQuestions.map((q) => q.questionId)],
              similarityScores,
              yearContext,
            },
          });
          groupCreated = true;
          console.error(`🟢 [SIMILARITY] Created new group ${newGroup.id} with ${similarQuestions.length + 1} questions`);
        }
      } catch (groupError) {
        console.error("🔴 [SIMILARITY] Failed to create similarity group:", groupError);
        // Don't fail the whole request - similarity was found
        console.error("🟡 [SIMILARITY] Continuing despite group creation failure");
      }
    } else {
      console.error(`🟢 [SIMILARITY] No similar questions found - question is unique`);
    }

    const result = {
      success: true,
      questionId: question.id,
      customId: question.customId,
      similarFound: similarQuestions.length,
      groupCreated,
      comparedAgainst: existingQuestions.length,
      filters: {
        year: yearContext,
        rotation,
        timeWindow: "24 hours"
      }
    };
    
    console.error(`🟢 [SIMILARITY] Check complete for Q${question.customId}:`, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("🔴 [SIMILARITY] Unexpected error:", error);
    console.error("🔴 [SIMILARITY] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    return NextResponse.json({
      error: "Internal server error",
      details: "An unexpected error occurred while checking similarities",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorType: "INTERNAL_ERROR",
      questionId: questionId || "unknown",
      success: false,
      similarFound: 0
    }, { status: 500 });
  }
}

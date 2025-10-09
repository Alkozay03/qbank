import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { findSimilarQuestions } from "@/lib/similarity";

export const maxDuration = 10; // Hobby plan limit

interface BatchRequest {
  yearContext: "year4" | "year5";
  dateFrom?: string; // ISO string
  dateTo?: string; // ISO string
  hoursAgo?: number; // Alternative: check last N hours
}

interface BatchResult {
  success: boolean;
  message: string;
  processedQuestions: number;
  newGroupsCreated: number;
  questionsWithDuplicates: number;
  timeoutWarning?: boolean;
  details: Array<{
    questionId: string;
    customId: number | null;
    rotation: string;
    duplicatesFound: number;
  }>;
}

/**
 * Batch similarity check for recently created questions
 * Groups questions by rotation and checks each new question against existing ones in the same rotation
 */
export async function POST(request: Request) {
  try {
    // Check authorization
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);

    const body = (await request.json()) as BatchRequest;
    const { yearContext, dateFrom, dateTo, hoursAgo = 24 } = body;

    console.error(`🔍 [BATCH] Starting batch similarity check for ${yearContext}`);

    // Calculate date range
    let startDate: Date;
    const endDate = dateTo ? new Date(dateTo) : new Date();

    if (dateFrom) {
      startDate = new Date(dateFrom);
    } else {
      // Default to last N hours
      startDate = new Date();
      startDate.setHours(startDate.getHours() - hoursAgo);
    }

    console.error(`🔍 [BATCH] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all questions created in this date range
    const yearValue = yearContext === "year4" ? "4" : "5";
    
    // Debug: Check what questions exist in the database
    const allRecentQuestions = await prisma.question.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        customId: true,
        yearCaptured: true,
        createdAt: true,
        text: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Just show last 10
    });
    
    console.error(`🔍 [BATCH] Debug - Found ${allRecentQuestions.length} total questions in date range (any year):`);
    allRecentQuestions.forEach(q => {
      console.error(`  - Q${q.customId}: year=${q.yearCaptured}, created=${q.createdAt.toISOString()}, hasText=${!!q.text}`);
    });
    
    const newQuestions = await prisma.question.findMany({
      where: {
        yearCaptured: yearValue,
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

    console.error(`🔍 [BATCH] Found ${newQuestions.length} new questions to check (yearCaptured=${yearValue})`);

    if (newQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No questions found in the specified date range",
        processedQuestions: 0,
        newGroupsCreated: 0,
        questionsWithDuplicates: 0,
        details: [],
      } as BatchResult);
    }

    // Group questions by rotation
    const questionsByRotation = new Map<
      string,
      Array<{ id: string; customId: number | null; text: string }>
    >();

    for (const question of newQuestions) {
      // Find rotation tag
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

    console.error(
      `🔍 [BATCH] Questions grouped into ${questionsByRotation.size} rotations:`,
      Array.from(questionsByRotation.entries()).map(([rot, qs]) => ({
        rotation: rot,
        count: qs.length,
      }))
    );

    // Track results
    const results: BatchResult["details"] = [];
    let newGroupsCreated = 0;
    let questionsWithDuplicates = 0;
    const startTime = Date.now();
    const maxRuntime = 9000; // 9 seconds to leave buffer for response

    // Process each rotation separately
    for (const [rotation, rotationQuestions] of questionsByRotation.entries()) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxRuntime) {
        console.error(`⏱️ [BATCH] Approaching timeout, stopping early`);
        return NextResponse.json({
          success: true,
          message: `Processed ${results.length} questions before timeout. Run again to continue.`,
          processedQuestions: results.length,
          newGroupsCreated,
          questionsWithDuplicates,
          timeoutWarning: true,
          details: results,
        } as BatchResult);
      }

      console.error(
        `🔍 [BATCH] Processing rotation: ${rotation} (${rotationQuestions.length} questions)`
      );

      // Get all existing questions in this rotation (excluding the new ones)
      const existingQuestionsInRotation = await prisma.question.findMany({
        where: {
          yearCaptured: yearValue,
          id: { notIn: rotationQuestions.map((q) => q.id) },
          text: { not: null },
          ...(rotation !== "No Rotation" && {
            questionTags: {
              some: {
                tag: {
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

      console.error(
        `🔍 [BATCH] Found ${existingQuestionsInRotation.length} existing questions in ${rotation}`
      );

      if (existingQuestionsInRotation.length === 0) {
        console.error(`🔍 [BATCH] No existing questions to compare in ${rotation}, skipping`);
        continue;
      }

      // Process new questions in batches of 5 (parallel processing)
      const batchSize = 5;
      for (let i = 0; i < rotationQuestions.length; i += batchSize) {
        // Check timeout again
        if (Date.now() - startTime > maxRuntime) {
          console.error(`⏱️ [BATCH] Timeout approaching, stopping`);
          return NextResponse.json({
            success: true,
            message: `Processed ${results.length} questions before timeout. Run again to continue.`,
            processedQuestions: results.length,
            newGroupsCreated,
            questionsWithDuplicates,
            timeoutWarning: true,
            details: results,
          } as BatchResult);
        }

        const batch = rotationQuestions.slice(i, i + batchSize);
        console.error(
          `🔍 [BATCH] Processing batch ${Math.floor(i / batchSize) + 1} (questions ${i + 1}-${Math.min(i + batchSize, rotationQuestions.length)})`
        );

        // Process batch in parallel
        await Promise.all(
          batch.map(async (newQuestion) => {
            try {
              console.error(
                `🔍 [BATCH] Checking question ${newQuestion.customId} (${newQuestion.id})`
              );

              // Find similar questions
              const similarQuestions = await findSimilarQuestions(
                { id: newQuestion.id, text: newQuestion.text },
                existingQuestionsInRotation.map((q) => ({
                  id: q.id,
                  text: q.text ?? "",
                })),
                40 // 40% threshold
              );

              console.error(
                `🔍 [BATCH] Question ${newQuestion.customId}: found ${similarQuestions.length} similar questions`
              );

              results.push({
                questionId: newQuestion.id,
                customId: newQuestion.customId,
                rotation,
                duplicatesFound: similarQuestions.length,
              });

              // If duplicates found, create or update similarity group
              if (similarQuestions.length > 0) {
                questionsWithDuplicates++;

                // Create similarity scores map
                const similarityScores: Record<string, number> = {};
                const questionIds = [newQuestion.id];

                for (const similar of similarQuestions) {
                  questionIds.push(similar.questionId);
                  similarityScores[`${newQuestion.id}-${similar.questionId}`] =
                    similar.similarity;
                }

                // Check if any questions are already in a group
                const existingGroups = await prisma.similarQuestionGroup.findMany({
                  where: {
                    yearContext,
                    questionIds: {
                      hasSome: questionIds,
                    },
                  },
                });

                if (existingGroups.length > 0) {
                  // Update existing group
                  const primaryGroup = existingGroups[0]!;
                  const allQuestionIds = new Set<string>(primaryGroup.questionIds);

                  for (const group of existingGroups) {
                    for (const id of group.questionIds) {
                      allQuestionIds.add(id);
                    }
                  }

                  for (const id of questionIds) {
                    allQuestionIds.add(id);
                  }

                  // Merge similarity scores
                  const mergedScores = {
                    ...(primaryGroup.similarityScores as Record<string, number>),
                  };
                  for (const [key, value] of Object.entries(similarityScores)) {
                    mergedScores[key] = value;
                  }

                  await prisma.similarQuestionGroup.update({
                    where: { id: primaryGroup.id },
                    data: {
                      questionIds: Array.from(allQuestionIds),
                      similarityScores: mergedScores,
                      updatedAt: new Date(),
                    },
                  });

                  // Delete merged groups
                  if (existingGroups.length > 1) {
                    await prisma.similarQuestionGroup.deleteMany({
                      where: {
                        id: { in: existingGroups.slice(1).map((g) => g.id) },
                      },
                    });
                  }

                  console.error(
                    `🟡 [BATCH] Updated existing group for question ${newQuestion.customId}`
                  );
                } else {
                  // Create new group
                  await prisma.similarQuestionGroup.create({
                    data: {
                      questionIds,
                      similarityScores,
                      yearContext,
                    },
                  });

                  newGroupsCreated++;
                  console.error(
                    `🟢 [BATCH] Created new similarity group for question ${newQuestion.customId}`
                  );
                }
              } else {
                console.error(
                  `✅ [BATCH] Question ${newQuestion.customId} is unique (no duplicates)`
                );
              }
            } catch (error) {
              console.error(
                `🔴 [BATCH] Error processing question ${newQuestion.customId}:`,
                error
              );
              // Continue with next question instead of failing entire batch
            }
          })
        );
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`✅ [BATCH] Completed in ${totalTime}s`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} questions in ${totalTime}s. Found ${questionsWithDuplicates} questions with potential duplicates.`,
      processedQuestions: results.length,
      newGroupsCreated,
      questionsWithDuplicates,
      details: results,
    } as BatchResult);
  } catch (error) {
    console.error("🔴 [BATCH] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        processedQuestions: 0,
        newGroupsCreated: 0,
        questionsWithDuplicates: 0,
        details: [],
      } as BatchResult,
      { status: 500 }
    );
  }
}

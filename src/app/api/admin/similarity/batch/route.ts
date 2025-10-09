import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { findSimilarQuestions } from "@/lib/similarity";

export const maxDuration = 10;

interface BatchRequest {
  yearContext: "year4" | "year5";
  dateFrom?: string;
  dateTo?: string;
  hoursAgo?: number;
}

export async function POST(request: Request) {
  try {
    console.error("🚀 [BATCH] Starting batch similarity check");
    
    // Check authorization
    await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("✅ [BATCH] Authorization successful");

    const body = (await request.json()) as BatchRequest;
    const { yearContext, dateFrom, dateTo, hoursAgo = 24 } = body;
    console.error(`📋 [BATCH] Request params: yearContext=${yearContext}, hoursAgo=${hoursAgo}`);

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

    console.error(`📊 [BATCH] Found ${newQuestions.length} questions to check`);

    if (newQuestions.length === 0) {
      console.error("⚠️ [BATCH] No questions found in date range");
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

    console.error(`🔄 [BATCH] Grouped questions into ${questionsByRotation.size} rotations`);
    for (const [rotation, questions] of questionsByRotation.entries()) {
      console.error(`  📌 ${rotation}: ${questions.length} questions`);
    }

    // Process each rotation and check for similar questions
    const results: Array<{
      questionId: string;
      customId: number | null;
      rotation: string;
      duplicatesFound: number;
    }> = [];
    
    let newGroupsCreated = 0;
    let questionsWithDuplicates = 0;
    const startTime = Date.now();
    const maxRuntime = 8000; // 8 seconds max to leave buffer

    for (const [rotation, rotationQuestions] of questionsByRotation.entries()) {
      console.error(`\n🔍 [BATCH] Processing rotation: ${rotation} (${rotationQuestions.length} new questions)`);
      
      // Check timeout
      if (Date.now() - startTime > maxRuntime) {
        console.error("⏱️ [BATCH] Timeout reached, stopping");
        break;
      }

      // Get ALL questions in this rotation (excluding the new ones we're checking)
      // This includes questions from ANY time period, not just recent ones
      const existingQuestionsInRotation = await prisma.question.findMany({
        where: {
          yearCaptured: {
            in: [yearNumber, yearWithPrefix],
          },
          id: { notIn: rotationQuestions.map((q) => q.id) }, // Exclude new questions
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

      console.error(`  📚 [BATCH] Found ${existingQuestionsInRotation.length} existing questions in ${rotation} to compare against`);

      // Skip if no questions to compare against
      if (existingQuestionsInRotation.length === 0) {
        console.error(`  ⚠️ [BATCH] No existing questions in ${rotation}, skipping`);
        continue;
      }

      const questionsToCompareAgainst = existingQuestionsInRotation;

      // Check each new question
      for (const newQuestion of rotationQuestions) {
        console.error(`\n  🔎 [BATCH] Checking question #${newQuestion.customId} (${newQuestion.id.slice(0, 8)}...)`);
        
        if (Date.now() - startTime > maxRuntime) {
          console.error("  ⏱️ [BATCH] Timeout reached for this question, stopping");
          break;
        }

        // Filter out the question itself when comparing
        const questionsToCheck = questionsToCompareAgainst
          .filter((q) => q.id !== newQuestion.id)
          .map((q) => ({
            id: q.id,
            text: q.text ?? "",
          }));

        console.error(`    📋 [BATCH] Will compare against ${questionsToCheck.length} questions`);

        if (questionsToCheck.length === 0) {
          console.error("    ⚠️ [BATCH] No questions to check, skipping");
          continue;
        }

        // Find similar questions
        console.error(`    🤖 [BATCH] Calling findSimilarQuestions with 40% threshold...`);
        const similarQuestions = await findSimilarQuestions(
          { id: newQuestion.id, text: newQuestion.text },
          questionsToCheck,
          40 // 40% similarity threshold
        );
        console.error(`    ✅ [BATCH] findSimilarQuestions returned ${similarQuestions.length} matches`);

        if (similarQuestions.length > 0) {
          questionsWithDuplicates++;

          // Get all question IDs in this similar set
          const questionIdsInSet = [
            newQuestion.id,
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
            const key = [newQuestion.id, sq.questionId].sort().join(":");
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

            console.error(`    🔄 [BATCH] Updating existing group ${group.id} with ${allQuestionIds.length} total questions`);
            await prisma.similarQuestionGroup.update({
              where: { id: group.id },
              data: {
                questionIds: allQuestionIds,
                similarityScores: mergedScores,
                updatedAt: new Date(),
              },
            });
            console.error(`    ✅ [BATCH] Group updated successfully`);
          } else {
            // Create new group
            console.error(`    ➕ [BATCH] Creating new similarity group with ${questionIdsInSet.length} questions`);
            await prisma.similarQuestionGroup.create({
              data: {
                yearContext,
                questionIds: questionIdsInSet,
                similarityScores,
              },
            });
            newGroupsCreated++;
            console.error(`    ✅ [BATCH] New group created successfully`);
          }
        }

        results.push({
          questionId: newQuestion.id,
          customId: newQuestion.customId,
          rotation,
          duplicatesFound: similarQuestions.length,
        });
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const timeoutWarning = Date.now() - startTime > maxRuntime;

    console.error(`\n🎉 [BATCH] Completed in ${totalTime}s`);
    console.error(`📊 [BATCH] Results: ${results.length} questions processed, ${questionsWithDuplicates} with duplicates, ${newGroupsCreated} new groups created`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} questions in ${totalTime}s. Found ${questionsWithDuplicates} questions with potential duplicates.${timeoutWarning ? " (Timeout reached, run again to continue)" : ""}`,
      processedQuestions: results.length,
      newGroupsCreated,
      questionsWithDuplicates,
      timeoutWarning,
      details: results,
    });
  } catch (error) {
    console.error("❌ [BATCH] Fatal error:", error);
    if (error instanceof Error) {
      console.error("❌ [BATCH] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
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

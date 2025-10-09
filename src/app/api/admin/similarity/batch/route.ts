import prisma from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { findSimilarQuestions } from "@/lib/similarity";

// Use Edge Runtime for better timeout handling and streaming
export const runtime = 'edge';
export const maxDuration = 25; // Edge allows up to 25 seconds

interface BatchRequest {
  yearContext: "year4" | "year5";
  dateFrom?: string;
  dateTo?: string;
  hoursAgo?: number;
}

export async function POST(request: Request) {
  // Create a streaming response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send updates
  const sendUpdate = async (type: 'progress' | 'result' | 'complete' | 'error', message: string, data?: unknown) => {
    const update = { type, message, data, timestamp: new Date().toISOString() };
    await writer.write(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
  };

  // Start processing in the background
  (async () => {
    try {
      await sendUpdate('progress', '🚀 Starting batch similarity check...');
      
      // Check authorization
      await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
      await sendUpdate('progress', '✅ Authorization successful');

      const body = (await request.json()) as BatchRequest;
      const { yearContext, dateFrom, dateTo, hoursAgo = 24 } = body;
      await sendUpdate('progress', `📋 Parameters: ${yearContext}, checking last ${hoursAgo} hours`);

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

      await sendUpdate('progress', `📊 Found ${newQuestions.length} questions to check`);

      if (newQuestions.length === 0) {
        await sendUpdate('complete', 'No questions found in the specified date range', {
          processedQuestions: 0,
          newGroupsCreated: 0,
          questionsWithDuplicates: 0,
          details: [],
        });
        await writer.close();
        return;
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

      await sendUpdate('progress', `🔄 Grouped into ${questionsByRotation.size} rotations`);

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
      const maxRuntime = 20000; // 20 seconds max to leave buffer for edge runtime

      for (const [rotation, rotationQuestions] of questionsByRotation.entries()) {
        await sendUpdate('progress', `🔍 Processing rotation: ${rotation} (${rotationQuestions.length} questions)`);
        
        // Check timeout
        if (Date.now() - startTime > maxRuntime) {
          await sendUpdate('progress', '⏱️ Timeout approaching, wrapping up...');
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

        await sendUpdate('progress', `  📚 Found ${existingQuestionsInRotation.length} existing questions to compare against`);

        // Skip if no questions to compare against
        if (existingQuestionsInRotation.length === 0) {
          await sendUpdate('progress', `  ⚠️ No existing questions in ${rotation}, skipping`);
          continue;
        }

        const questionsToCompareAgainst = existingQuestionsInRotation;

        // Check each new question
        for (const newQuestion of rotationQuestions) {
          await sendUpdate('progress', `  🔎 Checking question #${newQuestion.customId}...`);
          
          if (Date.now() - startTime > maxRuntime) {
            await sendUpdate('progress', '  ⏱️ Timeout reached, stopping');
            break;
          }

          // Filter out the question itself when comparing
          const questionsToCheck = questionsToCompareAgainst
            .filter((q) => q.id !== newQuestion.id)
            .map((q) => ({
              id: q.id,
              text: q.text ?? "",
            }));

          if (questionsToCheck.length === 0) {
            continue;
          }

          // Find similar questions
          const similarQuestions = await findSimilarQuestions(
            { id: newQuestion.id, text: newQuestion.text },
            questionsToCheck,
            40 // 40% similarity threshold
          );
          
          if (similarQuestions.length > 0) {
            await sendUpdate('result', `  ✅ Question #${newQuestion.customId}: Found ${similarQuestions.length} similar question(s)`);
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

              await prisma.similarQuestionGroup.update({
                where: { id: group.id },
                data: {
                  questionIds: allQuestionIds,
                  similarityScores: mergedScores,
                  updatedAt: new Date(),
                },
              });
            } else {
              // Create new group
              await prisma.similarQuestionGroup.create({
                data: {
                  yearContext,
                  questionIds: questionIdsInSet,
                  similarityScores,
                },
              });
              newGroupsCreated++;
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

      // Send final completion message
      await sendUpdate('complete', `🎉 Completed in ${totalTime}s`, {
        success: true,
        processedQuestions: results.length,
        newGroupsCreated,
        questionsWithDuplicates,
        timeoutWarning,
        details: results,
      });

    } catch (error) {
      // Send error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await sendUpdate('error', `❌ Error: ${errorMessage}`, {
        success: false,
        error: errorMessage,
      });
    } finally {
      // Always close the stream
      await writer.close();
    }
  })();

  // Return the streaming response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

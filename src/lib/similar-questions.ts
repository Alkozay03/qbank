import { prisma } from "@/server/db";
import { findSimilarQuestions } from "./similarity";

/**
 * Check if a newly created question is similar to existing questions
 * and create alert groups if similarities are found
 */
export async function checkForSimilarQuestions(
  newQuestion: { id: string; text: string; customId: number | null },
  yearContext: "year4" | "year5"
): Promise<void> {
  try {
    console.error(`🔍 [SIMILAR] Starting check for question ${newQuestion.customId} (${yearContext})`);
    console.error(`🔍 [SIMILAR] Question text length: ${newQuestion.text?.length || 0} chars`);
    console.error(`🔍 [SIMILAR] Question text preview: "${newQuestion.text?.substring(0, 100)}..."`);
    
    // Skip if question text is empty or too short
    if (!newQuestion.text || newQuestion.text.length < 20) {
      console.error(`🔴 [SIMILAR] Skipping - text too short or empty`);
      return;
    }

    // Get all existing questions in the same year context
    // Determine year based on yearContext parameter
    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { not: newQuestion.id }, // Exclude the new question itself
        text: { not: null }, // Only questions with text
        yearCaptured: yearContext === "year4" ? "4" : "5", // Filter by year
      },
      select: {
        id: true,
        text: true,
        customId: true,
      },
    });

    console.error(`🔍 [SIMILAR] Found ${existingQuestions.length} existing ${yearContext} questions to compare`);

    // If no existing questions, nothing to compare
    if (existingQuestions.length === 0) {
      console.error(`🔴 [SIMILAR] No existing questions to compare`);
      return;
    }

    // Find similar questions (>= 40% similarity - lowered threshold)
    console.error(`🔍 [SIMILAR] Starting similarity comparison with OpenAI...`);
    const similarQuestions = await findSimilarQuestions(
      { id: newQuestion.id, text: newQuestion.text },
      existingQuestions.map((q) => ({ id: q.id, text: q.text ?? "" })),
      40 // 40% threshold (lowered from 50%)
    );

    console.error(`🔍 [SIMILAR] Comparison complete. Found ${similarQuestions.length} similar questions`);
    
    if (similarQuestions.length > 0) {
      console.error(`🟡 [SIMILAR] Similar questions:`, similarQuestions.map(sq => {
        const question = existingQuestions.find(eq => eq.id === sq.questionId);
        return {
          customId: question?.customId,
          similarity: sq.similarity + '%',
          textPreview: question?.text?.substring(0, 50) + '...'
        };
      }));
    }

    // If no similar questions found, we're done
    if (similarQuestions.length === 0) {
      console.error(`🟢 [SIMILAR] No duplicates found - question is unique`);
      return;
    }

    // Create similarity scores map
    const similarityScores: Record<string, number> = {};
    const questionIds = [newQuestion.id];

    for (const similar of similarQuestions) {
      questionIds.push(similar.questionId);
      // Store similarity score as "newQuestionId-similarQuestionId": score
      similarityScores[`${newQuestion.id}-${similar.questionId}`] =
        similar.similarity;
    }

    // Check if any of these questions are already in an existing group
    const existingGroups = await prisma.similarQuestionGroup.findMany({
      where: {
        yearContext,
        questionIds: {
          hasSome: questionIds, // Check if any of our questions are in existing groups
        },
      },
    });

    if (existingGroups.length > 0) {
      // Update existing group(s) to include the new question
      // For simplicity, we'll update the first group and merge any others
      const primaryGroup = existingGroups[0]!;
      
      // Collect all unique question IDs from all groups
      const allQuestionIds = new Set<string>(primaryGroup.questionIds);
      for (const group of existingGroups) {
        for (const id of group.questionIds) {
          allQuestionIds.add(id);
        }
      }
      
      // Add the new question and all similar questions
      for (const id of questionIds) {
        allQuestionIds.add(id);
      }

      // Merge similarity scores
      const mergedScores = { ...(primaryGroup.similarityScores as Record<string, number>) };
      for (const [key, value] of Object.entries(similarityScores)) {
        (mergedScores as Record<string, number>)[key] = value;
      }

      // Update the primary group
      await prisma.similarQuestionGroup.update({
        where: { id: primaryGroup.id },
        data: {
          questionIds: Array.from(allQuestionIds),
          similarityScores: mergedScores,
          updatedAt: new Date(),
        },
      });

      // Delete other groups (they've been merged)
      if (existingGroups.length > 1) {
        await prisma.similarQuestionGroup.deleteMany({
          where: {
            id: { in: existingGroups.slice(1).map((g) => g.id) },
          },
        });
      }
    } else {
      // Create a new similarity group
      await prisma.similarQuestionGroup.create({
        data: {
          questionIds,
          similarityScores,
          yearContext,
        },
      });
    }

    // Log success (using console.error as it's allowed by linter)
    if (similarQuestions.length > 0) {
      console.error(
        `[INFO] Found ${similarQuestions.length} similar questions for question ${newQuestion.customId}`
      );
    }
  } catch (error) {
    // Log error but don't block question creation
    console.error("Error checking for similar questions:", error);
  }
}

/**
 * Remove a question from all similarity groups it belongs to
 * Called when a question is marked as "keep" or deleted
 */
export async function removeQuestionFromSimilarityGroups(
  questionId: string
): Promise<void> {
  try {
    // Find all groups containing this question
    const groups = await prisma.similarQuestionGroup.findMany({
      where: {
        questionIds: {
          has: questionId,
        },
      },
    });

    for (const group of groups) {
      // Remove the question from the group
      const updatedQuestionIds = group.questionIds.filter(
        (id) => id !== questionId
      );

      // If only 0 or 1 questions remain, delete the group
      if (updatedQuestionIds.length <= 1) {
        await prisma.similarQuestionGroup.delete({
          where: { id: group.id },
        });
      } else {
        // Otherwise, update the group
        // Also remove similarity scores involving this question
        const updatedScores: Record<string, number> = {};
        const scores = group.similarityScores as Record<string, number>;
        
        for (const [key, value] of Object.entries(scores)) {
          if (!key.includes(questionId)) {
            updatedScores[key] = value;
          }
        }

        await prisma.similarQuestionGroup.update({
          where: { id: group.id },
          data: {
            questionIds: updatedQuestionIds,
            similarityScores: updatedScores,
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error removing question from similarity groups:", error);
    throw error;
  }
}

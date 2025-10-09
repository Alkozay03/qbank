import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calculate cosine similarity between two vectors
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

/**
 * Get embeddings for a text using OpenAI's embedding model
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    console.warn(`🔵 [OPENAI] Requesting embedding for text (${text.length} chars)`);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Cheaper and faster model
      input: text,
      encoding_format: "float",
    });

    const embedding = response.data[0]?.embedding ?? [];
    console.warn(`🟢 [OPENAI] Received embedding with ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error) {
    console.error("🔴 [OPENAI] Error getting embedding:", error);
    if (error instanceof Error) {
      console.error("🔴 [OPENAI] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Calculate semantic similarity between two texts using AI embeddings
 * Returns a score between 0 and 1, where 1 is identical and 0 is completely different
 */
export async function calculateSemanticSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  try {
    // Get embeddings for both texts
    const [embedding1, embedding2] = await Promise.all([
      getEmbedding(text1),
      getEmbedding(text2),
    ]);

    // Calculate cosine similarity
    const similarity = cosineSimilarity(embedding1, embedding2);

    // Return as percentage (0-100)
    return Math.round(similarity * 100);
  } catch (error) {
    console.error("Error calculating semantic similarity:", error);
    throw error;
  }
}

/**
 * Find similar questions in a list of questions
 * Returns pairs/groups of questions that have similarity >= threshold
 */
export async function findSimilarQuestions(
  newQuestion: { id: string; text: string },
  existingQuestions: { id: string; text: string }[],
  threshold: number = 50 // Default 50% similarity
): Promise<Array<{ questionId: string; similarity: number }>> {
  try {
    console.warn(`🔍 [SIMILARITY] Comparing against ${existingQuestions.length} questions with ${threshold}% threshold`);
    
    // Get embedding for the new question
    console.warn(`🔍 [SIMILARITY] Getting embedding for new question...`);
    const newQuestionEmbedding = await getEmbedding(newQuestion.text);

    // Calculate similarity with all existing questions
    console.warn(`🔍 [SIMILARITY] Getting embeddings for ${existingQuestions.length} existing questions...`);
    const similarities = await Promise.all(
      existingQuestions.map(async (question, index) => {
        console.warn(`🔍 [SIMILARITY] Processing question ${index + 1}/${existingQuestions.length}`);
        const questionEmbedding = await getEmbedding(question.text);
        const similarity = cosineSimilarity(
          newQuestionEmbedding,
          questionEmbedding
        );

        const similarityPercent = Math.round(similarity * 100);
        console.warn(`🔍 [SIMILARITY] Question ${index + 1} similarity: ${similarityPercent}%`);

        return {
          questionId: question.id,
          similarity: similarityPercent,
        };
      })
    );

    // Filter questions that meet the threshold
    const filtered = similarities.filter((item) => item.similarity >= threshold);
    console.warn(`🟢 [SIMILARITY] Found ${filtered.length} questions above ${threshold}% threshold`);
    
    return filtered;
  } catch (error) {
    console.error("🔴 [SIMILARITY] Error finding similar questions:", error);
    throw error;
  }
}

/**
 * Batch process multiple question comparisons efficiently
 * This is more efficient than calling findSimilarQuestions multiple times
 */
export async function batchFindSimilarQuestions(
  questions: Array<{ id: string; text: string }>,
  threshold: number = 50
): Promise<
  Array<{
    questionId: string;
    similarTo: Array<{ questionId: string; similarity: number }>;
  }>
> {
  try {
    // Get embeddings for all questions at once (more efficient)
    const embeddings = await Promise.all(
      questions.map((q) => getEmbedding(q.text))
    );

    const results: Array<{
      questionId: string;
      similarTo: Array<{ questionId: string; similarity: number }>;
    }> = [];

    // Compare each question with all others
    for (let i = 0; i < questions.length; i++) {
      const similarTo: Array<{ questionId: string; similarity: number }> = [];

      for (let j = 0; j < questions.length; j++) {
        if (i === j) continue; // Skip comparing with itself

        const similarity = cosineSimilarity(embeddings[i]!, embeddings[j]!);
        const similarityPercent = Math.round(similarity * 100);

        if (similarityPercent >= threshold) {
          similarTo.push({
            questionId: questions[j]!.id,
            similarity: similarityPercent,
          });
        }
      }

      if (similarTo.length > 0) {
        results.push({
          questionId: questions[i]!.id,
          similarTo,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in batch similar questions:", error);
    throw error;
  }
}

// backfill-embeddings.mjs
// Run with: node backfill-embeddings.mjs

import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get embedding for a text using OpenAI
 */
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0]?.embedding ?? [];
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

/**
 * Backfill embeddings for questions that don't have them
 */
async function backfillEmbeddings(limit = 100) {
  try {
    console.log("🔍 Finding questions without embeddings...");
    
    // Get questions without embeddings
    // For JSON fields in Prisma, we can't use `null` directly
    // We need to use Prisma.DbNull or check if the field is not set
    const questions = await prisma.question.findMany({
      where: {
        text: { not: null },
        OR: [
          { embedding: { equals: Prisma.DbNull } },
          { embedding: { equals: Prisma.JsonNull } }
        ]
      },
      select: {
        id: true,
        customId: true,
        text: true,
        embedding: true,
      },
      take: limit, // Process in batches
    });
    
    // Filter out questions that already have embeddings (belt and suspenders)
    const filteredQuestions = questions.filter(q => !q.embedding || (Array.isArray(q.embedding) && q.embedding.length === 0));

    if (filteredQuestions.length === 0) {
      console.error("✅ All questions have embeddings!");
      return;
    }

    console.error(`📊 Found ${filteredQuestions.length} questions without embeddings`);
    console.error(`⏱️  Estimated time: ${Math.ceil(filteredQuestions.length * 0.5)} seconds`);
    console.error("");

    let processed = 0;
    let failed = 0;

    for (const question of filteredQuestions) {
      try {
        if (!question.text) {
          console.error(`⏭️  Skipping Q${question.customId} (no text)`);
          continue;
        }

        console.error(`Processing Q${question.customId}...`);
        
        const embedding = await getEmbedding(question.text);
        
        await prisma.question.update({
          where: { id: question.id },
          data: { embedding },
        });
        
        processed++;
        
        if (processed % 10 === 0) {
          console.error(`📈 Progress: ${processed}/${filteredQuestions.length}`);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failed++;
        console.error(`❌ Failed Q${question.customId}:`, error.message);
      }
    }

    console.error("");
    console.error("=" .repeat(50));
    console.error(`✅ Backfill complete!`);
    console.error(`   Processed: ${processed}`);
    console.error(`   Failed: ${failed}`);
    console.error(`   Remaining: ${filteredQuestions.length - processed - failed}`);
    console.error("=" .repeat(50));

  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
console.error(`🚀 Starting backfill (limit: ${limit})...`);
console.error("");

backfillEmbeddings(limit)
  .then(() => {
    console.error("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

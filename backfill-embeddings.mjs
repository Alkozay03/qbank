// backfill-embeddings.mjs
// Run with: node backfill-embeddings.mjs

import { PrismaClient } from "@prisma/client";
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
    const questions = await prisma.question.findMany({
      where: {
        text: { not: null },
        embedding: null,
      },
      select: {
        id: true,
        customId: true,
        text: true,
      },
      take: limit, // Process in batches
    });

    if (questions.length === 0) {
      console.log("✅ All questions have embeddings!");
      return;
    }

    console.log(`📊 Found ${questions.length} questions without embeddings`);
    console.log(`⏱️  Estimated time: ${Math.ceil(questions.length * 0.5)} seconds`);
    console.log("");

    let processed = 0;
    let failed = 0;

    for (const question of questions) {
      try {
        if (!question.text) {
          console.log(`⏭️  Skipping Q${question.customId} (no text)`);
          continue;
        }

        console.log(`Processing Q${question.customId}...`);
        
        const embedding = await getEmbedding(question.text);
        
        await prisma.question.update({
          where: { id: question.id },
          data: { embedding },
        });
        
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`📈 Progress: ${processed}/${questions.length}`);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failed++;
        console.error(`❌ Failed Q${question.customId}:`, error.message);
      }
    }

    console.log("");
    console.log("=" .repeat(50));
    console.log(`✅ Backfill complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Remaining: ${questions.length - processed - failed}`);
    console.log("=" .repeat(50));

  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
console.log(`🚀 Starting backfill (limit: ${limit})...`);
console.log("");

backfillEmbeddings(limit)
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

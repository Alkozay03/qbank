import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkEmbeddings() {
  try {
    const totalQuestions = await prisma.question.count({
      where: { text: { not: null } }
    });
    
    const questionsWithEmbeddings = await prisma.question.count({
      where: { 
        text: { not: null },
        embedding: { not: null }
      }
    });
    
    console.error(`📊 Total questions with text: ${totalQuestions}`);
    console.error(`✅ Questions with embeddings: ${questionsWithEmbeddings}`);
    console.error(`⏳ Questions without embeddings: ${totalQuestions - questionsWithEmbeddings}`);
    
    if (questionsWithEmbeddings === totalQuestions) {
      console.error(`\n🎉 All questions have embeddings! Similarity checker is ready.`);
    } else {
      console.error(`\n⚠️  ${totalQuestions - questionsWithEmbeddings} questions still need embeddings.`);
      console.error(`   Run: node backfill-embeddings.mjs 100`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmbeddings();

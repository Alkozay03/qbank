// Check UserQuestionMode data
import { PrismaClient } from "@prisma/client";

const directUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});

async function checkModes() {
  try {
    console.log("Checking UserQuestionMode table...\n");
    
    const modes = await prisma.userQuestionMode.findMany({
      include: {
        user: { select: { email: true } },
        question: { select: { id: true, customId: true } }
      }
    });
    
    console.log(`Found ${modes.length} user question modes:\n`);
    
    for (const mode of modes) {
      console.log(`User: ${mode.user.email}`);
      console.log(`Question: ${mode.question.customId || mode.questionId}`);
      console.log(`Mode: ${mode.mode}`);
      console.log(`Updated: ${mode.updatedAt}`);
      console.log('---');
    }
    
    // Check recent quizzes
    console.log("\n\nRecent quizzes:");
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true } },
        items: {
          include: {
            question: { select: { customId: true } },
            responses: { select: { isCorrect: true, choiceId: true } }
          }
        }
      }
    });
    
    for (const quiz of quizzes) {
      console.log(`\nQuiz ${quiz.id} - ${quiz.status}`);
      console.log(`User: ${quiz.user.email}`);
      console.log(`Items: ${quiz.items.length}`);
      for (const item of quiz.items) {
        const resp = item.responses[0];
        console.log(`  Q${item.question.customId}: ${resp ? (resp.isCorrect ? 'CORRECT' : 'INCORRECT') : 'NO RESPONSE'}`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModes();

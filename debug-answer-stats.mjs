// Debug script to check answer statistics for a specific question
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugAnswerStats(questionId) {
  console.error("\n🔍 Debugging answer statistics...\n");
  
  // Get all responses for this question
  const responses = await prisma.response.findMany({
    where: {
      quizItem: {
        questionId: questionId
      }
    },
    select: {
      id: true,
      userId: true,
      isCorrect: true,
      choiceId: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true
        }
      },
      quizItem: {
        select: {
          questionId: true,
          question: {
            select: {
              customId: true,
              text: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  console.error(`📊 Total responses: ${responses.length}\n`);

  // Group by user to find first attempts
  const userFirstAttempts = new Map();
  
  responses.forEach(response => {
    const userId = response.userId;
    if (!userId) return;
    
    if (!userFirstAttempts.has(userId)) {
      userFirstAttempts.set(userId, response);
    }
  });

  console.error(`👥 Unique users who attempted: ${userFirstAttempts.size}\n`);
  
  // Count by choice
  const choiceCounts = {};
  let correctCount = 0;
  
  userFirstAttempts.forEach((response, userId) => {
    console.error(`  User: ${response.user?.email || userId}`);
    console.error(`    Choice: ${response.choiceId || 'NULL'}`);
    console.error(`    Correct: ${response.isCorrect ? 'YES' : 'NO'}`);
    console.error(`    Time: ${response.createdAt.toISOString()}\n`);
    
    if (response.choiceId) {
      choiceCounts[response.choiceId] = (choiceCounts[response.choiceId] || 0) + 1;
    }
    
    if (response.isCorrect) {
      correctCount++;
    }
  });

  console.error("\n📈 Choice Distribution (First Attempts):");
  Object.entries(choiceCounts).forEach(([choiceId, count]) => {
    const percentage = Math.round((count / userFirstAttempts.size) * 100);
    console.error(`  Choice ${choiceId}: ${count} users (${percentage}%)`);
  });

  console.error(`\n✅ Correct on first attempt: ${correctCount} users`);
  console.error(`❌ Incorrect on first attempt: ${userFirstAttempts.size - correctCount} users`);
  console.error(`📊 Overall accuracy: ${Math.round((correctCount / userFirstAttempts.size) * 100)}%\n`);
}

// Get question ID from command line
const questionId = process.argv[2];

if (!questionId) {
  console.error("Usage: node debug-answer-stats.mjs <questionId>");
  process.exit(1);
}

debugAnswerStats(questionId)
  .then(() => {
    console.error("✅ Debug complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

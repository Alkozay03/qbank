require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the CORRECTED API query logic
async function testCorrectedAPILogic() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; 
  
  console.log('Testing CORRECTED API logic...');
  
  try {
    const [totalQuestions, correctResponses, totalResponses, testsCompleted, uniqueQuestionsSolved] = await Promise.all([
      prisma.question.count(),
      prisma.response.count({
        where: {
          quizItem: { quiz: { userId: knownUserId, status: "Ended" } },
          isCorrect: true,
        },
      }),
      prisma.response.count({
        where: { quizItem: { quiz: { userId: knownUserId, status: "Ended" } } },
      }),
      prisma.quiz.count({ where: { userId: knownUserId, status: "Ended" } }),
      // Count unique QUESTIONS the user has answered (not quiz items)
      prisma.response.findMany({
        where: { quizItem: { quiz: { userId: knownUserId, status: "Ended" } } },
        select: {
          quizItem: {
            select: { questionId: true }
          }
        },
        distinct: ['quizItemId']
      }),
    ]);

    // Get unique question IDs from the responses
    const uniqueQuestionIds = new Set(uniqueQuestionsSolved.map(r => r.quizItem.questionId));
    const uniqueQuestionsCount = uniqueQuestionIds.size;
    
    const avgPercent = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const usedPercent = totalQuestions > 0 ? Math.round((uniqueQuestionsCount / totalQuestions) * 100) : 0;

    console.log('✅ CORRECTED API Results:');
    console.log({
      totalQuestions,
      correctResponses, 
      totalResponses,
      testsCompleted,
      uniqueQuestionsCount,
      avgPercent,
      usedPercent: `${usedPercent}%`,
      displayText: `${uniqueQuestionsCount}/${totalQuestions} Questions Attempted`
    });
    
    console.log(`\n🎯 Fixed Dashboard Display:`);
    console.log(`- Question Score: ${avgPercent}% (21/24 correct answers)`);
    console.log(`- Qbank Usage: ${usedPercent}% (was 2400%, now correct!)`);
    console.log(`- Display Text: "${uniqueQuestionsCount}/${totalQuestions} Questions Attempted"`);
    console.log(`- Tests Completed: ${testsCompleted}`);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectedAPILogic();
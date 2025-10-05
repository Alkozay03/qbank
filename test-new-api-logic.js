require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the NEW API query logic
async function testNewAPILogic() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; 
  
  console.log('Testing NEW API logic...');
  
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
      // Count unique questions the user has answered (not total responses)
      prisma.response.groupBy({
        by: ['quizItemId'],
        where: { quizItem: { quiz: { userId: knownUserId, status: "Ended" } } },
        _count: true,
      }),
    ]);

    const uniqueQuestionsCount = uniqueQuestionsSolved.length;
    const avgPercent = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const usedPercent = totalQuestions > 0 ? Math.round((uniqueQuestionsCount / totalQuestions) * 100) : 0;

    console.log('✅ NEW API Results:');
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
    
    console.log(`\n🎯 Fixed Results:`);
    console.log(`- Question Score: ${avgPercent}%`);
    console.log(`- Qbank Usage: ${usedPercent}% (was 2400%)`);
    console.log(`- Display Text: "${uniqueQuestionsCount}/${totalQuestions} Questions Attempted"`);
    console.log(`- Tests Completed: ${testsCompleted}`);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testNewAPILogic();
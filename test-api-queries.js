require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the exact same query the API uses but with a known user ID
async function testAPIQueries() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; // From our database check
  
  console.log('Testing API queries with known user ID:', knownUserId);
  
  try {
    const [totalQuestions, correctResponses, totalResponses, testsCompleted] = await Promise.all([
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
    ]);

    const avgPercent = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
    const usedPercent = totalQuestions > 0 ? Math.round((totalResponses / totalQuestions) * 100) : 0;

    console.log('✅ API Query Results:');
    console.log({
      totalQuestions,
      correctResponses,
      totalResponses,
      testsCompleted,
      avgPercent,
      usedPercent,
    });
    
    if (testsCompleted === 0) {
      console.log('❌ Still getting 0 completed tests - there might be a query logic issue');
    } else {
      console.log('🎉 Found completed tests! The issue is definitely authentication');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIQueries();
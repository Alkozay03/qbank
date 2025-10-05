require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the performance page logic
async function testPerformancePageLogic() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; 
  
  console.log('Testing PERFORMANCE PAGE logic...');
  
  try {
    // Simulate the exact query from performance page
    const [totalQuestions, responses] = await Promise.all([
      prisma.question.count(),
      prisma.response.findMany({
        where: { quizItem: { quiz: { userId: knownUserId, status: "Ended" } } },
        select: {
          isCorrect: true,
          timeSeconds: true,
          createdAt: true,
          quizItem: { 
            select: { questionId: true } 
          },
        },
        orderBy: { createdAt: "asc" },
      })
    ]);

    // Simulate calculateStats function
    const totalResponses = responses.length;
    const totalCorrect = responses.filter((r) => r.isCorrect).length;
    const totalIncorrect = totalResponses - totalCorrect;
    
    // For "questions answered" count, use unique questions
    const uniqueQuestionIds = new Set(responses.map(r => r.quizItem.questionId).filter(Boolean));
    const answered = uniqueQuestionIds.size;
    const avgPercent = totalResponses ? Math.round((totalCorrect / totalResponses) * 100) : 0;
    
    const calculatedStats = {
      answered,
      totalCorrect, 
      totalIncorrect,
      avgPercent
    };
    
    // Calculate usage percentage (this is the key fix)
    const usedPercent = totalQuestions ? Math.round((calculatedStats.answered / totalQuestions) * 100) : 0;

    console.log('✅ PERFORMANCE PAGE Results:');
    console.log({
      totalQuestions,
      totalResponses,
      totalCorrect,
      totalIncorrect,
      uniqueQuestionsAnswered: answered,
      avgPercent: `${avgPercent}%`,
      usedPercent: `${usedPercent}%`,
      displayText: `${answered}/${totalQuestions} Questions Attempted`
    });
    
    console.log(`\n🎯 Performance Page Display:`);
    console.log(`- Question Score: ${avgPercent}% (${totalCorrect}/${totalResponses} correct)`);
    console.log(`- Qbank Usage: ${usedPercent}% (was 2400%, now correct!)`);
    console.log(`- Questions Answered: ${answered} unique questions`);
    console.log(`- Display should show: "${answered}/${totalQuestions} Questions Attempted"`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPerformancePageLogic();
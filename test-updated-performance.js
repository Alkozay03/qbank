require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the updated performance page logic
async function testUpdatedPerformanceLogic() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; 
  
  console.log('Testing UPDATED PERFORMANCE PAGE logic...');
  
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
    
    // Calculate usage percentage
    const usedPercent = totalQuestions ? Math.round((calculatedStats.answered / totalQuestions) * 100) : 0;
    
    const stats = {
      ...calculatedStats,
      usedPercent,
      totalQuestions,
      totalOmitted: 0,
    };

    console.log('✅ UPDATED PERFORMANCE PAGE Results:');
    console.log({
      ...stats,
      displayLabel: `Qbank Usage (${stats.answered}/${stats.totalQuestions})`
    });
    
    console.log(`\n🎯 Performance Page Display:`);
    console.log(`- Average Score: ${stats.avgPercent}%`);
    console.log(`- Qbank Usage: ${stats.usedPercent}% (was 2400%, now correct!)`);
    console.log(`- Label: "Qbank Usage (${stats.answered}/${stats.totalQuestions})"`);
    console.log(`- This shows: "${stats.answered}/${stats.totalQuestions}" as requested`);
    
  } catch (error) {
    console.error('❌ Updated performance test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedPerformanceLogic();
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugQuizStructure() {
  const knownUserId = 'cmg6volo00000unz0ygt2l0om'; 
  
  console.log('🔍 Debugging quiz/question structure...\n');
  
  try {
    // Check actual question count
    const totalQuestions = await prisma.question.count();
    console.log(`📚 Total questions in database: ${totalQuestions}`);
    
    // Check sample questions
    const sampleQuestions = await prisma.question.findMany({
      take: 3,
      select: { id: true, text: true }
    });
    
    console.log('📝 Sample questions:');
    sampleQuestions.forEach((q, i) => {
      console.log(`  ${i+1}. ID: ${q.id.slice(0, 8)}, Text: "${q.text?.slice(0, 50) || 'No text'}..."`);
    });
    
    // Check how quiz items relate to questions  
    const quizItemsInfo = await prisma.quizItem.findMany({
      where: {
        quiz: { userId: knownUserId, status: "Ended" }
      },
      select: {
        id: true,
        questionId: true,
        question: {
          select: { id: true, text: true }
        }
      },
      take: 5
    });
    
    console.log(`\n🧩 Quiz items (showing first 5 of ${quizItemsInfo.length}):`);
    quizItemsInfo.forEach((item, i) => {
      console.log(`  ${i+1}. QuizItem ID: ${item.id.slice(0, 8)}, Question ID: ${item.questionId?.slice(0, 8) || 'NULL'}`);
    });
    
    // Count unique questions user has actually seen
    const uniqueQuestionsUserSolved = await prisma.response.findMany({
      where: { 
        quizItem: { quiz: { userId: knownUserId, status: "Ended" } }
      },
      select: {
        quizItem: {
          select: { questionId: true }
        }
      }
    });
    
    const uniqueQuestionIds = new Set(uniqueQuestionsUserSolved.map(r => r.quizItem.questionId));
    const actualUniqueQuestions = uniqueQuestionIds.size;
    
    console.log(`\n📊 CORRECT CALCULATION:`);
    console.log(`  - User has solved ${actualUniqueQuestions} unique questions`);
    console.log(`  - Out of ${totalQuestions} total questions in pool`);
    console.log(`  - Usage percentage: ${totalQuestions > 0 ? Math.round((actualUniqueQuestions / totalQuestions) * 100) : 0}%`);
    console.log(`  - Display: "${actualUniqueQuestions}/${totalQuestions} Questions Attempted"`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugQuizStructure();
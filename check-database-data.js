require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT SET');

const prisma = new PrismaClient();

async function checkTestData() {
  try {
    console.log('=== CHECKING DATABASE CONTENTS ===\n');
    
    // Check users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.firstName} ${user.lastName}`);
    });
    
    if (users.length === 0) {
      console.log('❌ NO USERS FOUND! This is the problem - no users means no data.');
      return;
    }
    
    // Check quizzes for each user
    for (const user of users) {
      console.log(`\n🧪 Quizzes for user ${user.email}:`);
      
      const quizzes = await prisma.quiz.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          status: true,
          createdAt: true,
          _count: {
            select: { items: true }
          }
        }
      });
      
      console.log(`  Total quizzes: ${quizzes.length}`);
      
      if (quizzes.length > 0) {
        quizzes.forEach(quiz => {
          console.log(`    - ID: ${quiz.id.slice(0, 8)}, Status: ${quiz.status}, Items: ${quiz._count.items}, Created: ${quiz.createdAt.toISOString().split('T')[0]}`);
        });
        
        // Check specifically for "Ended" status
        const endedQuizzes = quizzes.filter(q => q.status === 'Ended');
        console.log(`  ✅ Ended quizzes (what dashboard looks for): ${endedQuizzes.length}`);
        
        const suspendedQuizzes = quizzes.filter(q => q.status === 'Suspended');
        console.log(`  ⏸️ Suspended quizzes (what previous tests shows): ${suspendedQuizzes.length}`);
      } else {
        console.log('  ❌ No quizzes found for this user');
      }
      
      // Check responses for this user
      const responses = await prisma.response.count({
        where: {
          quizItem: {
            quiz: { 
              userId: user.id,
              status: 'Ended' 
            }
          }
        }
      });
      console.log(`  📝 Responses for ended quizzes: ${responses}`);
    }
    
    // Overall stats
    console.log('\n📊 OVERALL DATABASE STATS:');
    const totalQuestions = await prisma.question.count();
    const totalQuizzes = await prisma.quiz.count();
    const totalResponses = await prisma.response.count();
    
    console.log(`  Questions: ${totalQuestions}`);
    console.log(`  Quizzes: ${totalQuizzes}`);
    console.log(`  Responses: ${totalResponses}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestData();
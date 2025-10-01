// Check questions in database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuestions() {
  try {
    const questionCount = await prisma.question.count();
    console.log(`Total questions in database: ${questionCount}`);
    
    if (questionCount > 0) {
      console.log('\nRecent questions:');
      const recentQuestions = await prisma.question.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customId: true,
          text: true,
          createdAt: true,
          questionTags: {
            include: {
              tag: true
            }
          }
        }
      });
      
      recentQuestions.forEach((q, index) => {
        console.log(`\n${index + 1}. ID: ${q.customId || q.id}`);
        console.log(`   Text: "${q.text?.substring(0, 100)}..."`);
        console.log(`   Created: ${q.createdAt}`);
        console.log(`   Tags: ${q.questionTags.map(qt => `${qt.tag.type}:${qt.tag.value}`).join(', ')}`);
      });
    }
  } catch (error) {
    console.error('Error checking questions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestions();
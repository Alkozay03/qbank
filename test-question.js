// Test fetching the specific question
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuestion() {
  try {
    const questionId = 'cmg6wknuu0000unekmhefrev6';
    console.log(`Testing question ID: ${questionId}`);
    
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answers: { orderBy: { id: "asc" } },
        questionTags: {
          include: { tag: true },
        },
        occurrences: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    
    if (question) {
      console.log('Question found!');
      console.log('Title preview:', question.text?.substring(0, 100));
      console.log('Has references field:', 'references' in question);
      console.log('References value:', question.references);
      console.log('Answer count:', question.answers.length);
      console.log('Tag count:', question.questionTags.length);
      console.log('Occurrence count:', question.occurrences.length);
    } else {
      console.log('Question not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuestion();
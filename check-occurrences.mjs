import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOccurrences() {
  try {
    console.warn('🔍 Checking occurrences and questions...\n');

    // Count total questions
    const totalQuestions = await prisma.question.count();
    console.warn(`📊 Total questions in database: ${totalQuestions}\n`);

    // Get all questions with details
    const allQuestions = await prisma.question.findMany({
      select: {
        id: true,
        text: true,
        createdAt: true,
        updatedAt: true,
        yearCaptured: true,
        questionTags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.warn('📝 Recent questions:\n');
    for (const q of allQuestions.slice(0, 10)) {
      const rotationTags = q.questionTags
        .filter(qt => qt.tag.type === 'ROTATION')
        .map(qt => qt.tag.value);
      console.warn(`  - ID: ${q.id.substring(0, 15)}...`);
      console.warn(`    Text: ${q.text.substring(0, 60)}...`);
      console.warn(`    Created: ${q.createdAt.toISOString()}`);
      console.warn(`    Year Captured: ${q.yearCaptured || 'none'}`);
      console.warn(`    Rotation Tags: ${rotationTags.join(', ') || 'none'}\n`);
    }

    // Check for drafts
    const drafts = allQuestions.filter(q => 
      q.text === '[Draft - Not yet saved]' || q.text.trim() === ''
    );

    console.warn(`🚨 Draft/empty questions: ${drafts.length}\n`);

    if (drafts.length > 0) {
      console.warn('Draft questions:\n');
      for (const draft of drafts.slice(0, 5)) {
        console.warn(`  - ID: ${draft.id}`);
        console.warn(`    Created: ${draft.createdAt.toISOString()}\n`);
      }
      if (drafts.length > 5) {
        console.warn(`  ... and ${drafts.length - 5} more\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOccurrences();

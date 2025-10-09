// check-all-questions.mjs
// Shows all questions in database to understand the 1/8 issue

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllQuestions() {
  console.log('🔍 Checking all questions in database...\n');

  try {
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions in database: ${totalQuestions}\n`);

    // Get all questions with minimal details
    const allQuestions = await prisma.question.findMany({
      select: {
        id: true,
        customId: true,
        text: true,
        createdAt: true,
        occurrences: {
          select: {
            id: true,
            year: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('📋 All questions:\n');
    allQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}`);
      console.log(`   Custom ID: ${q.customId || 'null'}`);
      console.log(`   Text: ${(q.text || '').substring(0, 60)}${(q.text || '').length > 60 ? '...' : ''}`);
      console.log(`   Created: ${q.createdAt.toISOString()}`);
      console.log(`   Occurrences: ${q.occurrences.length} (${q.occurrences.map(o => o.year).join(', ')})`);
      console.log('');
    });

    // Check for questions without occurrences
    const questionsWithoutOccurrences = allQuestions.filter(q => q.occurrences.length === 0);
    console.log(`\n⚠️  Questions without occurrences: ${questionsWithoutOccurrences.length}`);
    
    if (questionsWithoutOccurrences.length > 0) {
      console.log('\nThese questions might be orphaned drafts:\n');
      questionsWithoutOccurrences.forEach((q, index) => {
        console.log(`${index + 1}. ID: ${q.id}`);
        console.log(`   Text: ${(q.text || '').substring(0, 60)}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllQuestions();

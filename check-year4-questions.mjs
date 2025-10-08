import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYear4Questions() {
  try {
    console.log('🔍 Checking Year 4 questions...\n');

    // Get all questions
    const allQuestions = await prisma.question.findMany({
      select: {
        id: true,
        customId: true,
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

    // Filter for Year 4 questions (those with yearCaptured = 'Y4' or any Y4 rotation tags)
    const year4Questions = allQuestions.filter(q => {
      const hasY4Year = q.yearCaptured === 'Y4';
      const hasY4Rotation = q.questionTags.some(qt => 
        qt.tag.type === 'ROTATION' && qt.tag.value?.startsWith('Y4')
      );
      return hasY4Year || hasY4Rotation;
    });

    console.log(`📊 Total Year 4 questions: ${year4Questions.length}\n`);

    // Check for potential duplicates by text
    const textMap = new Map();
    const drafts = [];
    
    for (const q of year4Questions) {
      const textPreview = q.text.substring(0, 100);
      
      // Check if it's a draft
      if (q.text === '[Draft - Not yet saved]' || q.text.trim() === '') {
        drafts.push({
          id: q.id,
          customId: q.customId,
          createdAt: q.createdAt,
          text: q.text
        });
        continue;
      }
      
      if (textMap.has(textPreview)) {
        textMap.get(textPreview).push(q);
      } else {
        textMap.set(textPreview, [q]);
      }
    }

    // Find duplicates
    const duplicates = [];
    for (const [text, questions] of textMap.entries()) {
      if (questions.length > 1) {
        duplicates.push({ text, questions });
      }
    }

    if (drafts.length > 0) {
      console.log(`🚨 Found ${drafts.length} draft/empty questions:\n`);
      for (const draft of drafts.slice(0, 10)) {
        console.log(`  - ID: ${draft.id} | Custom ID: ${draft.customId || 'none'}`);
        console.log(`    Created: ${draft.createdAt.toISOString()}`);
        console.log(`    Text: "${draft.text}"\n`);
      }
      if (drafts.length > 10) {
        console.log(`  ... and ${drafts.length - 10} more\n`);
      }
    }

    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} potential duplicate questions:\n`);
      for (const dup of duplicates.slice(0, 5)) {
        console.log(`  Text preview: ${dup.text}...`);
        console.log(`  Duplicate count: ${dup.questions.length}`);
        for (const q of dup.questions) {
          console.log(`    - ID: ${q.id} | Custom ID: ${q.customId || 'none'} | Created: ${q.createdAt.toISOString()}`);
        }
        console.log('');
      }
      if (duplicates.length > 5) {
        console.log(`  ... and ${duplicates.length - 5} more duplicate sets\n`);
      }
    }

    // Show recent questions
    console.log('📝 Most recent 10 questions:\n');
    for (const q of year4Questions.slice(0, 10)) {
      console.log(`  - ID: ${q.id} | Custom ID: ${q.customId || 'none'}`);
      console.log(`    Created: ${q.createdAt.toISOString()}`);
      console.log(`    Text: ${q.text.substring(0, 80)}...\n`);
    }

    // Summary
    const realQuestions = year4Questions.length - drafts.length;
    console.log('\n📊 SUMMARY:');
    console.log(`  Total questions: ${year4Questions.length}`);
    console.log(`  Real questions: ${realQuestions}`);
    console.log(`  Draft/empty questions: ${drafts.length}`);
    console.log(`  Potential duplicates: ${duplicates.reduce((sum, d) => sum + d.questions.length - 1, 0)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYear4Questions();

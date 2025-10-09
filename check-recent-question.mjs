import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentQuestion() {
  try {
    console.log('🔍 Checking most recent question...\n');
    
    const recentQuestions = await prisma.question.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        customId: true,
        yearCaptured: true,
        createdAt: true,
        text: true,
        questionTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    console.log(`Found ${recentQuestions.length} most recent questions:\n`);
    
    for (const q of recentQuestions) {
      const rotations = q.questionTags
        .filter(qt => qt.tag.rotation)
        .map(qt => qt.tag.name);
      
      console.log(`Q${q.customId}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Year Captured: "${q.yearCaptured}" (type: ${typeof q.yearCaptured})`);
      console.log(`  Created: ${q.createdAt.toISOString()}`);
      console.log(`  Text: ${q.text ? `${q.text.substring(0, 50)}... (${q.text.length} chars)` : 'NULL'}`);
      console.log(`  Rotations: ${rotations.join(', ') || 'none'}`);
      console.log('');
    }

    // Check what the current server time is
    console.log(`\n⏰ Current server time: ${new Date().toISOString()}`);
    
    // Check time difference
    if (recentQuestions.length > 0) {
      const mostRecent = recentQuestions[0];
      const now = new Date();
      const created = new Date(mostRecent.createdAt);
      const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
      console.log(`\n📊 Most recent question was created ${diffMinutes} minutes ago`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentQuestion();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuestionTags() {
  try {
    console.log('🔍 Checking question tags in detail...\n');
    
    const recentQuestions = await prisma.question.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
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

    console.log(`Found ${recentQuestions.length} questions in last 24h:\n`);
    
    for (const q of recentQuestions) {
      console.log(`\nQ${q.customId}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Year Captured: "${q.yearCaptured}"`);
      console.log(`  Created: ${q.createdAt.toISOString()}`);
      console.log(`  Text: ${q.text ? `${q.text.substring(0, 50)}...` : 'NULL'}`);
      console.log(`  Total Tags: ${q.questionTags.length}`);
      
      if (q.questionTags.length > 0) {
        console.log(`  Tags:`);
        q.questionTags.forEach(qt => {
          console.log(`    - Type: ${qt.tag.type}, Value: "${qt.tag.value}"`);
        });
        
        const rotationTags = q.questionTags.filter(qt => qt.tag.type === 'ROTATION');
        console.log(`  Rotation tags: ${rotationTags.length}`);
        if (rotationTags.length > 0) {
          rotationTags.forEach(rt => {
            console.log(`    → ROTATION: "${rt.tag.value}"`);
          });
        }
      } else {
        console.log(`  ⚠️ NO TAGS FOUND!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestionTags();

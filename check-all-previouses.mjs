import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllPreviouses() {
  try {
    console.log('🔍 Checking ALL questions tagged with "previouses"...\n');
    
    const previousesQuestions = await prisma.question.findMany({
      where: {
        questionTags: {
          some: {
            tag: {
              type: 'RESOURCE',
              value: 'previouses',
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
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

    console.log(`Found ${previousesQuestions.length} questions tagged with "previouses":\n`);
    
    for (const q of previousesQuestions) {
      const rotationTags = q.questionTags.filter(qt => qt.tag.type === 'ROTATION');
      const rotation = rotationTags.length > 0 ? rotationTags[0].tag.value : 'No Rotation';
      
      const now = new Date();
      const created = new Date(q.createdAt);
      const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
      
      console.log(`Q${q.customId}:`);
      console.log(`  Year: ${q.yearCaptured}`);
      console.log(`  Created: ${q.createdAt.toISOString()} (${hoursAgo}h ago)`);
      console.log(`  Rotation: ${rotation}`);
      console.log(`  Text: ${q.text ? q.text.substring(0, 60) + '...' : 'NULL'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPreviouses();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixYearCaptured() {
  try {
    console.log('🔧 Fixing question with yearCaptured = "2025"...\n');
    
    // Find the question
    const question = await prisma.question.findFirst({
      where: {
        yearCaptured: '2025',
        createdAt: {
          gte: new Date('2025-09-30'),
        },
      },
      select: {
        id: true,
        customId: true,
        yearCaptured: true,
        text: true,
      },
    });

    if (!question) {
      console.log('❌ Question not found!');
      return;
    }

    console.log(`Found question Q${question.customId}:`);
    console.log(`  Current yearCaptured: "${question.yearCaptured}"`);
    console.log(`  Text: ${question.text?.substring(0, 60)}...`);
    console.log('');

    // Update it to Y4
    await prisma.question.update({
      where: { id: question.id },
      data: { yearCaptured: 'Y4' },
    });

    console.log('✅ Updated yearCaptured to "Y4"!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixYearCaptured();

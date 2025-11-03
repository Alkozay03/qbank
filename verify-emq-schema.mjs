import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEMQSchema() {
  try {
    console.log('🔍 Verifying EMQ schema...\n');

    // Check if we can query with new fields
    const question = await prisma.question.findFirst({
      select: {
        id: true,
        questionType: true,
        emqTheme: true,
        emqOptions: true,
      },
      take: 1,
    });

    console.log('✅ Question table has new EMQ fields');
    console.log('Sample question type:', question?.questionType || 'No questions yet');

    const choice = await prisma.choice.findFirst({
      select: {
        id: true,
        stemImageUrl: true,
        correctOptionIds: true,
      },
      take: 1,
    });

    console.log('✅ Choice table has new EMQ fields');
    console.log('\n🎉 Schema verification successful!');
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEMQSchema();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDrafts() {
  try {
    console.warn('🧹 Cleaning up draft questions...\n');

    // Find all draft questions
    const drafts = await prisma.question.findMany({
      where: {
        text: '[Draft - Not yet saved]'
      },
      select: {
        id: true,
        createdAt: true
      }
    });

    console.warn(`Found ${drafts.length} draft questions\n`);

    if (drafts.length === 0) {
      console.warn('✅ No drafts to clean up!');
      return;
    }

    // Delete them
    const result = await prisma.question.deleteMany({
      where: {
        text: '[Draft - Not yet saved]'
      }
    });

    console.warn(`✅ Deleted ${result.count} draft questions\n`);

    // Verify
    const remaining = await prisma.question.count();
    console.warn(`📊 Remaining questions in database: ${remaining}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDrafts();

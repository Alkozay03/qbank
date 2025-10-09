// cleanup-orphaned-drafts.mjs
// Removes draft questions without stableIds that were created due to a bug

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedDrafts() {
  console.log('🔍 Looking for orphaned draft questions...');

  try {
    // Find all questions without any QuestionOccurrence records
    // These are incomplete questions that were never properly saved
    const orphanedQuestions = await prisma.question.findMany({
      where: {
        occurrences: {
          none: {},
        },
      },
      select: {
        id: true,
        customId: true,
        text: true,
        createdAt: true,
        occurrences: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(`\n📊 Found ${orphanedQuestions.length} questions without occurrences:`);
    
    if (orphanedQuestions.length === 0) {
      console.log('✅ No orphaned drafts found!');
      return;
    }

    // Show details
    orphanedQuestions.forEach((q, index) => {
      console.log(`\n${index + 1}. ID: ${q.id}`);
      console.log(`   Custom ID: ${q.customId}`);
      console.log(`   Text: ${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}`);
      console.log(`   Created: ${q.createdAt.toISOString()}`);
    });

    // Ask for confirmation
    console.log('\n⚠️  These questions will be DELETED because they have no QuestionOccurrence records.');
    console.log('This usually means they were created but never properly saved with year/rotation info.');
    
    // In a real scenario, you'd want manual confirmation
    // For this script, we'll proceed automatically
    console.log('\n🗑️  Deleting orphaned questions...');

    // Get the IDs to delete
    const questionIds = orphanedQuestions.map(q => q.id);

    // Delete related records first (due to foreign key constraints)
    await prisma.answer.deleteMany({
      where: { questionId: { in: questionIds } },
    });

    await prisma.questionComment.deleteMany({
      where: { questionId: { in: questionIds } },
    });

    await prisma.questionTag.deleteMany({
      where: { questionId: { in: questionIds } },
    });

    // Delete the questions
    const result = await prisma.question.deleteMany({
      where: {
        id: { in: questionIds },
      },
    });

    console.log(`\n✅ Successfully deleted ${result.count} orphaned draft questions!`);
    console.log('📊 Your dashboard stats should now be accurate.');
  } catch (error) {
    console.error('\n❌ Error cleaning up orphaned drafts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupOrphanedDrafts()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });

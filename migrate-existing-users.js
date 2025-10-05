// Update all existing users to APPROVED status
// This is a one-time migration script to prevent locking out existing users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_DATABASE_URL,
    },
  },
});

async function migrateExistingUsers() {
  try {
    console.log('🔄 Updating existing users to APPROVED status...');

    // Update all users to APPROVED status
    const result = await prisma.user.updateMany({
      where: {
        // Update all users (the default is PENDING, which was just added)
      },
      data: {
        approvalStatus: 'APPROVED',
      },
    });

    console.log(`✅ Successfully updated ${result.count} users to APPROVED status`);
    
    // Show updated user stats
    const stats = await prisma.user.groupBy({
      by: ['approvalStatus'],
      _count: true,
    });
    
    console.log('\n📊 User approval status breakdown:');
    stats.forEach(stat => {
      console.log(`   ${stat.approvalStatus}: ${stat._count} users`);
    });

    console.log('\n✨ Migration complete! All existing users can now log in normally.');
    console.log('🔔 New users who sign up will need admin approval.');
    
  } catch (error) {
    console.error('❌ Error migrating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingUsers();

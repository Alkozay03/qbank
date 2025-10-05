// Quick script to check for PENDING users in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking for PENDING users...\n');
  
  const pendingUsers = await prisma.user.findMany({
    where: {
      approvalStatus: 'PENDING'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      approvalStatus: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${pendingUsers.length} PENDING users:\n`);
  
  if (pendingUsers.length === 0) {
    console.log('❌ No PENDING users found in database\n');
  } else {
    pendingUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Name: ${user.firstName || '(none)'} ${user.lastName || '(none)'}`);
      console.log(`   Status: ${user.approvalStatus}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });
  }

  // Also show total user count
  const totalUsers = await prisma.user.count();
  const approvedUsers = await prisma.user.count({ where: { approvalStatus: 'APPROVED' } });
  const blockedUsers = await prisma.user.count({ where: { approvalStatus: 'BLOCKED' } });

  console.log('📊 User Statistics:');
  console.log(`   Total Users: ${totalUsers}`);
  console.log(`   Approved: ${approvedUsers}`);
  console.log(`   Pending: ${pendingUsers.length}`);
  console.log(`   Blocked: ${blockedUsers}`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

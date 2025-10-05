// Check recent users and verification tokens
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 Recent Activity Check\n');
  console.log('='.repeat(50));
  
  // Check all users created in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: oneDayAgo
      }
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

  console.log(`\n👤 Users created in last 24 hours: ${recentUsers.length}`);
  if (recentUsers.length > 0) {
    recentUsers.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.email}`);
      console.log(`   Status: ${user.approvalStatus}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
    });
  } else {
    console.log('   (none)');
  }

  // Check verification tokens
  const tokens = await prisma.verificationToken.findMany({
    orderBy: {
      expires: 'desc'
    },
    take: 10
  });

  console.log(`\n🔑 Recent verification tokens: ${tokens.length}`);
  if (tokens.length > 0) {
    tokens.forEach((token, i) => {
      const isExpired = token.expires < new Date();
      console.log(`\n${i + 1}. Email: ${token.identifier}`);
      console.log(`   Expires: ${token.expires.toLocaleString()}`);
      console.log(`   Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`);
    });
  } else {
    console.log('   (none)');
  }

  // Check all users
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 All Users in Database:\n');
  
  const allUsers = await prisma.user.findMany({
    select: {
      email: true,
      approvalStatus: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (allUsers.length === 0) {
    console.log('❌ No users in database!\n');
  } else {
    allUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Status: ${user.approvalStatus} | Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });
  }

  console.log('='.repeat(50));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

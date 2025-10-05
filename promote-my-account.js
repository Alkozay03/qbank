// Promote account to MASTER_ADMIN on production
// Run this with: node promote-my-account.js

const { PrismaClient } = require('@prisma/client');

// Use DIRECT connection for migrations/admin tasks
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL
    }
  }
});

async function main() {
  const email = 'u21103000@sharjah.ac.ae';
  
  console.log(`Promoting ${email} to MASTER_ADMIN...`);
  
  const updated = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'MASTER_ADMIN',
      approvalStatus: 'APPROVED',
      firstName: 'Abdelrahman',
      lastName: 'Musameh',
      gradYear: 2021,
    },
    create: {
      email,
      role: 'MASTER_ADMIN',
      approvalStatus: 'APPROVED',
      firstName: 'Abdelrahman',
      lastName: 'Musameh',
      gradYear: 2021,
    },
  });
  
  console.log('\n✅ Account updated:');
  console.log(JSON.stringify(updated, null, 2));
  console.log('\n🎉 You are now a MASTER_ADMIN with APPROVED status!');
  console.log('Refresh your browser to see the changes.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

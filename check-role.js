const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRole() {
  try {
    console.log('🔍 Searching for user: u21103000@sharjah.ac.ae');
    
    const user = await prisma.user.findUnique({
      where: { email: 'u21103000@sharjah.ac.ae' },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ User not found with email: u21103000@sharjah.ac.ae');
      
      // Let's see what users exist
      const allUsers = await prisma.user.findMany({
        select: { email: true, role: true },
        take: 5
      });
      console.log('📋 Sample users in database:', JSON.stringify(allUsers, null, 2));
    }
  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Done');
  }
}

console.log('🚀 Starting role check...');
checkRole();

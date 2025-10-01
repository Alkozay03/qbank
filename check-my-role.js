const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMyRole() {
  try {
    console.log('🔍 Checking your specific user role...');
    
    const email = 'u21103000@sharjah.ac.ae';
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email }
    });
    
    if (!user) {
      console.log('❌ User not found in database!');
      console.log('Available emails in database:');
      
      const allUsers = await prisma.user.findMany({
        select: { email: true, role: true, name: true }
      });
      
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.role}) - ${u.name || 'No name'}`);
      });
      
    } else {
      console.log('✅ User found!');
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.name || 'No name'}`);
      console.log(`Created: ${user.createdAt}`);
      
      if (user.role !== 'MASTER_ADMIN') {
        console.log('\n🚀 Updating role to MASTER_ADMIN...');
        
        const updated = await prisma.user.update({
          where: { email: email },
          data: { role: 'MASTER_ADMIN' }
        });
        
        console.log('✅ Role updated successfully!');
        console.log(`New role: ${updated.role}`);
      } else {
        console.log('✅ User already has MASTER_ADMIN role!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMyRole();

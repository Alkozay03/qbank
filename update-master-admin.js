const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRole() {
  try {
    // First check current role
    const user = await prisma.user.findUnique({
      where: { email: 'u21103000@sharjah.ac.ae' },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📋 Current user:', user);
    
    // Update to MASTER_ADMIN
    await prisma.user.update({
      where: { email: 'u21103000@sharjah.ac.ae' },
      data: { role: 'MASTER_ADMIN' }
    });
    
    console.log('✅ Successfully updated role to MASTER_ADMIN');
    
    // Verify the update
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'u21103000@sharjah.ac.ae' },
      select: { id: true, email: true, role: true }
    });
    
    console.log('✅ Updated user:', updatedUser);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateRole();

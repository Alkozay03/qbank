const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateRole() {
  try {
    console.log('🔍 Checking current user role...');
    
    // Check if user exists
    let user = await prisma.user.findFirst({
      where: { email: 'u21103000@sharjah.ac.ae' }
    });

    if (user) {
      console.log('👤 Current user role:', user.role);
      
      if (user.role !== 'MASTER_ADMIN') {
        // Update role to MASTER_ADMIN
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MASTER_ADMIN' }
        });
        
        console.log('✅ Successfully updated user role to MASTER_ADMIN');
        console.log('📋 Updated user details:', updatedUser);
      } else {
        console.log('✅ User already has MASTER_ADMIN role');
      }
    } else {
      console.log('❌ User not found with email: u21103000@sharjah.ac.ae');
      console.log('🔄 Creating new user with MASTER_ADMIN role...');
      
      // Create new user with MASTER_ADMIN role
      const newUser = await prisma.user.create({
        data: {
          email: 'amraan.ramanan@gmail.com',
          firstName: 'Amraan',
          lastName: 'Ramanan',
          role: 'MASTER_ADMIN'
        }
      });
      
      console.log('✅ Successfully created new MASTER_ADMIN user');
      console.log('📋 New user details:', newUser);
    }

    console.log('🎉 Role update complete!');
    
  } catch (error) {
    console.error('❌ Error updating role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRole();

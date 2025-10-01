const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    console.log('🔍 Checking current user role...');

    // Your email
    const email = 'amraan.ramanan@gmail.com';
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });

    if (user) {
      console.log('👤 Current user details:', user);
      
      if (user.role !== 'MASTER_ADMIN') {
        // Update to MASTER_ADMIN
        const updatedUser = await prisma.user.update({
          where: { email },
          data: { role: 'MASTER_ADMIN' }
        });
        
        console.log('✅ Successfully promoted to MASTER_ADMIN!');
        console.log('📋 Updated user:', updatedUser);
        
        // Also update any other instances
        const allUsers = await prisma.user.findMany({
          where: { email },
          select: { id: true, email: true, role: true }
        });
        console.log('🔄 All user instances:', allUsers);
        
      } else {
        console.log('✅ User already has MASTER_ADMIN role!');
      }
    } else {
      console.log('❌ No user found with email:', email);
      console.log('🔄 Creating user with MASTER_ADMIN role...');
      
      const newUser = await prisma.user.create({
        data: {
          email,
          firstName: 'Admin',
          lastName: 'User', 
          role: 'MASTER_ADMIN'
        }
      });
      
      console.log('✅ Created new MASTER_ADMIN user:', newUser);
    }

    console.log('\n🎉 Process complete!');
    console.log('🔐 You should now have access to:');
    console.log('   - /year4/master-admin (Master Admin Hub)');
    console.log('   - Role Manager');
    console.log('   - User List');
    console.log('   - Admin Settings');
    console.log('\n💡 Refresh your browser or log out/in to see changes!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();

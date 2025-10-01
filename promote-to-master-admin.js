const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function promoteToMasterAdmin() {
  try {
    console.log('🚀 Promoting user to MASTER_ADMIN role...');

    // Your email from the codebase
    const email = 'u21103000@sharjah.ac.ae';
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });

    if (existingUser) {
      console.log('👤 Found existing user:', existingUser);
      
      // Update role to MASTER_ADMIN
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: 'MASTER_ADMIN' }
      });
      
      console.log('✅ Successfully updated user role to MASTER_ADMIN');
      console.log('📋 Updated user details:', updatedUser);
    } else {
      console.log('❌ User not found with email:', email);
      console.log('🔄 Creating new user with MASTER_ADMIN role...');
      
      // Create new user with MASTER_ADMIN role
      const newUser = await prisma.user.create({
        data: {
          email,
          firstName: 'Master',
          lastName: 'Admin',
          role: 'MASTER_ADMIN'
        }
      });
      
      console.log('✅ Successfully created new MASTER_ADMIN user');
      console.log('📋 New user details:', newUser);
    }

    console.log('🎉 Role assignment complete!');
    console.log('🔗 You now have access to:');
    console.log('   - Master Admin page (/year4/master-admin)');
    console.log('   - Role Manager');
    console.log('   - User List');
    console.log('   - AI Question Builder');
    console.log('   - System Administration tools');

  } catch (error) {
    console.error('❌ Error promoting to MASTER_ADMIN:', error);
    console.log('💡 Make sure the database is running and accessible');
  } finally {
    await prisma.$disconnect();
  }
}

promoteToMasterAdmin();

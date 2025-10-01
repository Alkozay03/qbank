const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMasterAdminRole() {
  try {
    console.log('🔍 Fixing Master Admin role assignment...');

    const yourEmail = 'u21103000@sharjah.ac.ae';
    
    // First, let's see all users and their roles
    console.log('\n📋 Current users in database:');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });
    
    allUsers.forEach(user => {
      console.log(`   ${user.email} - ${user.role} (${user.firstName} ${user.lastName})`);
    });

    // Remove MASTER_ADMIN role from all other users
    console.log('\n🔄 Removing MASTER_ADMIN role from other users...');
    const demotedUsers = await prisma.user.updateMany({
      where: {
        email: { not: yourEmail },
        role: 'MASTER_ADMIN'
      },
      data: { role: 'MEMBER' }
    });
    
    if (demotedUsers.count > 0) {
      console.log(`✅ Demoted ${demotedUsers.count} users from MASTER_ADMIN to MEMBER`);
    } else {
      console.log('ℹ️ No other MASTER_ADMIN users found');
    }

    // Find your user
    const yourUser = await prisma.user.findUnique({
      where: { email: yourEmail },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });

    if (yourUser) {
      console.log('\n👤 Found your user:', yourUser);
      
      if (yourUser.role !== 'MASTER_ADMIN') {
        // Update your role to MASTER_ADMIN
        const updatedUser = await prisma.user.update({
          where: { email: yourEmail },
          data: { role: 'MASTER_ADMIN' }
        });
        
        console.log('✅ Successfully promoted you to MASTER_ADMIN!');
        console.log('📋 Your updated details:', updatedUser);
      } else {
        console.log('✅ You already have MASTER_ADMIN role!');
      }
    } else {
      console.log('\n❌ Your user not found with email:', yourEmail);
      console.log('🔄 Creating new user with MASTER_ADMIN role...');
      
      const newUser = await prisma.user.create({
        data: {
          email: yourEmail,
          firstName: 'Admin',
          lastName: 'User',
          role: 'MASTER_ADMIN'
        }
      });
      
      console.log('✅ Created new MASTER_ADMIN user:', newUser);
    }

    // Show final state
    console.log('\n📊 Final user roles:');
    const finalUsers = await prisma.user.findMany({
      select: { email: true, role: true, firstName: true, lastName: true }
    });
    
    finalUsers.forEach(user => {
      const indicator = user.role === 'MASTER_ADMIN' ? '👑' : user.role === 'ADMIN' ? '🔧' : '👤';
      console.log(`   ${indicator} ${user.email} - ${user.role}`);
    });

    console.log('\n🎉 Master Admin role assignment complete!');
    console.log('🔐 You (u21103000@sharjah.ac.ae) now have exclusive MASTER_ADMIN access');
    console.log('💡 Log out and log back in to see the Master Admin options in your sidebar');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMasterAdminRole();

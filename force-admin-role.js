const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceUpdateRole() {
  try {
    console.log('🔍 Checking database for your user...');

    // Check all possible variations of your email
    const emailVariations = [
      'u21103000@sharjah.ac.ae',
      'U21103000@sharjah.ac.ae',
      'u21103000@SHARJAH.AC.AE'
    ];

    console.log('📋 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });
    
    allUsers.forEach(user => {
      console.log(`   ${user.email} - ${user.role} (${user.firstName} ${user.lastName})`);
    });

    let foundUser = null;
    
    // Try to find your user with any email variation
    for (const email of emailVariations) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true }
      });
      
      if (user) {
        foundUser = user;
        console.log(`✅ Found your user: ${user.email} with role: ${user.role}`);
        break;
      }
    }

    if (foundUser) {
      // Force update to MASTER_ADMIN
      console.log('🔄 Forcing role update to MASTER_ADMIN...');
      const updated = await prisma.user.update({
        where: { id: foundUser.id },
        data: { role: 'MASTER_ADMIN' }
      });
      console.log(`✅ Successfully updated! New role: ${updated.role}`);
    } else {
      console.log('❌ User not found with any email variation');
      console.log('🔄 Creating new user with MASTER_ADMIN role...');
      
      const newUser = await prisma.user.create({
        data: {
          email: 'u21103000@sharjah.ac.ae',
          firstName: 'Master',
          lastName: 'Admin',
          role: 'MASTER_ADMIN'
        }
      });
      console.log(`✅ Created new user: ${newUser.email} - ${newUser.role}`);
    }

    // Remove MASTER_ADMIN from all other users
    console.log('🧹 Removing MASTER_ADMIN from other users...');
    const demoted = await prisma.user.updateMany({
      where: {
        email: { notIn: emailVariations },
        role: 'MASTER_ADMIN'
      },
      data: { role: 'MEMBER' }
    });
    
    if (demoted.count > 0) {
      console.log(`✅ Demoted ${demoted.count} other users from MASTER_ADMIN`);
    }

    console.log('\n📊 Final user roles:');
    const finalUsers = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    
    finalUsers.forEach(user => {
      const icon = user.role === 'MASTER_ADMIN' ? '👑' : user.role === 'ADMIN' ? '🔧' : '👤';
      console.log(`   ${icon} ${user.email} - ${user.role}`);
    });

    console.log('\n🎉 Database update complete!');
    console.log('💡 Now try logging out and back in to refresh your session');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceUpdateRole();

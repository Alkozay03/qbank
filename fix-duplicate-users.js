const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDuplicateUsers() {
  try {
    console.log('🔍 Checking for duplicate users...');
    
    const targetEmail = 'u21103000@sharjah.ac.ae';
    
    // Find all users with your email
    const duplicateUsers = await prisma.user.findMany({
      where: { email: targetEmail },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        createdAt: true,
        gradYear: true 
      }
    });
    
    console.log(`Found ${duplicateUsers.length} records for ${targetEmail}:`);
    
    duplicateUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'No name'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Grad Year: ${user.gradYear || 'N/A'}`);
      console.log(`   Created: ${user.createdAt}`);
    });
    
    if (duplicateUsers.length > 1) {
      console.log('\n⚠️  Multiple records found! This can cause authentication issues.');
      console.log('🔧 I will keep the most recent record with MASTER_ADMIN role...');
      
      // Sort by creation date, keep the newest one
      const sortedUsers = duplicateUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const userToKeep = sortedUsers[0];
      const usersToDelete = sortedUsers.slice(1);
      
      console.log(`\n✅ Keeping: ${userToKeep.name || 'No name'} (ID: ${userToKeep.id}, Role: ${userToKeep.role})`);
      
      // Update the kept user to MASTER_ADMIN if not already
      if (userToKeep.role !== 'MASTER_ADMIN') {
        await prisma.user.update({
          where: { id: userToKeep.id },
          data: { role: 'MASTER_ADMIN' }
        });
        console.log(`🚀 Updated role to MASTER_ADMIN for kept record`);
      }
      
      // Delete the duplicate records
      for (const userToDelete of usersToDelete) {
        console.log(`🗑️  Deleting duplicate: ${userToDelete.name || 'No name'} (ID: ${userToDelete.id})`);
        await prisma.user.delete({
          where: { id: userToDelete.id }
        });
      }
      
      console.log('\n✅ Cleanup complete! Only one record remains.');
      
    } else if (duplicateUsers.length === 1) {
      console.log('\n✅ Only one record found - good!');
      const user = duplicateUsers[0];
      
      if (user.role !== 'MASTER_ADMIN') {
        console.log('🚀 Updating role to MASTER_ADMIN...');
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MASTER_ADMIN' }
        });
        console.log('✅ Role updated to MASTER_ADMIN!');
      } else {
        console.log('✅ Role is already MASTER_ADMIN!');
      }
    } else {
      console.log('\n❌ No records found for this email!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateUsers();

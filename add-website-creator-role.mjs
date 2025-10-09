// add-website-creator-role.mjs
// Run SQL to add WEBSITE_CREATOR role and update the website creator user

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addWebsiteCreatorRole() {
  console.log('🚀 Adding WEBSITE_CREATOR role...');

  try {
    // Add the new role value to the enum
    console.log('📝 Adding WEBSITE_CREATOR to Role enum...');
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WEBSITE_CREATOR';
    `);
    console.log('✅ WEBSITE_CREATOR role added to enum');

    // Update the website creator user to have the new role
    console.log('\n👤 Updating website creator user role...');
    const websiteCreator = await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET "role" = 'WEBSITE_CREATOR' 
      WHERE "email" = 'u21103000@sharjah.ac.ae'
      RETURNING *;
    `);
    
    if (websiteCreator) {
      console.log('✅ Website creator role updated successfully');
      
      // Verify the update
      const user = await prisma.user.findUnique({
        where: { email: 'u21103000@sharjah.ac.ae' },
        select: { email: true, role: true, firstName: true, lastName: true }
      });
      
      console.log('\n📊 User details:');
      console.log(user);
    } else {
      console.log('⚠️ No user found with email u21103000@sharjah.ac.ae');
      console.log('The user will need to be created or you need to manually set the role');
    }

    // Safety check: ensure no other users have WEBSITE_CREATOR role
    console.log('\n🔒 Safety check: Ensuring only one WEBSITE_CREATOR...');
    await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET "role" = 'MASTER_ADMIN' 
      WHERE "role" = 'WEBSITE_CREATOR' 
      AND "email" != 'u21103000@sharjah.ac.ae';
    `);
    console.log('✅ Safety check complete');

    console.log('\n✨ Migration complete!');
    console.log('🔄 Now run: npx prisma generate');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addWebsiteCreatorRole();

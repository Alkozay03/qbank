// Restore master admin role
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreMasterAdmin() {
  try {
    const email = 'u21103000@sharjah.ac.ae';
    console.log(`Updating role for ${email} to MASTER_ADMIN...`);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'MASTER_ADMIN' },
      create: {
        email,
        firstName: 'Master',
        lastName: 'Admin',
        role: 'MASTER_ADMIN'
      }
    });
    
    console.log(`Successfully updated user role:`, user);
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreMasterAdmin();
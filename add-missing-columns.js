const { PrismaClient } = require('@prisma/client');

async function addMissingColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding missing updatedAt column to User table...');
    
    // Add the updatedAt column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE "public"."User" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
    `;
    
    console.log('✓ updatedAt column added');
    
    // Update existing records to have a default updatedAt value
    await prisma.$executeRaw`
      UPDATE "public"."User" 
      SET "updatedAt" = "createdAt" 
      WHERE "updatedAt" IS NULL;
    `;
    
    console.log('✓ Existing users updated with updatedAt values');
    
    // Verify the column exists
    const testUser = await prisma.user.findFirst({
      select: { id: true, email: true, updatedAt: true }
    });
    
    if (testUser) {
      console.log('✓ Database schema verified - updatedAt column working');
    } else {
      console.log('⚠ No users found to test, but column should be ready');
    }
    
  } catch (error) {
    console.error('Error adding columns:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();

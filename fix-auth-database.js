const { PrismaClient } = require('@prisma/client');

async function fixDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // Add the updatedAt column if it doesn't exist
    console.log('Adding updatedAt column to User table...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
      `;
      console.log('✅ updatedAt column added/verified');
    } catch (e) {
      console.log('⚠️ Column might already exist:', e.message);
    }
    
    // Set default values for existing users
    console.log('Setting default updatedAt values...');
    const updated = await prisma.$executeRaw`
      UPDATE "User" 
      SET "updatedAt" = "createdAt" 
      WHERE "updatedAt" IS NULL;
    `;
    console.log(`✅ Updated ${updated} users with default updatedAt`);
    
    // Create Notification table if it doesn't exist
    console.log('Creating Notification table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'info',
          "shortId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdById" TEXT,
          CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ Notification table created/verified');
    } catch (e) {
      console.log('⚠️ Notification table might already exist:', e.message);
    }
    
    // Create NotificationRead table if it doesn't exist  
    console.log('Creating NotificationRead table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "NotificationRead" (
          "id" TEXT NOT NULL,
          "notificationId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ NotificationRead table created/verified');
    } catch (e) {
      console.log('⚠️ NotificationRead table might already exist:', e.message);
    }
    
    // Test the fix by trying to create a user (dry run)
    console.log('Testing user creation...');
    const testEmail = 'test' + Date.now() + '@sharjah.ac.ae';
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        firstName: 'Test',
        lastName: 'User'
      }
    });
    console.log('✅ User creation test successful:', testUser.id);
    
    // Clean up test user
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test user cleaned up');
    
    console.log('🎉 Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();

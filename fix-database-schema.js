const { PrismaClient } = require('@prisma/client');

async function fixDatabaseSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing database schema issues...');
    
    // Add missing User.updatedAt column
    console.log('Adding User.updatedAt column...');
    await prisma.$executeRaw`
      ALTER TABLE "public"."User" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
    `;
    
    // Update existing records to have a default updatedAt value
    console.log('Setting default updatedAt values...');
    await prisma.$executeRaw`
      UPDATE "public"."User" 
      SET "updatedAt" = "createdAt" 
      WHERE "updatedAt" IS NULL;
    `;
    
    // Create Notification table if missing
    console.log('Creating Notification table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."Notification" (
        "id" TEXT NOT NULL,
        "shortId" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isDeleted" BOOLEAN NOT NULL DEFAULT false,
        "createdById" TEXT,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create NotificationRead table if missing
    console.log('Creating NotificationRead table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."NotificationRead" (
        "id" TEXT NOT NULL,
        "notificationId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create indexes
    console.log('Creating indexes...');
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_shortId_key" ON "public"."Notification"("shortId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_notificationId_userId_key" ON "public"."NotificationRead"("notificationId", "userId");`;
    
    // Add foreign keys (only if they don't exist)
    console.log('Adding foreign key constraints...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "public"."Notification" 
        ADD CONSTRAINT "Notification_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('  - Notification FK already exists or created');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "public"."NotificationRead" 
        ADD CONSTRAINT "NotificationRead_notificationId_fkey" 
        FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('  - NotificationRead notification FK already exists or created');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "public"."NotificationRead" 
        ADD CONSTRAINT "NotificationRead_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `;
    } catch (e) {
      console.log('  - NotificationRead user FK already exists or created');
    }
    
    // Test the schema
    console.log('Testing schema...');
    const userCount = await prisma.user.count();
    const notificationCount = await prisma.notification.count();
    const notificationReadCount = await prisma.notificationRead.count();
    
    console.log('✅ Database schema fixed successfully!');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Notifications: ${notificationCount}`);
    console.log(`   - NotificationReads: ${notificationReadCount}`);
    console.log('');
    console.log('🚀 You can now restart the development server.');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    console.log('');
    console.log('💡 Try running: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseSchema();

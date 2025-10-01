const { PrismaClient } = require('@prisma/client');

async function createNotificationTables() {
  const prisma = new PrismaClient();
  
  try {
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
    
    console.log('Creating indexes...');
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_shortId_key" ON "public"."Notification"("shortId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_notificationId_userId_key" ON "public"."NotificationRead"("notificationId", "userId");`;
    
    console.log('Adding foreign keys...');
    await prisma.$executeRaw`
      ALTER TABLE "public"."Notification" 
      ADD CONSTRAINT IF NOT EXISTS "Notification_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "public"."NotificationRead" 
      ADD CONSTRAINT IF NOT EXISTS "NotificationRead_notificationId_fkey" 
      FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "public"."NotificationRead" 
      ADD CONSTRAINT IF NOT EXISTS "NotificationRead_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    console.log('Testing tables...');
    const notificationCount = await prisma.notification.count();
    const notificationReadCount = await prisma.notificationRead.count();
    
    console.log(`✅ Success! Notification table has ${notificationCount} records`);
    console.log(`✅ Success! NotificationRead table has ${notificationReadCount} records`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createNotificationTables();

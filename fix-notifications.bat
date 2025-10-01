@echo off
echo Creating Notification tables...
echo.

REM Create and run the notification fix script
echo const { PrismaClient } = require('@prisma/client'); > fix_notifications_temp.js
echo. >> fix_notifications_temp.js
echo async function createNotificationTables() { >> fix_notifications_temp.js
echo   const prisma = new PrismaClient(); >> fix_notifications_temp.js
echo   try { >> fix_notifications_temp.js
echo     console.log('Creating Notification table...'); >> fix_notifications_temp.js
echo     await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "public"."Notification" ("id" TEXT NOT NULL, "shortId" INTEGER NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "isDeleted" BOOLEAN NOT NULL DEFAULT false, "createdById" TEXT, CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"));`; >> fix_notifications_temp.js
echo     console.log('Creating NotificationRead table...'); >> fix_notifications_temp.js
echo     await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "public"."NotificationRead" ("id" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id"));`; >> fix_notifications_temp.js
echo     console.log('Creating indexes...'); >> fix_notifications_temp.js
echo     await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Notification_shortId_key" ON "public"."Notification"("shortId");`; >> fix_notifications_temp.js
echo     await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_notificationId_userId_key" ON "public"."NotificationRead"("notificationId", "userId");`; >> fix_notifications_temp.js
echo     console.log('Adding foreign keys...'); >> fix_notifications_temp.js
echo     await prisma.$executeRaw`ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`; >> fix_notifications_temp.js
echo     await prisma.$executeRaw`ALTER TABLE "public"."NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;`; >> fix_notifications_temp.js
echo     await prisma.$executeRaw`ALTER TABLE "public"."NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`; >> fix_notifications_temp.js
echo     console.log('Testing tables...'); >> fix_notifications_temp.js
echo     const count = await prisma.notification.count(); >> fix_notifications_temp.js
echo     console.log(`✅ Success! Notification table created with ${count} records`); >> fix_notifications_temp.js
echo   } catch (error) { >> fix_notifications_temp.js
echo     console.error('❌ Error:', error.message); >> fix_notifications_temp.js
echo   } finally { >> fix_notifications_temp.js
echo     await prisma.$disconnect(); >> fix_notifications_temp.js
echo   } >> fix_notifications_temp.js
echo } >> fix_notifications_temp.js
echo createNotificationTables(); >> fix_notifications_temp.js

echo Running notification table creation...
node fix_notifications_temp.js

echo Cleaning up...
del fix_notifications_temp.js

echo.
echo Done! You can now test the notification system.
pause

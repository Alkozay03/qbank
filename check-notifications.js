const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    console.log('📋 Checking notifications...');
    
    const notifications = await prisma.notification.findMany({
      include: {
        readReceipts: true
      }
    });
    
    console.log(`Found ${notifications.length} notifications:`);
    notifications.forEach(n => {
      console.log(`- ID: ${n.id.slice(0, 8)}... | ShortId: ${n.shortId} | Title: ${n.title} | Deleted: ${n.isDeleted} | ReadReceipts: ${n.readReceipts.length}`);
    });
    
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    console.log(`\n👤 Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u.email} (ID: ${u.id.slice(0, 8)}...)`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();

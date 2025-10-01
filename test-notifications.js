// Test notification count
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('Testing notification count...');
    
    // Check if the notification table exists and has data
    const notificationCount = await prisma.notification.count();
    console.log('Total notifications:', notificationCount);
    
    // Check if the NotificationRead table exists
    const readReceiptCount = await prisma.notificationRead.count();
    console.log('Total read receipts:', readReceiptCount);
    
  } catch (error) {
    console.error('Error testing notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
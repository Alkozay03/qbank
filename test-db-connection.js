const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Test if User table exists and has updatedAt column
    try {
      const userCount = await prisma.user.count();
      console.log(`✓ User table exists with ${userCount} users`);
    } catch (e) {
      console.log('✗ User table issue:', e.message);
    }
    
    // Test if Notification tables exist
    try {
      const notificationCount = await prisma.notification.count();
      console.log(`✓ Notification table exists with ${notificationCount} notifications`);
    } catch (e) {
      console.log('✗ Notification table issue:', e.message);
    }
    
    try {
      const readCount = await prisma.notificationRead.count();
      console.log(`✓ NotificationRead table exists with ${readCount} reads`);
    } catch (e) {
      console.log('✗ NotificationRead table issue:', e.message);
    }
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

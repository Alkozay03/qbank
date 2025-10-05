const { PrismaClient } = require('@prisma/client');

// Test direct connection (not pooled)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_DATABASE_URL
    }
  },
  log: ['error', 'warn'],
});

async function testDirectConnection() {
  console.log('Testing DIRECT database connection...');
  console.log('DIRECT_DATABASE_URL target:', process.env.DIRECT_DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  try {
    const result = await prisma.$executeRaw`SELECT 1 as test`;
    console.log('✅ Direct database connection successful:', result);
    
    const questionCount = await prisma.question.count();
    console.log('✅ Question count via direct connection:', questionCount);
    
  } catch (error) {
    console.error('❌ Direct database connection also failed:');
    console.error('Error message:', error.message);
    
    if (error.message.includes("Can't reach database") || error.message.includes("connection")) {
      console.error('\n🔍 Both pooled and direct connections fail - Supabase database is likely paused or down.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDirectConnection();
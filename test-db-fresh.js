// Fresh database connection test
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Testing database connection...');
    console.log('📍 Using DATABASE_URL from .env.local');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    // Test question count
    const questionCount = await prisma.question.count();
    console.log(`✅ Found ${questionCount} questions in database`);
    
    console.log('🎉 Database is fully operational!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n🔍 This is a connection error. Troubleshooting:');
      console.error('1. Check if Supabase project is active (not paused)');
      console.error('2. Verify connection string format');
      console.error('3. Check network/firewall settings');
      console.error('4. Try direct connection instead of pooler');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
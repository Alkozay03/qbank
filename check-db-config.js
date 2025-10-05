// Test session pooler connection
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const primaryDatabaseUrl = process.env.DATABASE_URL?.trim();
const fallbackDatabaseUrl = process.env.LOCAL_DATABASE_URL?.trim(); 
const preferLocalEnv = process.env.PREFER_LOCAL_DB?.trim()?.toLowerCase();
const isVercelRuntime = Boolean(process.env.VERCEL);

console.log('🔍 Environment variable check:');
console.log('DATABASE_URL exists:', !!primaryDatabaseUrl);
console.log('DATABASE_URL value:', primaryDatabaseUrl ? 'SET' : 'NOT SET');
console.log('LOCAL_DATABASE_URL exists:', !!fallbackDatabaseUrl);
console.log('PREFER_LOCAL_DB:', preferLocalEnv);
console.log('VERCEL runtime:', isVercelRuntime);

const shouldPreferLocal = Boolean(
  fallbackDatabaseUrl &&
    !isVercelRuntime &&
    (
      preferLocalEnv === 'true' ||
      (!primaryDatabaseUrl ||
        (!preferLocalEnv && /supabase\.com|amazonaws\.com/i.test(primaryDatabaseUrl)))
    )
);

console.log('Should prefer local:', shouldPreferLocal);

const resolvedDatabaseUrl = shouldPreferLocal
  ? fallbackDatabaseUrl
  : primaryDatabaseUrl?.length
  ? primaryDatabaseUrl
  : fallbackDatabaseUrl;

console.log('Resolved URL includes pooler:', !!resolvedDatabaseUrl?.includes('pooler'));
console.log('Final resolved URL:', resolvedDatabaseUrl ? 'RESOLVED' : 'NOT RESOLVED');

// Test actual connection
async function testConnection() {
  const prisma = new PrismaClient();
  try {
    console.log('\n🔄 Testing session pooler connection...');
    await prisma.$connect();
    console.log('✅ Session pooler connection successful!');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users`);
  } catch (error) {
    console.error('❌ Session pooler connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
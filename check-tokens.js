// check-tokens.js - Check what tokens exist in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTokens() {
  console.log('\n🔍 Checking all verification tokens in database...\n');
  
  const tokens = await prisma.verificationToken.findMany({
    orderBy: { expires: 'desc' },
  });
  
  console.log(`Found ${tokens.length} token(s):\n`);
  
  tokens.forEach((token, i) => {
    const now = new Date();
    const isExpired = token.expires < now;
    console.log(`${i + 1}. Identifier: ${token.identifier}`);
    console.log(`   Token: ${token.token.substring(0, 20)}...`);
    console.log(`   Expires: ${token.expires.toISOString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
    console.log(`   Time left: ${Math.round((token.expires - now) / 1000 / 60)} minutes\n`);
  });
  
  if (tokens.length === 0) {
    console.log('⚠️ No tokens found in database!\n');
  }
  
  await prisma.$disconnect();
}

checkTokens().catch(console.error);

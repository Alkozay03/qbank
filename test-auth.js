require('dotenv').config({ path: '.env.local' });

// Test what the auth function returns
const { auth } = require('./auth.config.ts');

async function testAuth() {
  console.log('Testing authentication...');
  
  try {
    const session = await auth();
    console.log('Session:', session);
    console.log('User ID:', session?.user?.id);
    console.log('User Email:', session?.user?.email);
    
    if (!session?.user?.email || !session?.user?.id) {
      console.log('❌ NO VALID SESSION - This explains why APIs return empty data!');
      console.log('The user needs to be logged in for the APIs to work.');
    } else {
      console.log('✅ Valid session found');
    }
  } catch (error) {
    console.error('Auth test failed:', error.message);
  }
}

testAuth();
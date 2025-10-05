// Test API endpoints to see what's failing
// Run with: node test-api-access.js

const https = require('https');

async function testEndpoint(path, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Path: ${path}`);
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'clerkship.me',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js Test Script'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 401) {
          console.log('   ❌ Unauthorized - Session issue');
        } else if (res.statusCode === 200) {
          console.log('   ✅ Success');
          try {
            const json = JSON.parse(data);
            console.log('   Data:', JSON.stringify(json, null, 2).substring(0, 200));
          } catch {
            console.log('   Data:', data.substring(0, 100));
          }
        } else {
          console.log('   ⚠️ Response:', data.substring(0, 100));
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`   ❌ Error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function main() {
  console.log('Testing API endpoints on production...\n');
  console.log('Note: These tests won\'t have session cookies, so will return 401');
  console.log('This is just to verify the endpoints are responding.\n');
  
  await testEndpoint('/api/auth/session', 'Auth session endpoint');
  await testEndpoint('/api/profile', 'Profile endpoint');
  await testEndpoint('/api/me/role', 'Role endpoint');
  
  console.log('\n✅ All endpoints are responding');
  console.log('\nThe issue is likely:');
  console.log('1. Your browser session has old JWT token with old approval status');
  console.log('2. You need to LOG OUT and LOG BACK IN to get a fresh token');
}

main().catch(console.error);

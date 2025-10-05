const http = require('http');

function testAPI(path, port = 3000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': 'authjs.session-token=test; authjs.csrf-token=test'  // Try with auth headers
      }
    };

    console.log(`Testing: http://localhost:${port}${path}`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        console.log(`Response:`, data);
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      console.error(`Request failed: ${err.message}`);
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Dashboard Stats API ===');
  await testAPI('/api/year4/dashboard-stats');
  
  console.log('\n=== Testing without auth ===');
  // Test without cookies to see if it's an auth issue
  const options2 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/year4/dashboard-stats',
    method: 'GET'
  };
  
  return new Promise((resolve) => {
    const req2 = http.request(options2, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`No Auth - Status: ${res.statusCode}`);
        console.log(`No Auth - Response:`, data);
        resolve();
      });
    });
    req2.on('error', (err) => console.error('No auth test failed:', err.message));
    req2.end();
  });
}

runTests().catch(console.error);
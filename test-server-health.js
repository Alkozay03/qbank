// Simple server health check
async function testServer() {
  try {
    console.log('🔄 Testing server health...');
    
    // Test basic server response
    const response = await fetch('http://localhost:3000/api/auth/session');
    console.log('Server status:', response.status);
    
    if (response.ok) {
      console.log('✅ Server is running and responding!');
      
      // Test our new Question Mode API
      console.log('\n🧪 Testing Question Mode APIs...');
      
      try {
        const modeResponse = await fetch('http://localhost:3000/api/quiz/mode-counts');
        console.log('Mode counts API status:', modeResponse.status);
        
        if (modeResponse.ok) {
          const modeData = await modeResponse.json();
          console.log('✅ Mode counts API working:', modeData);
        } else {
          console.log('❌ Mode counts API failed');
        }
      } catch (error) {
        console.error('❌ Mode counts API error:', error.message);
      }
      
      try {
        const filterResponse = await fetch('http://localhost:3000/api/quiz/filtered-counts');
        console.log('Filtered counts API status:', filterResponse.status);
        
        if (filterResponse.ok) {
          const filterData = await filterResponse.json();
          console.log('✅ Filtered counts API working:', filterData);
        } else {
          console.log('❌ Filtered counts API failed');
        }
      } catch (error) {
        console.error('❌ Filtered counts API error:', error.message);
      }
      
    } else {
      console.log('❌ Server not responding properly');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testServer();
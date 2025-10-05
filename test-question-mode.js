// Test the new Question Mode system  
// Using Node.js built-in fetch (available in Node 18+)

async function testQuestionModeSystem() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testing Question Mode System...\n');
  
  try {
    // Test 1: Check filtered counts endpoint
    console.log('1️⃣ Testing filtered counts API...');
    const filtersResponse = await fetch(`${baseURL}/api/quiz/filtered-counts?modes=unused&tags=&subjects=`);
    if (filtersResponse.ok) {
      const filtersData = await filtersResponse.json();
      console.log('✅ Filtered counts API working:', filtersData);
    } else {
      console.log('❌ Filtered counts API failed:', filtersResponse.status);
    }
    
    // Test 2: Check mode counts endpoint  
    console.log('\n2️⃣ Testing mode counts API...');
    const modeResponse = await fetch(`${baseURL}/api/quiz/mode-counts`);
    if (modeResponse.ok) {
      const modeData = await modeResponse.json();
      console.log('✅ Mode counts API working:', modeData);
    } else {
      console.log('❌ Mode counts API failed:', modeResponse.status);
    }
    
    // Test 3: Check tag counts endpoint
    console.log('\n3️⃣ Testing tag counts API...');
    const tagResponse = await fetch(`${baseURL}/api/quiz/tag-counts`);
    if (tagResponse.ok) {
      const tagData = await tagResponse.json();
      console.log('✅ Tag counts API working:', tagData);
    } else {
      console.log('❌ Tag counts API failed:', tagResponse.status);
    }
    
    console.log('\n🎉 Question Mode System test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on localhost:3000');
  }
}

testQuestionModeSystem();
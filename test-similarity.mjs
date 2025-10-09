// Test script for semantic similarity detection
// Run with: node --loader ts-node/esm test-similarity.mjs

import { calculateSemanticSimilarity } from "./src/lib/similarity.ts";

const testCases = [
  {
    name: "Very Similar Medical Questions",
    text1: "What is the first-line treatment for acute myocardial infarction?",
    text2: "What is the initial treatment for acute heart attack?",
    expectedSimilarity: "> 70%",
  },
  {
    name: "Somewhat Similar Questions",
    text1: "What are the symptoms of pneumonia in adults?",
    text2: "What are the clinical features of bacterial pneumonia?",
    expectedSimilarity: "60-70%",
  },
  {
    name: "Different Medical Topics",
    text1: "What is the treatment for diabetes mellitus?",
    text2: "What are the risk factors for stroke?",
    expectedSimilarity: "< 50%",
  },
  {
    name: "Exact Duplicate",
    text1: "What is the mechanism of action of aspirin?",
    text2: "What is the mechanism of action of aspirin?",
    expectedSimilarity: "~100%",
  },
];

async function runTests() {
  console.log("🧪 Testing Semantic Similarity Detection\n");
  console.log("Using OpenAI text-embedding-3-small model\n");
  console.log("=" .repeat(80));

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Text 1: "${testCase.text1}"`);
    console.log(`   Text 2: "${testCase.text2}"`);
    console.log(`   Expected: ${testCase.expectedSimilarity}`);
    
    try {
      const similarity = await calculateSemanticSimilarity(
        testCase.text1,
        testCase.text2
      );
      
      console.log(`   ✅ Result: ${similarity}%`);
      
      // Determine if it would trigger duplicate alert (≥50%)
      if (similarity >= 50) {
        console.log(`   ⚠️  Would trigger duplicate alert!`);
      } else {
        console.log(`   ✓  No duplicate alert (below 50% threshold)`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    console.log("   " + "-".repeat(76));
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ All tests complete!\n");
}

runTests().catch(console.error);

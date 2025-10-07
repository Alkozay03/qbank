/* eslint-disable no-console */
// Script to check existing questions and mark one as Year 4
// This is a utility script, console.log is appropriate here
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Checking Questions in Database ===\n");
  
  // Count total questions
  const questionCount = await prisma.question.count();
  console.log(`Total questions: ${questionCount}`);
  
  if (questionCount === 0) {
    console.log("\n❌ No questions found in database!");
    console.log("You'll need to create a question first via the admin interface.");
    return;
  }
  
  // Get first question with occurrences
  const firstQuestion = await prisma.question.findFirst({
    include: {
      occurrences: true,
      questionTags: {
        include: {
          tag: true
        }
      }
    }
  });
  
  if (!firstQuestion) {
    console.log("\n❌ Could not fetch question details!");
    return;
  }
  
  console.log(`\n✅ Found question ID: ${firstQuestion.id}`);
  console.log(`Custom ID: ${firstQuestion.customId || 'N/A'}`);
  console.log(`Question: ${firstQuestion.text.substring(0, 100)}...`);
  console.log(`\nCurrent occurrences: ${firstQuestion.occurrences.length}`);
  
  if (firstQuestion.occurrences.length > 0) {
    console.log("\nOccurrence details:");
    firstQuestion.occurrences.forEach((occ, index) => {
      console.log(`  ${index + 1}. Year: "${occ.year}", Rotation: "${occ.rotation}"`);
    });
  }
  
  // Check if already has Y4 occurrence
  const hasY4 = firstQuestion.occurrences.some(occ => occ.year === 'Y4');
  
  if (hasY4) {
    console.log("\n✅ This question already has a Year 4 (Y4) occurrence!");
    console.log("The system is working correctly.");
  } else {
    console.log("\n⚠️ This question does NOT have a Year 4 occurrence.");
    console.log("Adding Y4 occurrence now...\n");
    
    // Add Y4 occurrence
    const newOccurrence = await prisma.questionOccurrence.create({
      data: {
        questionId: firstQuestion.id,
        year: 'Y4',
        rotation: 'im', // Default to IM rotation
        orderIndex: firstQuestion.occurrences.length,
      }
    });
    
    console.log(`✅ Added Y4 occurrence: ${newOccurrence.id}`);
    console.log(`   Year: ${newOccurrence.year}`);
    console.log(`   Rotation: ${newOccurrence.rotation}`);
    console.log(`   Order Index: ${newOccurrence.orderIndex}`);
    
    console.log("\n🎉 Question is now marked as Year 4!");
    console.log("You should now be able to see it in Year 4 Admin → View Questions");
  }
  
  // Show summary
  console.log("\n=== Summary ===");
  console.log(`Question ID: ${firstQuestion.id}`);
  console.log(`Custom ID: ${firstQuestion.customId || 'N/A'}`);
  console.log(`Has Y4 occurrence: ${hasY4 ? 'Yes (was already there)' : 'Yes (just added)'}`);
  console.log("\n✅ System test complete!");
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
  })
  .finally(() => prisma.$disconnect());

// Test the batch similarity endpoint logic locally
import prisma from './src/lib/db.ts';

async function testBatchLogic() {
  try {
    console.log('Testing batch similarity logic locally...\n');
    
    const yearContext = 'year4';
    const hoursAgo = 24;
    
    // Calculate date range
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursAgo);
    const endDate = new Date();
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const yearNumber = yearContext === "year4" ? "4" : "5";
    const yearWithPrefix = yearContext === "year4" ? "Y4" : "Y5";
    
    console.log(`Looking for yearCaptured in ["${yearNumber}", "${yearWithPrefix}"]`);
    
    const newQuestions = await prisma.question.findMany({
      where: {
        yearCaptured: {
          in: [yearNumber, yearWithPrefix],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        text: { not: null },
      },
      select: {
        id: true,
        customId: true,
        text: true,
        createdAt: true,
        questionTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    console.log(`\nFound ${newQuestions.length} questions:\n`);
    
    for (const q of newQuestions) {
      const rotationTag = q.questionTags.find(qt => qt.tag.type === 'ROTATION');
      const rotation = rotationTag?.tag.value ?? 'No Rotation';
      
      console.log(`Q${q.customId}:`);
      console.log(`  Created: ${q.createdAt.toISOString()}`);
      console.log(`  Rotation: ${rotation}`);
      console.log(`  Tags: ${q.questionTags.length}`);
      console.log(`  Text length: ${q.text?.length || 0}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBatchLogic();

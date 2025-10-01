// Create a test question with proper tags
export async function POST() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    // Create tags first
    const rotationTag = await prisma.tag.upsert({
      where: { type_value: { type: 'ROTATION', value: 'Internal Medicine' } },
      update: {},
      create: { type: 'ROTATION', value: 'Internal Medicine' }
    });
    
    const resourceTag = await prisma.tag.upsert({
      where: { type_value: { type: 'RESOURCE', value: 'UWorld - Step 1' } },
      update: {},
      create: { type: 'RESOURCE', value: 'UWorld - Step 1' }
    });
    
    // Create a test question
    const question = await prisma.question.create({
      data: {
        text: 'A 65-year-old man with hypertension presents with progressive dyspnea and bilateral leg swelling. Which drug provides mortality benefit in HFrEF?',
        explanation: 'Evidence-based beta blockers (carvedilol, metoprolol succinate, bisoprolol) improve survival in HFrEF.',
        answers: {
          create: [
            { text: 'Furosemide', isCorrect: false },
            { text: 'Digoxin', isCorrect: false },
            { text: 'Carvedilol', isCorrect: true },
            { text: 'Diltiazem', isCorrect: false },
            { text: 'Hydralazine', isCorrect: false }
          ]
        },
        questionTags: {
          create: [
            { tagId: rotationTag.id },
            { tagId: resourceTag.id }
          ]
        }
      }
    });

    const modeTag = await prisma.tag.upsert({
      where: { type_value: { type: 'MODE', value: 'unused' } },
      update: {},
      create: { type: 'MODE', value: 'unused' }
    });

    await prisma.questionTag.create({
      data: { questionId: question.id, tagId: modeTag.id }
    });
    
    return new Response(JSON.stringify({
      success: true,
      questionId: question.id,
      message: 'Test question created'
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: String(error)
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}

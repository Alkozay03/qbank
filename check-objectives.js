const { PrismaClient } = require('@prisma/client');

async function checkEducationalObjectives() {
  const prisma = new PrismaClient();
  
  try {
    // Count total questions
    const totalQuestions = await prisma.question.count();
    console.warn('Total questions:', totalQuestions);
    
    // Count questions with objectives
    const withObjectives = await prisma.question.count({
      where: {
        objective: {
          not: null
        }
      }
    });
    console.warn('Questions with objectives:', withObjectives);
    
    // Count questions with the default objective text
    const withDefaultObjective = await prisma.question.count({
      where: {
        objective: "This section summarizes the key takeaway for rapid review."
      }
    });
    console.warn('Questions with default objective text:', withDefaultObjective);
    
    // Get sample of objectives
    const sampleObjectives = await prisma.question.findMany({
      where: {
        objective: {
          not: null
        }
      },
      select: {
        id: true,
        customId: true,
        objective: true
      },
      take: 5
    });
    
    console.warn('Sample objectives:');
    sampleObjectives.forEach(q => {
      console.warn(`Question ${q.customId || q.id}:`, q.objective?.substring(0, 100) + '...');
    });
    
    // Get latest quiz questions
    const latestQuiz = await prisma.quiz.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          take: 3,
          include: {
            question: {
              select: {
                id: true,
                customId: true,
                objective: true
              }
            }
          }
        }
      }
    });
    
    if (latestQuiz) {
      console.warn('Latest quiz questions objectives:');
      latestQuiz.items.forEach(item => {
        console.warn(`Question ${item.question.customId || item.question.id}:`, item.question.objective?.substring(0, 100) + '...');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEducationalObjectives();

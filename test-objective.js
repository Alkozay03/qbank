const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Find first question with objective
    const questionWithObjective = await prisma.question.findFirst({
      where: {
        objective: {
          not: null
        }
      },
      select: {
        id: true,
        customId: true,
        objective: true,
        questionTags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    console.log('Question with objective:', questionWithObjective);
    
    // Count questions with objectives
    const objectiveCount = await prisma.question.count({
      where: {
        objective: {
          not: null
        }
      }
    });
    
    console.log('Total questions with objectives:', objectiveCount);
    
    // Check latest quiz
    const latestQuiz = await prisma.quiz.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        items: {
          take: 1,
          select: {
            question: {
              select: {
                objective: true,
                questionTags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('Latest quiz first question objective:', latestQuiz?.items[0]?.question?.objective);
    console.log('Latest quiz first question tags:', latestQuiz?.items[0]?.question?.questionTags);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

// Simple script to check questions in database
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.warn("Checking questions in database...");
  
  const questionCount = await prisma.question.count();
  console.warn(`Total questions: ${questionCount}`);
  
  if (questionCount > 0) {
    const firstQuestion = await prisma.question.findFirst({
      include: {
        questionTags: {
          include: {
            tag: true
          }
        },
        answers: true
      }
    });
    console.warn("First question:", JSON.stringify(firstQuestion, null, 2));
  }
  
  // Check tags
  const tags = await prisma.tag.findMany();
  console.warn(`Total tags: ${tags.length}`);
  
  // Check by tag type
  const tagsByType = await prisma.tag.groupBy({
    by: ['type'],
    _count: {
      type: true
    }
  });
  console.warn("Tags by type:", tagsByType);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

// Script to restore default FAQs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultFAQs = [
  {
    title: "How do I take a quiz?",
    description: "Navigate to the 'Quiz' section and click on 'Start Quiz'. You'll be presented with multiple choice questions. Select your answer and click 'Submit' to move to the next question. You can flag questions for review and navigate back to them before finishing.",
    orderIndex: 1
  },
  {
    title: "Can I review my answers after completing a quiz?",
    description: "Yes! After completing a quiz, you'll see a detailed explanation for each question along with the correct answers. This helps you understand the reasoning behind each question and learn from any mistakes.",
    orderIndex: 2
  },
  {
    title: "What do the different tags and filters mean?",
    description: "Questions are categorized by:\n• System: Body system (e.g., Cardiovascular, Respiratory)\n• Subject: Medical specialty (e.g., Internal Medicine, Surgery)\n• Resource: Textbook or reference source\n• Rotation: Clinical rotation year\n\nUse these filters to focus on specific topics during your study sessions.",
    orderIndex: 3
  },
  {
    title: "How does the marking/flagging system work?",
    description: "You can flag questions during a quiz by clicking the flag icon. Flagged questions are saved for easy review later. This feature helps you identify questions you want to revisit or found particularly challenging.",
    orderIndex: 4
  },
  {
    title: "What happens if I reset my data?",
    description: "Resetting your data will permanently delete all your quiz progress, scores, and flagged questions. This action cannot be undone. Only reset if you want to start completely fresh with your learning progress.",
    orderIndex: 5
  },
  {
    title: "How are questions organized by year and rotation?",
    description: "Questions are tagged with the academic year and clinical rotation they came from. This helps you focus on material relevant to your current rotation or review questions from previous years. You can filter by specific years or rotations in the quiz settings.",
    orderIndex: 6
  }
];

async function restoreFAQs() {
  try {
    console.log('Checking existing FAQs...');
    const existingCount = await prisma.helpItem.count();
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing FAQs. Skipping restoration.`);
      return;
    }

    console.log('No FAQs found. Creating default FAQs...');
    
    for (const faq of defaultFAQs) {
      await prisma.helpItem.create({
        data: faq
      });
    }
    
    console.log(`Successfully created ${defaultFAQs.length} default FAQs!`);
  } catch (error) {
    console.error('Error restoring FAQs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreFAQs();
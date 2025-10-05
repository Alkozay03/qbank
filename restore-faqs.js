// Script to restore default FAQs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultFAQs = [
  {
    title: "How do I take a quiz?",
    description: "**Getting Started:**\nNavigate to the **Quiz** section and click on **Start Quiz**. You'll be presented with multiple choice questions.\n\n**Taking the Quiz:**\nSelect your answer and click **Submit** to move to the next question. You can **flag questions** for review and navigate back to them before finishing.\n\n**Tips:**\n• Use the navigation bar to jump between questions\n• Flag challenging questions for later review\n• Take your time - there's no time limit",
    orderIndex: 1
  },
  {
    title: "Can I review my answers after completing a quiz?",
    description: "**Yes! Post-Quiz Review is Available**\n\nAfter completing a quiz, you'll see a **detailed explanation** for each question along with the **correct answers**.\n\n**What You'll See:**\n• Detailed explanations for each question\n• Your selected answer vs. the correct answer\n• Educational content to help you learn\n\nThis helps you understand the reasoning behind each question and **learn from any mistakes** for future improvement.",
    orderIndex: 2
  },
  {
    title: "What do the different tags and filters mean?",
    description: "**Question Categories:**\nQuestions are organized by several important filters to help you study effectively.\n\n**Available Filters:**\n• **System:** Body system (e.g., Cardiovascular, Respiratory)\n• **Subject:** Medical specialty (e.g., Internal Medicine, Surgery)\n• **Resource:** Textbook or reference source\n• **Rotation:** Clinical rotation year\n\n**How to Use:**\nUse these filters to **focus on specific topics** during your study sessions. This allows you to target areas where you need the most practice.",
    orderIndex: 3
  },
  {
    title: "How does the marking/flagging system work?",
    description: "**Flagging Questions:**\nYou can **flag questions** during a quiz by clicking the **flag icon** next to each question.\n\n**Benefits:**\n• Flagged questions are **saved for easy review** later\n• Helps you identify questions you want to revisit\n• Perfect for marking **particularly challenging** questions\n\n**Review Process:**\nAccess your flagged questions anytime to review and practice the concepts you found most difficult.",
    orderIndex: 4
  },
  {
    title: "What happens if I reset my data?",
    description: "**⚠️ Warning - Permanent Action**\n\nResetting your data will **permanently delete** all of the following:\n• All your quiz progress\n• Your scores and performance history\n• All flagged questions\n• Study session data\n\n**Important:**\nThis action **cannot be undone**. Only reset if you want to start completely fresh with your learning progress.\n\n**Before Resetting:**\nConsider if you really need a full reset, as you'll lose all your valuable progress data.",
    orderIndex: 5
  },
  {
    title: "How are questions organized by year and rotation?",
    description: "**Academic Organization:**\nQuestions are tagged with the **academic year** and **clinical rotation** they came from.\n\n**Benefits:**\n• Focus on material relevant to your **current rotation**\n• Review questions from **previous years** for comprehensive study\n• Target specific rotations you want to improve in\n\n**How to Filter:**\nYou can filter by **specific years** or **rotations** in the quiz settings to customize your study experience based on your current needs.",
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
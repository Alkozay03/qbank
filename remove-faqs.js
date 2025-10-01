// Remove default FAQs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDefaultFAQs() {
  try {
    console.log('Removing all current FAQs...');
    const result = await prisma.helpItem.deleteMany({});
    console.log(`Deleted ${result.count} FAQ items.`);
  } catch (error) {
    console.error('Error removing FAQs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDefaultFAQs();
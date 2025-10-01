// Check existing help items
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHelpItems() {
  try {
    const allItems = await prisma.helpItem.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('All help items in database:');
    console.log('Count:', allItems.length);
    console.log('Items:');
    allItems.forEach((item, index) => {
      console.log(`\n${index + 1}. Title: "${item.title}"`);
      console.log(`   Published: ${item.isPublished}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log(`   Content preview: "${item.description.substring(0, 100)}..."`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHelpItems();
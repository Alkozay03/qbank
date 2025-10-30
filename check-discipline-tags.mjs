import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tags = await prisma.tag.findMany({
  where: { type: 'discipline' },
  select: { value: true },
  orderBy: { value: 'asc' }
});

console.log('Discipline tags in database:');
console.log(JSON.stringify(tags, null, 2));

await prisma.$disconnect();

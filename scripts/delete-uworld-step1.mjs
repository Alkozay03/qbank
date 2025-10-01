import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all questions tagged as RESOURCE = 'UWorld - Step 1'
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT q.id
    FROM "Question" q
    JOIN "QuestionTag" qt ON qt."questionId" = q.id
    JOIN "Tag" t ON t.id = qt."tagId"
    WHERE t.type = 'RESOURCE'::"TagType" AND t.value = 'UWorld - Step 1'
  `);
  const ids = (rows ?? []).map(r => r.id);
  if (!ids.length) {
    console.warn('No UWorld - Step 1 questions found.');
    return;
  }

  console.warn('Deleting', ids.length, 'questions...');
  // Delete in chunks to avoid parameter limits
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const batch = ids.slice(i, i + chunk);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "Question" WHERE id IN (${Prisma.join(batch)})
    `);
  }
  console.warn('Done.');
}

main().finally(async () => { await prisma.$disconnect(); });

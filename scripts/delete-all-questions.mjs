import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw(Prisma.sql`SELECT id FROM "Question"`);
  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) {
    console.warn('No questions found.');
    return;
  }
  console.warn('Deleting questions:', ids.length);
  const chunk = 200;
  for (let i = 0; i < ids.length; i += chunk) {
    const batch = ids.slice(i, i + chunk);
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Question" WHERE id IN (${Prisma.join(batch)})`);
  }
  console.warn('Done.');
}

main().finally(async () => { await prisma.$disconnect(); });

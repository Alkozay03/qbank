import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw(Prisma.sql`
    select q."customId", q.id, q.stem, q."createdAt"
    from "Question" q
    join "QuestionTag" qt on qt."questionId" = q.id
    join "Tag" t on t.id = qt."tagId"
    where t.type = 'RESOURCE' and t.value = 'UWorld - Step 1' and q."customId" is not null
    order by q."createdAt" desc
    limit 200
  `);
  console.warn(JSON.stringify(rows, null, 2));
}

main().finally(async () => { await prisma.$disconnect(); });

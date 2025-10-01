import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s).replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (str.includes(',') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function main() {
  const rows = await prisma.$queryRaw(Prisma.sql`
    select q."customId", q.id, r.name as rotation, q."createdAt", q.stem
    from "Question" q
    join "QuestionTag" qt on qt."questionId" = q.id
    join "Tag" t on t.id = qt."tagId"
    join "Rotation" r on r.id = q."rotationId"
    where t.type = 'RESOURCE' and t.value = 'UWorld - Step 1' and q."customId" is not null
    order by q."createdAt" desc
  `);

  const header = ['customId','questionId','rotation','createdAt','stemPreview'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const stemPreview = (r.stem ? String(r.stem).split('\n')[0].slice(0, 140) : '');
    const vals = [r.customId, r.id, r.rotation, r.createdAt?.toISOString?.() ?? r.createdAt, stemPreview].map(csvEscape);
    lines.push(vals.join(','));
  }

  const outPath = path.join(process.cwd(), 'uworld_step1_questions.csv');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.warn('Wrote CSV:', outPath, 'rows:', rows.length);
}

main().finally(async () => { await prisma.$disconnect(); });

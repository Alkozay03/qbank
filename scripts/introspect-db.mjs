import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function columns(table) {
  const rows = await prisma.$queryRawUnsafe(
    `select column_name, data_type, is_nullable, column_default
     from information_schema.columns
     where table_schema = current_schema() and table_name = $1
     order by ordinal_position`,
    table
  );
  return rows;
}

async function sample(table, limit = 5) {
  try {
    const rows = await prisma.$queryRawUnsafe(`select * from "${table}" limit ${Number(limit)||5}`);
    return rows;
  } catch {
    return [];
  }
}

async function main() {
  for (const t of [ 'Question', 'Choice', 'Rotation', 'Tag', 'QuestionTag' ]) {
    const cols = await columns(t);
    console.warn(`\n== ${t} ==`);
    for (const c of cols) console.warn(`${c.column_name} ${c.data_type} ${c.is_nullable} ${c.column_default ?? ''}`.trim());
    const rows = await sample(t, 3);
    if (rows?.length) console.warn('sample:', rows);
  }
}

main().finally(async () => { await prisma.$disconnect(); });

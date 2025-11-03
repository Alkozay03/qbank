import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      AND (table_name LIKE '%nswer%' OR table_name LIKE '%hoice%')
      ORDER BY table_name
    `;
    console.log('Tables with Answer or Choice:', tables);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

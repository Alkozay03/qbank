/**
 * STEP-BY-STEP MIGRATION GUIDE
 * This will help you migrate from Supabase to Neon safely
 */

import { PrismaClient } from '@prisma/client';

// Your current database (Supabase)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.wmlizlldqmsbvguhftgi:K12482s%24031231%5E@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connect_timeout=15'
    }
  }
});

// Your new database (Neon)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_tYDfIr2MP7mw@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║     🚀 MIGRATION TO NEON - STEP BY STEP GUIDE                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function checkMigrationStatus() {
  try {
    // Test Supabase connection
    console.log('✅ Step 1: Testing Supabase connection...');
    await sourceDb.$queryRaw`SELECT 1`;
    console.log('   ✓ Connected to Supabase!\n');

    // Test Neon connection
    console.log('✅ Step 2: Testing Neon connection...');
    await targetDb.$queryRaw`SELECT 1`;
    console.log('   ✓ Connected to Neon!\n');

    // Count data in Supabase
    console.log('✅ Step 3: Checking your Supabase data...');
    const tables = await sourceDb.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        rowcount
      FROM (
        SELECT 
          schemaname,
          tablename,
          (xpath('/row/count/text()', 
            query_to_xml(format('select count(*) as count from %I.%I', schemaname, tablename), 
            false, true, '')))[1]::text::int as rowcount
        FROM pg_tables
        WHERE schemaname = 'public'
      ) t
      ORDER BY rowcount DESC;
    `;
    
    console.log('   📊 Your database has:\n');
    for (const table of tables) {
      if (table.rowcount > 0) {
        console.log(`      ${table.tablename}: ${table.rowcount.toLocaleString()} rows`);
      }
    }
    console.log('');

    // Check if Neon has schema
    console.log('✅ Step 4: Checking if Neon has schema...');
    const neonTables = await targetDb.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `;
    
    const tableCount = Number(neonTables[0].count);
    
    if (tableCount === 0) {
      console.log('   ⚠️  Neon database is empty (no tables)\n');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║                    NEXT STEP FOR YOU:                          ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║ 1. Stop this script (it\'s done checking)                      ║');
      console.log('║ 2. I will create the schema on Neon for you                   ║');
      console.log('║ 3. Then we\'ll copy your data                                  ║');
      console.log('╚════════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log(`   ✓ Neon has ${tableCount} tables already\n`);
      
      // Check if Neon has data
      const neonData = await targetDb.question.count().catch(() => 0);
      if (neonData > 0) {
        console.log('   ⚠️  WARNING: Neon already has data!');
        console.log('   You might want to start fresh.\n');
      } else {
        console.log('   ✓ Neon has schema but no data yet\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                    READY TO COPY DATA!                         ║');
        console.log('╠════════════════════════════════════════════════════════════════╣');
        console.log('║ 1. Stop this script                                            ║');
        console.log('║ 2. I will start the data copy for you                         ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDon\'t worry! Just tell me what error you see.\n');
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

checkMigrationStatus();

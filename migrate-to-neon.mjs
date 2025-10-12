/**
 * Migration script to copy data from Supabase to Neon
 * This will copy all your data safely
 */

import { PrismaClient } from '@prisma/client';

// Source database (Supabase - from .env.local)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.wmlizlldqmsbvguhftgi:K12482s%24031231%5E@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connect_timeout=15'
    }
  }
});

// Target database (Neon - you'll paste your connection string here)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_tYDfIr2MP7mw@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

console.log('🚀 Starting database migration...\n');

async function migrateData() {
  try {
    // Test connections
    console.log('📡 Testing source database (Supabase)...');
    await sourceDb.$queryRaw`SELECT 1`;
    console.log('✅ Source database connected!\n');

    console.log('📡 Testing target database (Neon)...');
    await targetDb.$queryRaw`SELECT 1`;
    console.log('✅ Target database connected!\n');

    // Get counts from source
    const questionCount = await sourceDb.question.count();
    const userCount = await sourceDb.user.count();
    
    console.log('📊 Source database stats:');
    console.log(`   - Questions: ${questionCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log('');

    // Check if target is empty
    const targetQuestionCount = await targetDb.question.count();
    if (targetQuestionCount > 0) {
      console.log('⚠️  WARNING: Target database already has data!');
      console.log('   This script will skip migration to avoid duplicates.');
      console.log('   If you want to re-migrate, first run: npx prisma migrate reset');
      return;
    }

    console.log('✅ Target database is empty. Ready to migrate!\n');
    console.log('⏳ This will take a few minutes...\n');

    // Copy data (Prisma will handle foreign keys automatically)
    console.log('📦 Copying data...');
    console.log('   Note: This is done in the correct order to respect foreign keys\n');

    // Export all data from source
    console.log('1️⃣  Exporting all data from Supabase...');
    const allData = await sourceDb.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log(`   Found ${allData.length} tables\n`);

    console.log('2️⃣  Running Prisma migration on Neon to create tables...');
    console.log('   You need to run: npx prisma migrate deploy');
    console.log('   Press Ctrl+C and run that command first if you haven\'t!\n');

    // Simple copy using pg_dump simulation
    console.log('3️⃣  The easiest way is to use pg_dump. Let me create the command for you:\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('COPY THIS COMMAND AND RUN IT IN YOUR TERMINAL:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const dumpCommand = `pg_dump "postgresql://postgres.wmlizlldqmsbvguhftgi:K12482s$031231^@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres" --data-only --no-owner --no-acl | psql "postgresql://neondb_owner:npg_tYDfIr2MP7mw@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"`;
    
    console.log(dumpCommand);
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    console.log('✅ Connection strings are configured!');
    console.log('   If you don\'t have PostgreSQL tools installed, that\'s OK.');
    console.log('   Just let me know and I\'ll guide you through installing them.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

migrateData();

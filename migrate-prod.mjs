#!/usr/bin/env node

// Production database migration script
import { execSync } from 'child_process';

// Set production database URL
process.env.DATABASE_URL = "postgresql://postgres.wmlizlldqmsbvguhftgi:K12482s%24031231%5E@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=1";
process.env.DIRECT_DATABASE_URL = "postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?schema=public";

try {
  console.log('🔄 Running production database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Production migrations completed');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
}
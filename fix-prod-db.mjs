#!/usr/bin/env node

// Fix production database migrations
import { execSync } from 'child_process';

// Set production database URL
process.env.DATABASE_URL = "postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?schema=public";

try {
  console.log('🔄 Resolving migration issues...');
  
  // Mark the failed migration as resolved
  execSync('npx prisma migrate resolve --applied 20240927_add_question_metadata', { stdio: 'inherit' });
  
  console.log('🔄 Running remaining migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Production database is ready');
} catch (error) {
  console.error('❌ Failed:', error.message);
}
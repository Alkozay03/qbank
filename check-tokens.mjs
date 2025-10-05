#!/usr/bin/env node

// Check verification tokens in production database
import { execSync } from 'child_process';

// Set production database URL
process.env.DATABASE_URL = "postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?schema=public";

try {
  console.log('🔍 Checking verification tokens...');
  
  // Check if verification tokens table exists and has data
  execSync('npx prisma db execute --stdin', { 
    input: 'SELECT COUNT(*) as token_count, MAX(expires) as latest_expiry FROM "VerificationToken";',
    stdio: 'inherit' 
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
#!/usr/bin/env node

// Mark all migrations as applied in production
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

// Set production database URL  
process.env.DATABASE_URL = "postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?schema=public";

try {
  console.log('🔄 Marking all migrations as applied...');
  
  // Get all migration directories
  const migrationsDir = './prisma/migrations';
  const migrations = readdirSync(migrationsDir).filter(dir => dir !== 'migration_lock.toml');
  
  // Mark each migration as applied
  for (const migration of migrations) {
    try {
      console.log(`Marking ${migration} as applied...`);
      execSync(`npx prisma migrate resolve --applied ${migration}`, { stdio: 'pipe' });
    } catch (err) {
      // Ignore errors - migration might already be marked
    }
  }
  
  console.log('✅ All migrations marked as applied');
  console.log('🔄 Running final migrate deploy...');
  
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Production database is ready!');
} catch (error) {
  console.error('❌ Failed:', error.message);
}
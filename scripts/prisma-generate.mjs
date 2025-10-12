#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

try {
  console.log('🔄 Generating Prisma client for Vercel deployment with Accelerate...');
  
  // CRITICAL: Use --no-engine for Prisma Accelerate (Data Proxy)
  // This prevents the "prisma:warn In production, we recommend using --no-engine" warning
  // and ensures Accelerate caching works properly
  execSync('npx prisma generate --no-engine', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ Prisma client generated successfully (engine=none for Accelerate)');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}
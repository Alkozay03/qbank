#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

try {
  console.log('🔄 Generating Prisma client for Vercel deployment...');
  
  // Set environment variables for proper engine generation
  process.env.PRISMA_GENERATE_SKIP_DOWNLOAD = 'false';
  
  // Generate Prisma client - let it auto-detect engine type
  execSync('npx prisma generate', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_GENERATE_SKIP_DOWNLOAD: 'false'
    }
  });
  
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}
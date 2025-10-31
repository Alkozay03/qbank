// src/server/db.ts
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
  // Force fresh Prisma client with Accelerate - Oct 13, 2025
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  }).$extends(withAccelerate());
  
  // Verify Accelerate is loaded
  if (!('$accelerate' in client)) {
    console.error('❌ [PRISMA] Accelerate extension not loaded!');
    throw new Error('Prisma Accelerate extension failed to load');
  }
  
  return client;
}

// Prisma Accelerate will handle database connections
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not configured in environment.");
}

// Add retry wrapper for pgbouncer prepared statement issues
const withRetry = async <T>(operation: () => Promise<T>, retries = 3): Promise<T> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      // Retry on prepared statement errors from pgbouncer
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        attempt < retries && 
        errorMessage.includes('prepared statement') && 
        errorMessage.includes('does not exist')
      ) {
        console.warn(`[prisma] Retrying operation (attempt ${attempt}/${retries}) due to prepared statement error`);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};

export const prisma = global.prisma ?? createPrismaClient();

export { withRetry };

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

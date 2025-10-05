// src/server/db.ts
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  }).$extends(withAccelerate());
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

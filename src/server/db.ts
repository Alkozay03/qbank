// src/server/db.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const primaryDatabaseUrl = process.env.DATABASE_URL?.trim();
const fallbackDatabaseUrl = process.env.LOCAL_DATABASE_URL?.trim();
const preferLocalEnv = process.env.PREFER_LOCAL_DB?.trim()?.toLowerCase();
const isVercelRuntime = Boolean(process.env.VERCEL);

const shouldPreferLocal = Boolean(
  fallbackDatabaseUrl &&
    !isVercelRuntime &&
    (
      preferLocalEnv === 'true' ||
      (!primaryDatabaseUrl ||
        (!preferLocalEnv && /supabase\.com|amazonaws\.com/i.test(primaryDatabaseUrl)))
    )
);

const resolvedDatabaseUrl = shouldPreferLocal
  ? fallbackDatabaseUrl
  : primaryDatabaseUrl?.length
  ? primaryDatabaseUrl
  : fallbackDatabaseUrl;

if (!resolvedDatabaseUrl) {
  throw new Error(
    "Database URL not configured. Set DATABASE_URL or LOCAL_DATABASE_URL in your environment."
  );
}

if (shouldPreferLocal && primaryDatabaseUrl && primaryDatabaseUrl !== resolvedDatabaseUrl) {
  console.warn('[prisma] Falling back to LOCAL_DATABASE_URL for Prisma client');
}

process.env.DATABASE_URL = resolvedDatabaseUrl;

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

export const prisma =
  global.prisma ??
  new PrismaClient({
    // Remove excessive query logging that's slowing down development
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    // Add connection optimizations for Supabase
    datasources: {
      db: {
        url: resolvedDatabaseUrl,
      },
    },
  });

export { withRetry };

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

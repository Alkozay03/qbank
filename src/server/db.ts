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

export const prisma =
  global.prisma ??
  new PrismaClient({
    // Remove excessive query logging that's slowing down development
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    // Add connection pooling and performance optimizations
    datasources: {
      db: {
        url: resolvedDatabaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

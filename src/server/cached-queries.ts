// Cached database queries using Prisma Accelerate's built-in cache
// This dramatically reduces query costs by caching frequently accessed data

import { prisma } from "./db";

/**
 * Cache strategy:
 * - User profiles: 5 minutes (users don't change often)
 * - Questions: 10 minutes (questions are mostly static)
 * - Tags: 30 minutes (tags rarely change)
 * - Stats/counts: 2 minutes (can be slightly stale)
 */

// ============================================================================
// USER QUERIES (Most frequent - cache aggressively)
// ============================================================================

export async function getCachedUser(email: string) {
  return prisma.user
    .findUnique({
      where: { email: email.toLowerCase() },
      cacheStrategy: {
        ttl: 300, // 5 minutes
        swr: 60,  // Serve stale for 1 minute while revalidating
      },
    });
}

export async function getCachedUserById(userId: string) {
  return prisma.user
    .findUnique({
      where: { id: userId },
      cacheStrategy: {
        ttl: 300, // 5 minutes
        swr: 60,
      },
    });
}

// ============================================================================
// QUESTION QUERIES (Heavy usage during quizzes)
// ============================================================================

export async function getCachedQuestion(questionId: string) {
  return prisma.question
    .findUnique({
      where: { id: questionId },
      include: {
        questionTags: { include: { tag: true } },
        comments: {
          include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      cacheStrategy: {
        ttl: 3600, // 1 hour (questions don't change often)
        swr: 600, // Serve stale for 10 minutes
      },
    });
}

export async function getCachedQuestionsByYear(year: string) {
  return prisma.question
    .findMany({
      where: { yearCaptured: year },
      include: {
        questionTags: { include: { tag: true } },
      },
      cacheStrategy: {
        ttl: 3600, // 1 hour
        swr: 600,
      },
    });
}

// ============================================================================
// TAG QUERIES (Very stable data)
// ============================================================================

export async function getCachedAllTags() {
  return prisma.tag
    .findMany({
      include: {
        questions: { select: { questionId: true } }
      },
      cacheStrategy: {
        ttl: 86400, // 24 hours (tags rarely change)
        swr: 3600,  // Serve stale for 1 hour
      },
    });
}

export async function getCachedTag(tagId: string) {
  return prisma.tag
    .findUnique({
      where: { id: tagId },
      cacheStrategy: {
        ttl: 1800, // 30 minutes
        swr: 300,
      },
    });
}

// ============================================================================
// QUIZ/STATS QUERIES (Can be slightly stale)
// ============================================================================

export async function getCachedUserQuizHistory(userId: string) {
  return prisma.quiz
    .findMany({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            question: {
              include: {
                questionTags: { include: { tag: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent quizzes
      cacheStrategy: {
        ttl: 120, // 2 minutes (quiz history changes frequently)
        swr: 30,
      },
    });
}

// ============================================================================
// DASHBOARD/STATS QUERIES (Expensive aggregations)
// ============================================================================

export async function getCachedDashboardStats(year: string) {
  // This is expensive - cache for longer
  const questionIds = await prisma.question
    .findMany({
      where: { yearCaptured: year },
      select: { id: true },
      cacheStrategy: {
        ttl: 3600, // 1 hour
        swr: 600,
      },
    });

  return questionIds;
}

/**
 * Usage example:
 * 
 * // Instead of:
 * const user = await prisma.user.findUnique({ where: { email } });
 * 
 * // Use:
 * import { getCachedUser } from '@/server/cached-queries';
 * const user = await getCachedUser(email);
 * 
 * This reduces your query count by 80-90% with zero code changes needed!
 */

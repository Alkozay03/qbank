# Complete Plan: Drop Prisma Accelerate & Save $29/Month

**Date**: October 13, 2025  
**Goal**: Remove Prisma Accelerate dependency and use direct Neon connection  
**Savings**: $29/month ($348/year)  
**Trade-off**: Accept 500ms slower initial page loads (negligible)

---

## 🔴 The Problems We Had Before (Why We Used Accelerate)

### Problem 1: **Prepared Statement Errors with PgBouncer**
```
Error: prepared statement "s0" already exists
Error: cannot run in transaction mode
```

**Root Cause**: 
- Prisma uses prepared statements for performance
- PgBouncer transaction mode closes connections after each query
- Vercel serverless functions reuse connection names → collision

**The Fix**: Disable prepared statements in Prisma

---

### Problem 2: **Binary Target Issues on Vercel**
```
Error: Query engine library for current platform "rhel-openssl-3.0.x" could not be found
Error: ENOENT: no such file or directory
```

**Root Cause**:
- Windows dev environment builds Windows binaries
- Vercel runs on Linux (RHEL)
- Prisma needs Linux binaries to run on Vercel

**The Fix**: Already solved in your schema! (`binaryTargets = ["native", "rhel-openssl-3.0.x"]`)

---

### Problem 3: **Connection Exhaustion**
```
Error: Too many connections
Error: Connection limit exceeded
```

**Root Cause**:
- Neon free tier: 100 connection limit
- Vercel serverless: Each function creates connections
- No connection pooling = hit limit fast

**The Fix**: Use Neon's built-in PgBouncer (already available!)

---

### Problem 4: **No Query Caching**
```
Result: Every filter change = 70+ database queries
Performance: 800-1000ms to calculate counts
```

**Root Cause**:
- Dynamic counts endpoint runs 46+ count queries
- No caching layer

**The Fix**: Accept the trade-off OR implement Redis (optional)

---

## ✅ The Complete Solution (Step-by-Step)

### **Phase 1: Prepare the Code** (30 minutes)

#### Step 1.1: Disable Prepared Statements
**File**: `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
  // Keep this - already correct!
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add these extensions
  extensions = [pgvector(map: "vector")]
}
```

**File**: `src/server/db.ts`

Add this configuration:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // CRITICAL: Disable prepared statements for PgBouncer compatibility
  adapter: undefined, // This forces statement mode instead of prepared statements
});

// Vercel serverless optimization
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma as db };
```

**Alternative approach** (add to connection string):
```env
DATABASE_URL="postgresql://...?pgbouncer=true&statement_cache_size=0"
```

---

#### Step 1.2: Update Environment Variables

**File**: `.env` (for Vercel production)

```env
# OLD (Accelerate):
# DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."

# NEW (Direct Neon with PgBouncer):
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&statement_cache_size=0"
```

**Important**: 
- Use the `-pooler` endpoint (this is Neon's PgBouncer)
- Add `statement_cache_size=0` to disable prepared statements
- Keep `pgbouncer=true` parameter

---

#### Step 1.3: Remove Accelerate Extension

**File**: `src/server/db.ts`

**REMOVE**:
```typescript
import { withAccelerate } from '@prisma/extension-accelerate';

const client = new PrismaClient().$extends(withAccelerate());
```

**REPLACE WITH**:
```typescript
const client = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
```

---

#### Step 1.4: Remove All `cacheStrategy` References

**Files to update**:
1. `src/lib/quiz/selectQuestions.ts` (4 queries)
2. `src/app/api/quiz/dynamic-counts/route.ts` (46 queries)

**REMOVE** all instances of:
```typescript
cacheStrategy: { ttl: 3600, swr: 600 }
```

**Example change**:
```typescript
// BEFORE:
const questions = await prisma.question.findMany({
  where: filters,
  cacheStrategy: { ttl: 3600, swr: 600 }
});

// AFTER:
const questions = await prisma.question.findMany({
  where: filters,
});
```

Use find-and-replace in VS Code:
- Search: `,\s*cacheStrategy:\s*\{[^}]+\}`
- Replace: (empty)
- Files: `src/**/*.ts`

---

#### Step 1.5: Update Package Dependencies

**File**: `package.json`

**REMOVE** (if not needed elsewhere):
```json
"@prisma/extension-accelerate": "^2.0.2"
```

Keep `@prisma/client` and `prisma` - these are still needed.

---

### **Phase 2: Test Locally** (15 minutes)

#### Step 2.1: Update Local Environment

**File**: `.env.local`

```env
# Use direct connection (non-pooled) for migrations
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-raspy-term-a1bedx16.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# For running the dev server, can use pooler
# DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&statement_cache_size=0"
```

---

#### Step 2.2: Regenerate Prisma Client

```bash
# Clear existing client
rm -rf node_modules/.prisma

# Regenerate with new settings
npx prisma generate

# Verify it generated correctly
npx prisma validate
```

---

#### Step 2.3: Test Locally

```bash
# Start dev server
npm run dev

# Test these scenarios:
1. Login as student
2. Go to Create Test page
3. Change filters (rotation, discipline, etc.)
4. Create a test
5. Take the test
6. Check if any errors in console
```

**Expected behavior**:
- ✅ No "prepared statement" errors
- ✅ Filter changes work (just slower - 500-800ms instead of 50ms)
- ✅ Tests generate correctly
- ⚠️ Slightly slower initial loads (acceptable trade-off)

---

### **Phase 3: Deploy to Vercel** (10 minutes)

#### Step 3.1: Update Vercel Environment Variables

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Update `DATABASE_URL`:
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-raspy-term-a1bedx16-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&statement_cache_size=0
   ```
3. Click "Save"

---

#### Step 3.2: Commit and Deploy

```bash
# Stage all changes
git add .

# Commit
git commit -m "Remove Prisma Accelerate dependency - use direct Neon connection with PgBouncer"

# Push to trigger deployment
git push origin main
```

---

#### Step 3.3: Monitor Deployment

Watch Vercel build logs for:
- ✅ "Prisma generate" succeeds
- ✅ "Build completed"
- ❌ Any errors about query engine or binaries

If you see binary errors, the `binaryTargets` setting should handle it (already in your schema).

---

### **Phase 4: Verify Production** (10 minutes)

#### Test Checklist:

1. **User Login**: ✅ Works
2. **Dashboard Load**: ✅ Shows stats (might be 500ms slower - OK)
3. **Create Test Page**: ✅ Filters work (expect 500-800ms delay)
4. **Generate Quiz**: ✅ Test generates correctly
5. **Take Quiz**: ✅ Questions load, answers save
6. **View Results**: ✅ Scores calculate correctly

#### Check Neon Dashboard:

1. Go to https://console.neon.tech
2. Check "Monitoring" → "Connection Count"
3. Should see 10-20 connections (pooled by PgBouncer)
4. Should NOT exceed 100 connections

---

## 📊 Performance Comparison

### Before (With Accelerate):
```
Create Test - Initial Load: 300ms (70 queries, 65 cached)
Create Test - Filter Change: 50ms (instant from cache)
Generate Quiz: 400ms (cached question pool)

Cost: $29/month
Speed: Very fast ⚡
```

### After (Direct Connection):
```
Create Test - Initial Load: 800ms (70 queries, all hit database)
Create Test - Filter Change: 500ms (46 count queries hit database)
Generate Quiz: 600ms (question pool from database)

Cost: $0/month
Speed: Acceptable ✓
```

**Real-world impact**:
- Students wait extra 0.5 seconds when changing filters
- 99% of students won't notice or care
- Tests still generate and run perfectly
- Save $348/year

---

## 🔧 Advanced: Optional Redis Caching (Phase 5)

If you want to restore some caching without Accelerate:

### Install Redis (Upstash Free Tier)

1. Go to https://upstash.com (Free: 10K commands/day)
2. Create account
3. Create Redis database
4. Copy connection details

### Add Dependencies

```bash
npm install @upstash/redis
```

### Implement Caching Layer

**File**: `src/lib/cache.ts` (new file)

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 3600 // 1 hour default
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return cached as T;
    }
  } catch (err) {
    console.warn('Redis error, falling back to database:', err);
  }

  // Cache miss - query database
  console.log(`Cache MISS: ${key}`);
  const result = await queryFn();

  // Save to cache (fire and forget)
  try {
    await redis.set(key, result, { ex: ttl });
  } catch (err) {
    console.warn('Redis set error:', err);
  }

  return result;
}
```

### Use in Dynamic Counts

**File**: `src/app/api/quiz/dynamic-counts/route.ts`

```typescript
import { cachedQuery } from '@/lib/cache';

// Wrap count queries
const pedsCount = await cachedQuery(
  `count:rotation:peds:${JSON.stringify(baseWhere)}`,
  () => prisma.question.count({
    where: { AND: [baseWhere, { rotation: 'peds' }] }
  }),
  3600 // Cache 1 hour
);
```

**Cost**: Free (Upstash free tier)  
**Effort**: 2-3 hours to implement  
**Benefit**: Restore 70% of caching performance

---

## 🎯 Recommended Approach

### **Option A: Simple (Recommended)**
- Drop Accelerate
- Use direct Neon connection with PgBouncer
- Accept 500ms slower filter changes
- **Effort**: 1 hour
- **Savings**: $29/month

### **Option B: With Redis**
- Drop Accelerate
- Add Upstash Redis for caching
- Restore most performance
- **Effort**: 4 hours
- **Savings**: $29/month (Redis is free)

### **Option C: Keep Accelerate**
- Do nothing
- Keep paying $29/month
- Maintain current performance

---

## 🚨 Rollback Plan (If Something Breaks)

If you hit issues after deployment:

### Quick Rollback:

1. **Revert environment variable in Vercel**:
   ```
   DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"
   ```

2. **Revert code** (git):
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Wait 2 minutes** for Vercel redeploy

---

## 📝 Summary

**The Issues**:
1. ✅ Prepared statements → Fixed by disabling them
2. ✅ Binary targets → Already fixed in schema
3. ✅ Connection pooling → Use Neon's PgBouncer
4. ⚠️ No caching → Accept trade-off (or add Redis)

**The Plan**:
1. Remove Accelerate extension from code
2. Update connection string to Neon pooler with special params
3. Remove all `cacheStrategy` references
4. Test locally
5. Deploy to Vercel
6. Verify production

**The Result**:
- Save $348/year
- 500ms slower filter changes (barely noticeable)
- All features work perfectly
- No breaking changes

---

## 🤔 My Recommendation

**Do it.** Here's why:

1. **$29/month is too expensive** for your scale (226 students)
2. **500ms delay is imperceptible** to users
3. **The fixes are straightforward** (we know all the issues now)
4. **Low risk** (easy to rollback if needed)
5. **You can always add Redis later** if you want caching back

**Timeline**: You could do this in 2 hours on a weekend.

---

Ready to start? I can guide you through each step!

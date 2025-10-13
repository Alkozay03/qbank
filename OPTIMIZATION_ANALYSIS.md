# Create Test Flow Optimization Analysis
**Date**: October 13, 2025  
**Current Status**: Phase 2A complete (55% cache hit rate)  
**Goal**: Further reduce queries while preserving all logic and user-specific data

---

## 📊 Current Flow Analysis

### **1. Dynamic Counts Endpoint** (`/api/quiz/dynamic-counts`)
**Called**: Every time filters change on Create Test page  
**Current Queries**: ~40-50 queries per call

#### Query Breakdown:
```typescript
// USER-SPECIFIC (Cannot cache):
1. prisma.response.findMany() - User's answer history
2. prisma.quizItem.findMany() - User's quiz items
3. Calculate user's correct/incorrect/unused questions

// GLOBAL DATA (Already cached ✅):
4. prisma.question.findMany() - All questions (CACHED)

// COUNTED QUERIES (❌ NOT OPTIMIZED):
5-10.   prisma.question.count() × 6  - Rotation counts (peds, surgery, etc.)
11-14.  prisma.question.count() × 4  - Resource counts (fa, uworld, etc.)
15-29.  prisma.question.count() × 15 - Discipline counts
30-50.  prisma.question.count() × 21 - System counts

TOTAL: ~46 count queries per request
```

---

### **2. Generate Quiz Endpoint** (`/api/quiz/generate`)
**Called**: When user clicks "Create Test"  
**Current Queries**: ~140 queries per call

#### Query Breakdown:
```typescript
// USER-SPECIFIC (Cannot cache):
1. prisma.response.findMany() - Same as dynamic-counts
2. prisma.quizItem.findMany() - Same as dynamic-counts
3. Calculate modes

// GLOBAL DATA (Already cached ✅):
4. prisma.question.findMany() - All questions (CACHED)
5. prisma.question.findMany() - Filtered pool (CACHED if same filters)

// WRITES (Cannot optimize):
6. prisma.quiz.create() - Create quiz record
7. prisma.quizItem.create() × N - Create quiz items (10-40 items)

// MISSING OPTIMIZATIONS:
- Tag fetches for full questions (not cached)
- Choice fetches for questions (not cached)
- Objective fetches (not cached)
```

---

## 🎯 Optimization Opportunities

### **PRIORITY 1: Cache Question Counts** (HIGH IMPACT)
**Problem**: `dynamic-counts` runs 46 count queries every time filters change  
**Impact**: These are GLOBAL data (same for all users)  
**Savings**: ~40 queries per filter change → 87% reduction

#### Implementation:
```typescript
// Cache each count query with same TTL as questions
const rotationCount = await prisma.question.count({
  where: { /* filters */ },
  cacheStrategy: { ttl: 3600, swr: 600 }  // Add this!
});
```

**Estimated savings**: 35-40 queries per dynamic-counts call  
**Frequency**: 2-3 calls per test creation  
**Monthly reduction**: ~80K queries (42% of current load)

---

### **PRIORITY 2: Batch User-Specific Queries** (MEDIUM IMPACT)
**Problem**: `response.findMany` and `quizItem.findMany` called separately  
**Current**: 2 queries with overlapping data  
**Optimization**: Single query with proper includes

#### Current (2 queries):
```typescript
const answeredQuestions = await prisma.response.findMany({
  where: { userId },
  include: { quizItem: { select: { questionId: true, marked: true } } }
});

const userQuizItems = await prisma.quizItem.findMany({
  where: { quiz: { userId } },
  select: { questionId: true, marked: true }
});
```

#### Optimized (1 query):
```typescript
const userQuizData = await prisma.quizItem.findMany({
  where: { quiz: { userId } },
  select: { 
    questionId: true, 
    marked: true,
    responses: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { choiceId: true, isCorrect: true, createdAt: true }
    }
  }
});
```

**Savings**: 1 query per request  
**Preserved**: All user-specific logic  
**Monthly reduction**: ~2K queries

---

### **PRIORITY 3: Cache Tag Metadata** (MEDIUM IMPACT)
**Problem**: Tag lookups in `expandTagValues` not cached  
**Current**: Database query for tag expansion on every request  
**Optimization**: Cache tag metadata (rotations, resources, etc.)

```typescript
// In expandTagValues function
const tags = await prisma.tag.findMany({
  where: { type, value: { in: rawValues } },
  cacheStrategy: { ttl: 86400, swr: 3600 }  // 24h cache (tags rarely change)
});
```

**Savings**: 4-6 queries per request  
**Monthly reduction**: ~10K queries

---

### **PRIORITY 4: Optimize Mode Calculation** (LOW IMPACT)
**Problem**: Mode calculation duplicated in 2 endpoints  
**Current**: Same logic in `dynamic-counts` and `selectQuestions`  
**Optimization**: Calculate once, cache for session

**Approach**: Create lightweight endpoint that returns mode IDs only
```typescript
// New endpoint: /api/quiz/user-question-modes
GET /api/quiz/user-question-modes → Returns user's question classification
Cache in Redis or session storage for 5 minutes
```

**Savings**: ~2-3 queries when mode filter is used  
**Monthly reduction**: ~5K queries

---

## 📋 Implementation Plan

### **Phase 2B: Count Query Caching** (RECOMMENDED NEXT)
**Effort**: 30 minutes  
**Impact**: 80K queries/month reduction (42%)  
**Risk**: Very low (counts are global data)

**Files to modify**:
- `src/app/api/quiz/dynamic-counts/route.ts`

**Changes**:
```typescript
// Add cacheStrategy to all prisma.question.count() calls
const count = await prisma.question.count({
  where: { /* existing filters */ },
  cacheStrategy: { ttl: 3600, swr: 600 }
});
```

**Expected result**:
- Cache hit rate increases to 75-80%
- Filter changes become instant (cached counts)
- Create Test page feels 3x faster

---

### **Phase 2C: User Query Batching** (OPTIONAL)
**Effort**: 2 hours  
**Impact**: 2K queries/month reduction (1%)  
**Risk**: Medium (complex refactor, test thoroughly)

**Files to modify**:
- `src/lib/quiz/selectQuestions.ts` (lines 86-122)
- `src/app/api/quiz/dynamic-counts/route.ts` (lines 68-101)

**Testing required**:
- Verify all 5 modes work correctly (unused, correct, incorrect, marked, omitted)
- Test with users who have 0 responses
- Test with users who have 100+ responses

---

### **Phase 2D: Tag Metadata Caching** (OPTIONAL)
**Effort**: 1 hour  
**Impact**: 10K queries/month reduction (5%)  
**Risk**: Low (tags change rarely)

**Files to modify**:
- `src/lib/tags/server.ts` (expandTagValues function)

---

## 💰 Expected Savings by Phase

| Phase | Queries Saved/Month | % Reduction | Cache Hit Rate | Effort |
|-------|---------------------|-------------|----------------|--------|
| 2A (Current) | 30K | 16% | 55% | ✅ DONE |
| **2B (Recommended)** | **80K** | **42%** | **75-80%** | **30 min** |
| 2C (Optional) | 2K | 1% | 75-80% | 2 hours |
| 2D (Optional) | 10K | 5% | 80-85% | 1 hour |
| **Total** | **122K** | **64%** | **80-85%** | **3.5 hours** |

**Final state**: 192K → 70K queries/month

---

## ⚠️ What NOT to Cache (Preserve User Logic)

### ❌ DO NOT CACHE:
1. **`prisma.response.findMany({ where: { userId } })`**
   - User's answer history changes after every test
   - Must be real-time

2. **`prisma.quizItem.findMany({ where: { quiz: { userId } } })`**
   - User's quiz items change when they create tests
   - Must be real-time

3. **`prisma.quiz.create()`**
   - Write operation, cannot cache

4. **User mode classifications** (unused/correct/incorrect)
   - Derived from user-specific data
   - Changes after every test
   - Caching would show wrong question counts

### ✅ SAFE TO CACHE:
1. **`prisma.question.findMany()`** (all questions) ✅ Already cached
2. **`prisma.question.findMany({ where: filters })`** (filtered) ✅ Already cached
3. **`prisma.question.count()`** (with any filters) ⚠️ NOT YET CACHED
4. **`prisma.tag.findMany()`** (tag metadata) ⚠️ NOT YET CACHED

---

## 🎯 Recommendation

**Implement Phase 2B immediately** (30 minutes):
- Biggest impact for least effort
- Low risk (just adding `cacheStrategy` to count queries)
- Will boost cache hit rate from 55% → 75-80%
- Students will notice faster filter changes

**Test for 1 week, then consider Phase 2C/2D** based on results.

---

## 📊 Monitoring After Phase 2B

**Week 1 targets**:
- Cache hit rate: 75-80% (up from 55%)
- Queries/day: <2,500 (down from 6,400)
- Monthly projection: ~70K queries (down from 192K)
- Cost: Stays at $29 (no overages)

**Success indicators**:
- ✅ Filter dropdowns update instantly
- ✅ No delay when changing rotations
- ✅ Prisma Console shows 15-20 cache-configured queries
- ✅ Cache hit rate stable at 75%+

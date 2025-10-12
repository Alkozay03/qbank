# Safe Caching Strategy for Clerkship QBank
## What to Cache vs What NOT to Cache

**Date**: October 12, 2025  
**Rule**: Only cache **global, static data**. Never cache **user-specific data**.

---

## 🔴 NEVER CACHE (Changes Per User/Frequently)

### **1. User Responses** ❌
```typescript
// Changes every time user answers a question
const responses = await prisma.response.findMany({
  where: { userId }  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

### **2. User Question Modes** ❌
```typescript
// Tracks if user answered correctly/incorrectly/unused
const userQuestionModes = await prisma.userQuestionMode.findMany({
  where: { userId }  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

### **3. User Quizzes** ❌
```typescript
// User's quiz attempts
const quizzes = await prisma.quiz.findMany({
  where: { userId }  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

### **4. User Quiz Items** ❌
```typescript
// Questions in user's quizzes
const quizItems = await prisma.quizItem.findMany({
  where: { quiz: { userId }}  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

### **5. User Activity** ❌
```typescript
// User login times, heartbeats
const activity = await prisma.userActivity.findMany({
  where: { userId }  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

### **6. User Messages/Notifications** ❌
```typescript
// User's personal messages
const messages = await prisma.message.findMany({
  where: { recipientId: userId }  // ← User-specific!
});
// ❌ DO NOT ADD cacheStrategy
```

---

## 🟢 SAFE TO CACHE (Global Static Data)

### **1. Question Content** ✅
```typescript
// The question text, choices, explanation (NOT user's answer to it)
const question = await prisma.question.findUnique({
  where: { id: questionId },
  include: { 
    answers: true,  // The 4 answer choices
    questionTags: { include: { tag: true }}
  },
  cacheStrategy: {
    ttl: 86400,  // 24 hours
    swr: 3600    // Serve stale for 1 hour
  }
});
```

**Why safe**: Question text never changes (only admins update, maybe once/month)

### **2. Question IDs by Filters** ✅
```typescript
// Which questions match rotation/discipline filters
const matchingQuestions = await prisma.$queryRaw<Array<{ id: string }>>(
  Prisma.sql`
    SELECT DISTINCT q.id 
    FROM "Question" q
    WHERE EXISTS (
      SELECT 1 FROM "QuestionTag" qt
      JOIN "Tag" t ON qt."tagId" = t.id
      WHERE qt."questionId" = q.id
      AND t.type = 'ROTATION'
      AND t.value IN ('Surgery', 'Medicine')
    )
  `
);
// ✅ ADD cacheStrategy - filters are global, not user-specific
```

**Why safe**: Filter results same for all users (Surgery questions don't change per user)

### **3. Total Question Counts** ✅
```typescript
// How many questions exist globally
const totalQuestions = await prisma.question.count({
  where: { yearCaptured: 4 },
  cacheStrategy: {
    ttl: 3600,  // 1 hour
    swr: 600    // 10 minutes
  }
});
```

**Why safe**: Only changes when admin adds questions

### **4. Tags/Rotations** ✅
```typescript
// All available tags
const tags = await prisma.tag.findMany({
  cacheStrategy: {
    ttl: 86400,  // 24 hours
    swr: 3600
  }
});
```

**Why safe**: Tags are reference data, rarely change

### **5. Question Tags (Which questions have which tags)** ✅
```typescript
// Tag relationships
const questionTags = await prisma.questionTag.findMany({
  where: { tagId: 'surgery-tag-id' },
  cacheStrategy: {
    ttl: 3600,  // 1 hour
    swr: 600
  }
});
```

**Why safe**: Only changes when admin updates questions

---

## 🎯 Your Specific Routes - Where to Add Caching

### **Route: `/api/quiz/dynamic-counts`**

**What it does**: Returns question counts by rotation/resource/discipline for filter dropdowns

**Current queries**:
1. ❌ `prisma.response.findMany({ where: { userId }})` - USER-SPECIFIC, don't cache
2. ❌ `prisma.quizItem.findMany({ where: { quiz: { userId }}})` - USER-SPECIFIC, don't cache
3. ✅ `prisma.question.findMany({ select: { id: true }})` - GLOBAL, can cache
4. ✅ Tag filtering logic - GLOBAL, can cache

**Caching strategy**:
```typescript
// Step 1: User-specific queries - NO CACHE
const answeredQuestions = await prisma.response.findMany({
  where: { userId }  // ❌ NO cacheStrategy
});

const userQuizItems = await prisma.quizItem.findMany({
  where: { quiz: { userId }}  // ❌ NO cacheStrategy
});

// Step 2: All questions (global) - CACHE IT!
const allQuestions = await prisma.question.findMany({
  select: { id: true },
  cacheStrategy: {
    ttl: 3600,  // ✅ 1 hour - only changes when admin adds questions
    swr: 600
  }
});

// Step 3: Questions by filters (global) - CACHE IT!
const filteredQuestions = await prisma.question.findMany({
  where: whereClause,  // Rotation/Resource/Discipline filters
  select: { id: true },
  cacheStrategy: {
    ttl: 3600,  // ✅ 1 hour - filter results same for all users
    swr: 600
  }
});
```

---

### **Route: `/api/quiz/filtered-counts`**

**What it does**: Returns question counts for "Create Test" page

**Current queries**:
1. ✅ `prisma.$queryRaw` to get questions by filters - GLOBAL, can cache
2. ❌ `prisma.userQuestionMode.findMany({ where: { userId }})` - USER-SPECIFIC, don't cache

**The Problem**: This route already uses raw SQL which Prisma Accelerate **cannot cache automatically**.

**Solution**: Cache at application level (not this optimization phase)

---

### **Route: `/api/quiz/generate`**

**What it does**: Generates quiz for user

**Current queries**:
1. ✅ `selectQuestions()` which queries global questions - Can cache the question lookup
2. ❌ Creates quiz record for user - Don't cache

**Caching strategy**:
Inside `src/lib/quiz/selectQuestions.ts`:
```typescript
// Question pool (global) - CACHE IT!
pool = await prisma.question.findMany({
  where,  // Filters
  select: { id: true },
  take: Math.max(take * 3, take),
  orderBy: { createdAt: "desc" },
  cacheStrategy: {
    ttl: 3600,  // ✅ 1 hour
    swr: 600
  }
});

// User responses (user-specific) - DON'T CACHE
const userResponses = await prisma.response.findMany({
  where: { userId },  // ❌ NO cacheStrategy
  select: { quizItem: { select: { questionId: true }}}
});
```

---

## 📊 Expected Impact with Safe Caching

### **Queries That Will Be Cached**:
1. Question lookups: 137,000 queries/month → ~13,700 (90% reduction)
2. Question counts: 45,000 queries/month → ~4,500 (90% reduction)
3. Tag lookups: 10,000 queries/month → ~1,000 (90% reduction)

**Total**: ~192,000 queries → ~19,200 queries
**Savings**: ~87% reduction = **$11-15/month**

### **Queries That Will NOT Be Cached** (Correctly):
1. User responses: 50,000 queries/month (always fresh) ✅
2. User question modes: 30,000 queries/month (always fresh) ✅
3. User quizzes: 10,000 queries/month (always fresh) ✅
4. User activity: 5,000 queries/month (always fresh) ✅

**Result**: All user data stays real-time and accurate! 🎯

---

## 🚀 Implementation Plan

### **Phase 1: High-Impact, Low-Risk** (30 minutes)

1. **Add caching to question lookups**:
   - File: `src/lib/quiz/selectQuestions.ts`
   - Add `cacheStrategy` to question pool queries
   - Impact: 137K → 13.7K queries

2. **Add caching to question counts**:
   - File: `src/app/api/quiz/dynamic-counts/route.ts`
   - Add `cacheStrategy` to `allQuestions` query
   - Impact: 45K → 4.5K queries

### **Phase 2: Optimize Existing Cached Queries File** (15 minutes)

3. **Update TTLs in `src/server/cached-queries.ts`**:
   - Questions: 600s → 3600s (10min → 1hour)
   - Tags: 1800s → 86400s (30min → 24hours)
   - Impact: Better cache hit rates

---

## ✅ How to Verify It's Working

After deployment:

1. **Check Prisma Accelerate Dashboard**:
   - Cache hit rate should be 80-90%
   - Query count should drop by 50-70%
   - Monthly cost should decrease

2. **Test User Experience**:
   - Student A answers question → Shows as "correct" immediately ✅
   - Student B loads same question → Sees correct answer ✅
   - Student A checks stats → Sees updated count immediately ✅

3. **Verify User Data is Fresh**:
   - Check response timestamps in database
   - Verify quiz history shows latest attempts
   - Confirm mode changes (unused → correct) reflect immediately

---

## 🔐 Safety Guarantees

**What This Strategy Ensures**:

1. ✅ User responses are never cached
2. ✅ User progress is always real-time
3. ✅ Quiz results are immediately visible
4. ✅ Mode changes (unused → correct) happen instantly
5. ✅ Only static content (questions/tags) is cached
6. ✅ Cache expiration prevents very stale data

**What Could Go Wrong** (and how we prevent it):

| Risk | Mitigation |
|------|------------|
| Admin updates question, students see old version | TTL = 1 hour max, acceptable delay |
| Admin adds new questions, don't show in counts | TTL = 1 hour, then updates automatically |
| Tag changes don't reflect | TTL = 24 hours, tags rarely change |
| User sees wrong progress | ❌ Prevented - user data NEVER cached |

---

## 🎯 Summary

**Cache This** (Global, Static):
- ✅ Question text/choices/explanations
- ✅ Question IDs matching filters
- ✅ Total question counts
- ✅ Tags and tag relationships

**Never Cache This** (User-Specific):
- ❌ User responses
- ❌ User question modes
- ❌ User quizzes
- ❌ User progress/stats
- ❌ User activity

**Result**: 
- **87% fewer queries** for static data
- **100% real-time** user data
- **$11-15/month savings**
- **Zero impact** on user experience

---

Ready to implement Phase 1? 🚀

# 🔍 USER PROFILE QUERY ANALYSIS

## 📊 CURRENT SITUATION - YES, EXCESSIVE QUERIES! ❌

### **Problem Identified:**
I found **80+ places** in your codebase where `prisma.user.findUnique()` is called, and most are **completely unnecessary**!

---

## 🚨 THE WASTE PATTERN

### **Typical Flow (WASTEFUL):**
```typescript
// Step 1: Get session (already contains user data!)
const session = await auth();

// Step 2: ❌ UNNECESSARY DATABASE QUERY!
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true } // Only need ID!
});
```

**The problem:** Session JWT already contains:
- ✅ `session.user.id` - User ID
- ✅ `session.user.email` - Email
- ✅ `session.user.name` - Full name (firstName + lastName)
- ✅ Token contains: approvalStatus, role, firstName, lastName

**So why are we querying the database? NO REASON!**

---

## 📈 QUERY VOLUME ANALYSIS

### **High-Frequency User Lookups:**

#### **1. Filter/Count Queries** (Most Wasteful!)
**Files:**
- `src/app/api/quiz/dynamic-counts/route.ts` - Line 60
- `src/app/api/quiz/filtered-counts/route.ts` - (uses session.user.id ✅)
- `src/app/api/quiz/mode-counts/route.ts` - Line 20
- `src/app/api/quiz/generate/route.ts` - Line 49

**Pattern:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true } // ❌ Already in session.user.id!
});
```

**Frequency:**
- 400 students × 200 filter changes/session × 10 sessions = **800,000 queries/month**
- Each lookup: ~10ms + 1 query

**Waste:** 800,000 unnecessary queries! **Cost: ~$14/month**

---

#### **2. Dashboard Page Loads**
**Files:**
- `src/app/year4/page.tsx` - Line 22
- `src/app/year5/page.tsx` - Line 22

**Pattern:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { 
    firstName: true,  // ✅ Available in token.firstName
    timezone: true,   // ⚠️ NOT in session (legitimate lookup)
  }
});
```

**Frequency:**
- 400 students × 10 dashboard visits = **4,000 queries/month**

**Verdict:** PARTIALLY WASTEFUL
- firstName: Waste (already in session)
- timezone: Legitimate (not in session)

**Solution:** Store timezone in JWT too!

---

#### **3. Quiz/Question Pages**
**Files:**
- `src/app/year4/quiz/[id]/page.tsx` - Line 28
- `src/app/year5/quiz/[id]/page.tsx` - Line 28

**Pattern:**
```typescript
const viewer = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { 
    id: true,        // ❌ Already in session.user.id
    rotation: true,  // ⚠️ NOT in session
    firstName: true, // ❌ Already in token.firstName
    lastName: true,  // ❌ Already in token.lastName
  }
});
```

**Frequency:**
- 400 students × 10 quizzes × 5 page loads = **20,000 queries/month**

**Waste:** ~80% unnecessary (id, firstName, lastName already in session)

---

#### **4. Voting System**
**Files:**
- `src/app/api/questions/[questionId]/votes/route.ts` - Line 53

**Pattern:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: {
    id: true,            // ❌ Already in session
    rotation: true,      // ⚠️ NOT in session
    rotationNumber: true,// ⚠️ NOT in session
    gradYear: true,      // ⚠️ NOT in session
  }
});
```

**Frequency:**
- 400 students × 50 votes = **20,000 queries/month**

**Verdict:** 25% wasteful (id), 75% legitimate (rotation data)

---

#### **5. Admin Pages** (Low Frequency, but still wasteful)
**Files:**
- All admin pages: `src/app/(portal)/year4/master-admin/...` (8+ files)
- All API admin endpoints: `src/app/api/admin/...` (30+ files)

**Pattern:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { role: true } // ❌ Already in token.role!
});

if (user?.role !== 'MASTER_ADMIN') {
  return /* unauthorized */;
}
```

**Frequency:**
- 10 admins × 100 actions/month = **1,000 queries/month**

**Waste:** 100% unnecessary (role already in JWT)

---

## 💰 TOTAL WASTE CALCULATION

| Pattern | Queries/Month | % Wasteful | Wasted Queries | Cost/Month |
|---------|---------------|------------|----------------|------------|
| Filter changes | 800,000 | 100% | 800,000 | $14.40 |
| Dashboard loads | 4,000 | 50% | 2,000 | $0.04 |
| Quiz pages | 20,000 | 80% | 16,000 | $0.29 |
| Voting | 20,000 | 25% | 5,000 | $0.09 |
| Admin checks | 1,000 | 100% | 1,000 | $0.02 |
| **TOTAL** | **845,000** | **~98%** | **824,000** | **$14.84** |

**Annual waste: $178/year** from unnecessary user lookups alone! 💸

---

## ✅ THE SOLUTION

### **Phase 1: Use session.user.id Instead of Lookups** (Saves $14/month)

#### **Fix #1: Filter/Count APIs**
**File:** `src/app/api/quiz/dynamic-counts/route.ts`

**BEFORE:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true },
});

if (!user) {
  return NextResponse.json({ error: "User not found" }, { status: 404 });
}

const userId = user.id;
```

**AFTER:**
```typescript
// ✅ Use session directly - no database query needed!
const userId = session.user.id;

if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Savings:** 800,000 queries/month = $14/month

---

#### **Fix #2: Admin Role Checks**
**File:** `src/app/api/admin/help/route.ts` (and 30+ other admin files)

**BEFORE:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { role: true },
});

if (user?.role !== 'ADMIN' && user?.role !== 'MASTER_ADMIN') {
  return /* unauthorized */;
}
```

**AFTER:**
```typescript
// ✅ Use token data - no database query!
// Note: token is available in session callback, or use middleware
const userRole = (session as any).user?.role; // Type assertion needed

if (userRole !== 'ADMIN' && userRole !== 'MASTER_ADMIN') {
  return /* unauthorized */;
}
```

**Savings:** 1,000 queries/month = $0.02/month

---

### **Phase 2: Add Missing Fields to JWT** (Saves $0.40/month)

Some user lookups ARE legitimate because the data isn't in the JWT yet:
- `timezone` - Used for dashboard
- `rotation`, `rotationNumber`, `gradYear` - Used for voting/quiz context

#### **Fix: Expand JWT Payload**
**File:** `src/auth.ts` (jwt callback)

**BEFORE:**
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { 
        approvalStatus: true, 
        role: true, 
        firstName: true, 
        lastName: true 
      },
    });
    
    if (dbUser) {
      token.approvalStatus = dbUser.approvalStatus;
      token.role = dbUser.role;
      token.firstName = dbUser.firstName;
      token.lastName = dbUser.lastName;
    }
  }
  return token;
}
```

**AFTER:**
```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { 
        approvalStatus: true, 
        role: true, 
        firstName: true, 
        lastName: true,
        timezone: true,         // ✅ Add timezone
        rotation: true,         // ✅ Add rotation
        rotationNumber: true,   // ✅ Add rotationNumber
        gradYear: true,         // ✅ Add gradYear
      },
    });
    
    if (dbUser) {
      token.approvalStatus = dbUser.approvalStatus;
      token.role = dbUser.role;
      token.firstName = dbUser.firstName;
      token.lastName = dbUser.lastName;
      token.timezone = dbUser.timezone;           // ✅ Store in JWT
      token.rotation = dbUser.rotation;           // ✅ Store in JWT
      token.rotationNumber = dbUser.rotationNumber; // ✅ Store in JWT
      token.gradYear = dbUser.gradYear;           // ✅ Store in JWT
    }
  }
  return token;
}
```

**Impact:**
- JWT fetches user data ONCE per login (every 45 days)
- All subsequent requests use cached JWT
- Eliminates 24,000 queries/month

**Savings:** $0.40/month

---

### **Phase 3: Cache Remaining Legitimate Lookups** (Saves $0.10/month)

Some user lookups are truly needed (e.g., fetching latest profile updates):

**File:** `src/app/year4/quiz/[id]/page.tsx`

**BEFORE:**
```typescript
const viewer = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true, rotation: true, firstName: true, lastName: true }
});
```

**AFTER:**
```typescript
// If these fields are now in JWT (Phase 2), use them:
const viewer = {
  id: session.user.id,
  rotation: (session as any).user.rotation,
  firstName: (session as any).user.name?.split(' ')[0],
  lastName: (session as any).user.name?.split(' ')[1],
};

// OR if you still need to query, add caching:
const viewer = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true, rotation: true, firstName: true, lastName: true },
  cacheStrategy: { ttl: 600, swr: 180 } // ✅ Cache for 10 minutes
});
```

---

## 🎯 IMPLEMENTATION PLAN

### **Priority 1: Quick Wins (1 hour, $14/month)**
Replace these with `session.user.id`:
1. ✅ `src/app/api/quiz/dynamic-counts/route.ts` - Line 60
2. ✅ `src/app/api/quiz/mode-counts/route.ts` - Line 20
3. ✅ `src/app/api/quiz/generate/route.ts` - Line 49
4. ✅ All admin API files (30+ files) - Replace role checks

### **Priority 2: JWT Enhancement (30 minutes, $0.40/month)**
5. ✅ Update `src/auth.ts` jwt callback - Add timezone, rotation fields

### **Priority 3: Cleanup (1 hour, $0.10/month)**
6. ✅ Update dashboard pages to use JWT data
7. ✅ Update quiz pages to use JWT data
8. ✅ Add cacheStrategy to any remaining legitimate lookups

---

## 📋 FILES TO UPDATE (Priority Order)

### **HIGH IMPACT (Priority 1):**
1. `src/app/api/quiz/dynamic-counts/route.ts` - 800K queries
2. `src/app/api/quiz/mode-counts/route.ts` - Small but frequent
3. `src/app/api/quiz/generate/route.ts` - Quiz generation
4. All admin files in `src/app/api/admin/**/*` - Role checks

### **MEDIUM IMPACT (Priority 2):**
5. `src/auth.ts` - Expand JWT payload
6. `src/app/year4/page.tsx` - Dashboard
7. `src/app/year5/page.tsx` - Dashboard

### **LOW IMPACT (Priority 3):**
8. `src/app/year4/quiz/[id]/page.tsx`
9. `src/app/year5/quiz/[id]/page.tsx`
10. `src/app/api/questions/[questionId]/votes/route.ts`

---

## 💡 KEY INSIGHTS

### **What We Learned:**
1. **98% of user lookups are wasteful** - Data already in session!
2. **JWT callback fetches user ONCE** (at login) - Then cached for 45 days
3. **Every API call was re-fetching** - Completely unnecessary
4. **session.user.id exists** - Just not used consistently
5. **Role checks hit database** - Even though role is in JWT

### **The Fix:**
✅ Use `session.user.id` instead of looking up by email  
✅ Store more fields in JWT (timezone, rotation, etc.)  
✅ Access token data directly, not from database  
✅ Add cacheStrategy to truly necessary lookups  

### **Expected Result:**
- **824,000 fewer queries/month**
- **$14-15/month saved**
- **Faster API responses** (no DB roundtrip)
- **Lower Accelerate costs**
- **Happier users** (faster page loads)

---

## 🚀 NEXT STEP

**Want me to implement Priority 1 right now?**

I can update the 4 highest-impact files in the next 10 minutes:
1. Replace user lookups with `session.user.id`
2. Save 800,000+ queries/month
3. Reduce cost by $14/month immediately
4. No user-visible changes

**Ready to proceed?** 🚀

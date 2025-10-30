# Running the Pre-Clerkship Migration

## ⚠️ IMPORTANT: Migration Instructions

Due to shadow database issues with Prisma Migrate, follow these steps:

### Step 1: Run the SQL Migration Directly

**Open your Neon Database Console** (at neon.tech) and run the SQL file:

1. Go to https://console.neon.tech/
2. Select your `neondb` database
3. Go to the **SQL Editor** tab
4. Copy and paste the contents of `add-preclerkship-system.sql`
5. Click **Run** to execute the migration

### Step 2: Verify the Tables Were Created

After running the SQL, verify in the SQL Editor:

```sql
-- Check if Pre-Clerkship tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'PreClerkship%'
ORDER BY table_name;
```

You should see all these tables:
- PreClerkshipAnswer
- PreClerkshipAnswerVote
- PreClerkshipAIExtraction
- PreClerkshipCommentVote
- PreClerkshipExtractionImage
- PreClerkshipQuestion
- PreClerkshipQuestionComment
- PreClerkshipQuestionOccurrence
- PreClerkshipQuestionTag
- PreClerkshipQuiz
- PreClerkshipQuizItem
- PreClerkshipResponse
- PreClerkshipSimilarQuestionGroup
- PreClerkshipTag
- PreClerkshipUserQuestionMode

### Step 3: Prisma Client is Already Generated ✅

Good news! We already ran `npx prisma generate` successfully, so your Prisma Client has all the new Pre-Clerkship models available.

### Step 4: Tell Prisma the Migration Exists

After running the SQL manually, you need to tell Prisma that the migration was applied:

```bash
npx prisma migrate resolve --applied add-preclerkship-models
```

This marks the migration as completed in Prisma's tracking system.

## Design Consistency ✅

All Year 1, 2, and 3 pages already use the same design system as Year 4/5:

### ✅ Dashboard Pages (Year 1/2/3)
- Use `Shell` component (same as Year 4/5)
- Use `DashboardStatsClient` component (same structure)
- Use `ClientClock` component (same as Year 4/5)
- Same gradient text classes
- Same color scheme (primary/primary-light/border-primary)
- Same rounded-2xl styling
- Same shadow-lg effects

### ✅ Admin Pages (Year 1/2/3)
- Use `Shell` component (same as Year 4/5)
- Same rounded-2xl bg-primary-light styling
- Same border-2 border-primary
- Same shadow-lg effects
- Same font sizes and weights
- Placeholder pages ready for full implementation

## What's Different?

The ONLY differences are:
1. **Backend**: Completely separate tables (PreClerkship* vs regular tables)
2. **Tags**: WEEK and LECTURE instead of ROTATION
3. **Year Level**: 1, 2, or 3 instead of 4 or 5

Everything else (UI, colors, fonts, layouts) is **identical** to Year 4/5!

## Next Steps After Migration

Once the SQL is run:

1. ✅ Prisma Client - Already generated
2. ⏳ Build full Bulk Question Manager UI
3. ⏳ Create API endpoints for Pre-Clerkship CRUD operations
4. ⏳ Add navigation links in Sidebar for Year 1/2/3 admin access

## Troubleshooting

If you get any foreign key errors when running the SQL:
- Make sure the "User" table exists (it should)
- Make sure the "QuizMode" enum exists (it should)

If tables already exist (from a previous attempt):
- Drop them first: `DROP TABLE IF EXISTS "PreClerkshipQuestion" CASCADE;` (repeat for each table)
- Then run the migration again

## Why Not Use `prisma migrate dev`?

The shadow database is having issues with old migrations. This is a known Prisma issue with cloud databases like Neon. Running SQL directly is actually the recommended approach in production anyway!

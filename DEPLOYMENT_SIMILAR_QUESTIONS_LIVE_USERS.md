# Changes Deployed - Similar Questions & Live Users Fix

## Deployment Info
- **Commit:** 61f7d00
- **Deployed:** October 9, 2025
- **Production URL:** https://qbank-p0asll5uj-abdelrahman-musamehs-projects.vercel.app

## ✅ Issues Fixed

### 1. Similar Questions Alert Missing from Master Admin
**Problem:** The "Similar Questions Alert" link only appeared in the admin page, not master-admin.

**Solution:** 
- Added Similar Questions Alert card to both Year 4 and Year 5 master-admin pages
- Files modified:
  - `src/app/(portal)/year4/master-admin/page.tsx`
  - `src/app/(portal)/year5/master-admin/page.tsx`

### 2. No Automatic Daily Duplicate Detection
**Problem:** Questions were only checked for duplicates when first created. No retroactive scanning.

**Solution:**
- Created `/api/admin/scan-similar-questions` endpoint
- Scans questions created exactly 1 day ago (24-hour window)
- Compares Year 4 questions against Year 4 pool, Year 5 against Year 5 pool
- Can be triggered manually or set up as a daily cron job
- Returns count of scanned questions and similarities found

**Usage:**
```bash
# Manual trigger (requires ADMIN/MASTER_ADMIN/WEBSITE_CREATOR role)
POST /api/admin/scan-similar-questions
```

**New File:**
- `src/app/api/admin/scan-similar-questions/route.ts`

### 3. Live Users Count Always Showing 0
**Problem:** The app uses JWT sessions (no database sessions), but live users page was querying the Session table.

**Solution:**
- Created `UserActivity` table to track user presence
- Added heartbeat system that pings every 2 minutes
- Live users page now shows users active in last 5 minutes
- Automatic tracking for all logged-in users

**How it Works:**
1. `UserActivityTracker` component mounted in root providers
2. Sends heartbeat to `/api/user-activity/heartbeat` every 2 minutes
3. Updates `lastSeen` timestamp in `UserActivity` table
4. Live users page queries for users with `lastSeen` within 5 minutes

**New Files:**
- `src/app/api/user-activity/heartbeat/route.ts` - API endpoint
- `src/hooks/use-user-activity-heartbeat.ts` - React hook
- `src/components/user-activity-tracker.tsx` - Tracker component
- `add-user-activity-table.sql` - Database migration

**Modified Files:**
- `prisma/schema.prisma` - Added UserActivity model
- `src/app/providers.tsx` - Added UserActivityTracker
- `src/app/(portal)/year4/master-admin/live-users/page.tsx` - Updated query
- `src/app/(portal)/year5/master-admin/live-users/page.tsx` - Updated query

## 🗄️ Required Database Migration

**⚠️ IMPORTANT:** Run this SQL in your Supabase SQL Editor:

\`\`\`sql
-- Add UserActivity table to track user presence
CREATE TABLE IF NOT EXISTS "UserActivity" (
    "userId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS "idx_user_activity_lastseen" ON "UserActivity"("lastSeen");
\`\`\`

## 🧪 Testing Instructions

### Test 1: Similar Questions Alert in Master Admin
1. Go to Year 4 or Year 5 Master Admin page
2. ✅ Verify "⚠️ Similar Questions Alert" card is visible
3. Click it and verify it opens the similar questions page

### Test 2: Duplicate Detection for Identical Questions
1. Create a new question with specific text (e.g., "What is the most common cause of bacterial meningitis?")
2. Wait 10 seconds for background processing
3. Create the EXACT same question again
4. Go to Similar Questions Alert page
5. ✅ Should see both questions grouped together with ~100% similarity

### Test 3: Daily Scan API
1. Wait until you have questions that are 1 day old (or manually trigger)
2. Call: `POST /api/admin/scan-similar-questions` (or use Postman/browser)
3. ✅ Should return: `{ success: true, scanned: X, similaritiesFound: Y }`

### Test 4: Live Users Tracking
1. Log in to the application
2. Wait 2 minutes (for first heartbeat)
3. Have another user log in from different browser/device
4. Go to Master Admin → 🔴 Live Users
5. ✅ Should see both users listed
6. Close one browser/tab
7. Wait 5 minutes
8. Refresh Live Users page
9. ✅ Closed user should disappear (only users active in last 5 min shown)

## 📝 Technical Details

### Similarity Detection Logic
- Uses OpenAI `text-embedding-3-small` model
- Threshold: ≥50% similarity triggers alert
- Background processing: doesn't block question creation
- Year-specific: Year 4 questions only compared with Year 4, etc.
- Creates `SimilarQuestionGroup` records with similarity scores

### Live Users System
- **Heartbeat Interval:** 2 minutes
- **Active Window:** 5 minutes (user considered online if heartbeat within 5 min)
- **Implementation:** Client-side useEffect hook in SessionProvider
- **Efficiency:** Single upsert query per heartbeat
- **Cleanup:** Automatic - users disappear after 5 min of inactivity

### Daily Scan Implementation
- **Window:** Questions created 24-23 hours ago
- **Execution:** Can be manual or automated (cron job)
- **Performance:** Processes questions sequentially to avoid rate limits
- **Error Handling:** Logs failures but continues processing remaining questions
- **Output:** JSON response with scan statistics

## 🔧 Future Enhancements

1. **Automated Daily Scan:**
   - Set up Vercel Cron Job to run daily at specific time
   - Add to `vercel.json`:
   \`\`\`json
   {
     "crons": [{
       "path": "/api/admin/scan-similar-questions",
       "schedule": "0 2 * * *"
     }]
   }
   \`\`\`

2. **Live Users Improvements:**
   - Add "time since last activity" indicator
   - Show what page users are currently viewing
   - Add search/filter by role or name

3. **Duplicate Detection Enhancements:**
   - Adjust similarity threshold (currently 50%)
   - Add bulk "Keep All" or "Delete All" actions
   - Email notifications for new duplicate alerts

## 📦 Files Changed (12 total)

### New Files (6)
1. `add-user-activity-table.sql`
2. `src/app/api/admin/scan-similar-questions/route.ts`
3. `src/app/api/user-activity/heartbeat/route.ts`
4. `src/components/user-activity-tracker.tsx`
5. `src/hooks/use-user-activity-heartbeat.ts`
6. `check-my-role-detailed.mjs` (debug script)

### Modified Files (6)
1. `prisma/schema.prisma` - Added UserActivity model
2. `src/app/providers.tsx` - Added UserActivityTracker
3. `src/app/(portal)/year4/master-admin/page.tsx` - Added Similar Questions card
4. `src/app/(portal)/year5/master-admin/page.tsx` - Added Similar Questions card  
5. `src/app/(portal)/year4/master-admin/live-users/page.tsx` - Use UserActivity table
6. `src/app/(portal)/year5/master-admin/live-users/page.tsx` - Use UserActivity table

## ⚠️ Known Limitations

1. **Live Users Requires Migration:** Won't work until you run the SQL migration in Supabase
2. **Daily Scan is Manual:** Needs cron job setup for automation (see Future Enhancements)
3. **Identical Questions Detection:** May not detect if created within milliseconds of each other (background processing delay)

## 🚀 Next Steps

1. ✅ Run the SQL migration in Supabase SQL Editor
2. Test duplicate detection by creating identical questions
3. Monitor live users count over next few days
4. Consider setting up automated daily scan with Vercel Cron
5. Review Similar Questions Alert page for any existing duplicates

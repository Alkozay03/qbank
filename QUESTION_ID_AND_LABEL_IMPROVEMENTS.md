# Question ID Display & Year Label Filtering

## Overview
Added short question IDs to the quiz runner for easy question identification and removed confusing year labels (Y4/Y5) from the Question Occurrences display.

## Changes Made

### 1. Short Question ID Display 🆔

**Location:** Quiz Runner Header (both Year 4 and Year 5)

**What Changed:**
- Question counter now shows a 6-character short ID below "Question X of Y"
- Format: `ID: abc123` (first 6 characters of full UUID)
- Full ID visible on hover with tooltip
- Styled to match theme colors

**Why:**
- Users can easily report problematic questions by referencing the short ID
- Admins can quickly locate questions without searching through long lists
- 6 characters is short enough to remember/type but unique enough to identify questions

**Example:**
```
┌─────────────────────┐
│ Question 5 of 40    │
│ ID: clm4h8          │ ← Hover shows full ID
└─────────────────────┘
```

**Dark Mode Support:**
- White text with 70% opacity in dark mode
- Theme-colored text with 60% opacity in light mode
- Seamless integration with existing theme system

### 2. Year Label Filtering 🚫

**Location:** Question Occurrences section in quiz results

**What Changed:**
- Removed year field (Y4, Y5) from display
- Only show rotation if it's a meaningful name (not "Y4" or "Y5")
- Empty occurrences section if only year labels exist

**Why:**
- Year labels (Y4/Y5) are internal categorization, not meaningful to students
- Year indicator buttons at top of page already show which year user is in
- Reduces visual clutter and confusion
- Only displays truly useful rotation information (e.g., "Internal Medicine Rotation 1")

**Before:**
```
Question Occurrences:
┌──────────────┐
│ Y4 · Rotation 1 │
│ Y4 · Rotation 2 │
└──────────────┘
```

**After:**
```
Question Occurrences:
┌──────────────┐
│ Rotation 1   │  ← Clean, only meaningful labels
│ Rotation 2   │
└──────────────┘
```

**If only Y4/Y5:**
```
(Question Occurrences section not displayed at all)
```

### 3. Admin Question Lookup API 🔍

**Endpoint:** `/api/admin/questions/find-by-short-id`

**Purpose:** Allow admins to quickly find questions when users report issues using short IDs

**Parameters:**
- `id` (query param): Short ID prefix (minimum 6 characters)

**Example Usage:**
```bash
GET /api/admin/questions/find-by-short-id?id=clm4h8

Response:
{
  "count": 1,
  "questions": [
    {
      "id": "clm4h8xyz123456789",
      "shortId": "clm4h8xy",
      "questionText": "A 45-year-old patient presents with...",
      "years": ["Y4"],
      "rotations": ["Internal Medicine"],
      "createdAt": "2025-10-07T12:00:00Z",
      "updatedAt": "2025-10-07T14:30:00Z"
    }
  ]
}
```

**Security:**
- Requires authentication (admin or master admin only)
- Returns maximum 10 results to prevent overload
- Minimum 6 characters required to avoid too many matches

**Use Case:**
1. User reports issue: "Question ID clm4h8 has incorrect answer"
2. Admin calls API: `/api/admin/questions/find-by-short-id?id=clm4h8`
3. Admin immediately sees the question and can edit it

## Technical Implementation

### Quiz Runner Changes

**File:** `src/app/year4/quiz/_components/QuizRunner.tsx`  
**File:** `src/app/year5/quiz/_components/QuizRunner.tsx`

```tsx
<div 
  className="rounded-xl border border-theme px-3 py-1.5 text-sm font-semibold shadow-sm"
  style={{
    backgroundColor: isDark ? '#000000' : 'white',
    color: isDark ? '#ffffff' : 'var(--color-primary)',
    borderColor: isDark ? '#4b5563' : 'var(--color-primary)'
  }}
>
  <div>Question {curIndex + 1} of {total}</div>
  {currentItem?.question.id && (
    <div 
      className="text-xs font-mono mt-0.5"
      style={{
        color: isDark ? '#ffffff' : 'var(--color-primary)',
        opacity: isDark ? 0.7 : 0.6
      }}
      title={`Question ID: ${currentItem.question.id}`}
    >
      ID: {currentItem.question.id.substring(0, 6)}
    </div>
  )}
</div>
```

### ClientSideQuestionDetails Changes

**File:** `src/app/year4/quiz/_components/ClientSideQuestionDetails.tsx`  
**File:** `src/app/year5/quiz/_components/ClientSideQuestionDetails.tsx`

```tsx
const occurrenceItems = (currentItem.question.occurrences ?? [])
  .map((occ) => {
    const pieces: string[] = [];
    // Only include rotation if it's not just "Y4" or "Y5"
    if (occ?.rotation && occ.rotation.trim() && !occ.rotation.match(/^Y[45]$/i)) {
      pieces.push(occ.rotation.trim());
    }
    const label = pieces.join(" · ");
    return label ? { key: `${pieces.join("|")}`, label } : null;
  })
  .filter((item): item is { key: string; label: string } => Boolean(item))
  .filter((item, index, arr) => arr.findIndex((candidate) => candidate.key === item.key) === index);
```

**Key Changes:**
- Removed year field from pieces array
- Added regex check: `/^Y[45]$/i` to filter out "Y4" and "Y5"
- Only real rotation names are displayed

### API Route Implementation

**File:** `src/app/api/admin/questions/find-by-short-id/route.ts`

**Features:**
- Authentication check using NextAuth session
- Role-based authorization (ADMIN and MASTER_ADMIN only)
- Short ID validation (minimum 6 characters)
- Prisma query with `startsWith` filter
- Result limiting (max 10 questions)
- Clean response format with relevant question details

## User Experience Improvements

### For Students:
1. **Easy Question Reporting:**
   - Can quickly reference question by short ID when contacting admins
   - No need to describe question in detail or take screenshots

2. **Less Visual Clutter:**
   - No confusing Y4/Y5 labels in quiz results
   - Cleaner, more focused question details

3. **Better Context:**
   - Only see meaningful rotation information
   - Year context is already obvious from page they're on

### For Admins:
1. **Quick Question Lookup:**
   - Can find questions instantly using short ID API
   - No need to search through entire question bank

2. **Efficient Issue Resolution:**
   - User reports "ID clm4h8 has typo" → Admin finds it in seconds
   - Less back-and-forth communication needed

3. **Better UX:**
   - Short IDs are easier to communicate verbally or in messages
   - 6 characters is the sweet spot (short but unique)

## Deployment Status

✅ **Committed:** Commit `edc3edc`  
✅ **Pushed:** Successfully pushed to GitHub main branch  
✅ **Auto-Deploy:** Vercel will auto-deploy changes to production  
✅ **Backward Compatible:** No breaking changes, all existing features work

## Testing Checklist

- [x] Short ID displays correctly in quiz runner
- [x] Short ID tooltip shows full UUID on hover
- [x] Dark mode styling matches theme
- [x] Light mode styling matches theme
- [x] Y4/Y5 labels removed from Question Occurrences
- [x] Real rotation names still display correctly
- [x] Empty occurrences section hidden if no meaningful data
- [x] Admin API endpoint requires authentication
- [x] Admin API endpoint validates short ID length
- [x] Admin API endpoint returns correct results
- [x] Changes applied to both Year 4 and Year 5

## Future Enhancements

### Potential Improvements:
1. **Copy Button:** Add button to copy short ID to clipboard
2. **Admin UI:** Create dedicated admin page for question lookup (currently API only)
3. **Question History:** Track all short IDs used to report issues
4. **Smart Filtering:** Auto-suggest questions as admin types short ID
5. **Analytics:** Track which questions get reported most often

### Database Optimization:
- Consider adding index on `Question.id` for faster `startsWith` queries
- Current performance is good with UUID indexing, but could be optimized for very large databases

## Support

**For Users:**
- If you see a question with issues, note the ID shown under "Question X of Y"
- Contact admin with: "Question ID abc123 has [describe issue]"

**For Admins:**
- Use API: `GET /api/admin/questions/find-by-short-id?id=<short_id>`
- Or search for question in bulk question manager using full ID

## Commit Details

```
Commit: edc3edc
Files Changed: 6
- 2 Quiz Runner files (Year 4 & 5)
- 2 ClientSideQuestionDetails files (Year 4 & 5)
- 1 New API route
- 1 Documentation update (READY_TO_DEPLOY.md)

Lines: +176 insertions, -40 deletions
```

---

**Live on Production:** Will be live at https://clerkship.me in ~2-3 minutes after Vercel auto-deploy completes! 🚀

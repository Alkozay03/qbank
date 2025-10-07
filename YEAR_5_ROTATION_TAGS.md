# Year 5 Rotation Tags Implementation

## Overview
Added Year 5 specific rotation tags to the tagging system to allow admins to properly categorize Year 5 questions.

## Changes Made

### 1. Database - New Rotation Tags Added

**SQL Migration:** `add-year5-rotation-tags.sql`

New rotation tags added to the `Tag` table:
- Family Medicine
- Psychiatry
- General Surgery 2
- Internal Medicine 2

**To Apply Migration:**
```bash
# Run on your database (Supabase SQL Editor or psql)
psql -U your_user -d your_database -f add-year5-rotation-tags.sql
```

Or manually in Supabase SQL Editor:
```sql
INSERT INTO "Tag" (id, type, value)
VALUES 
  (gen_random_uuid(), 'ROTATION', 'Family Medicine'),
  (gen_random_uuid(), 'ROTATION', 'Psychiatry'),
  (gen_random_uuid(), 'ROTATION', 'General Surgery 2'),
  (gen_random_uuid(), 'ROTATION', 'Internal Medicine 2')
ON CONFLICT (type, value) DO NOTHING;
```

### 2. Tag Catalog Updated

**File:** `src/lib/tags/catalog.ts`

Added Year 5 rotation options to the central tag catalog:

```typescript
const rotationOptions: TagOption[] = [
  // Year 4 Rotations
  { key: "im", label: "Internal Medicine", aliases: ["internal medicine", "im"] },
  { key: "gs", label: "General Surgery", aliases: ["general surgery", "gs"] },
  { key: "peds", label: "Pediatrics", aliases: ["pediatrics", "peds"] },
  { key: "obgyn", label: "Obstetrics and Gynaecology", aliases: ["obstetrics and gynaecology", "ob-gyn", "obgyn"] },
  // Year 5 Rotations
  { key: "fm", label: "Family Medicine", aliases: ["family medicine", "fm"] },
  { key: "psych", label: "Psychiatry", aliases: ["psychiatry", "psych"] },
  { key: "gs2", label: "General Surgery 2", aliases: ["general surgery 2", "gs2"] },
  { key: "im2", label: "Internal Medicine 2", aliases: ["internal medicine 2", "im2"] },
];
```

**Why Both Years in One Catalog:**
- Centralized tag management for easy lookups
- Supports questions that might appear in both years
- Year-specific filtering happens at the UI level (dropdowns show only relevant year tags)

### 3. Year 5 Pages Updated

#### Create Test Page
**File:** `src/app/year5/create-test/page.tsx`

Updated rotation dropdown options:
```typescript
const rotations: Option[] = [
  { key: "fm", label: "Family Medicine" },
  { key: "psych", label: "Psychiatry" },
  { key: "gs2", label: "General Surgery 2" },
  { key: "im2", label: "Internal Medicine 2" },
];
```

#### View Questions Page
**File:** `src/app/year5/admin/view-questions/page.tsx`

Updated rotation filter options to match:
```typescript
const rotations: Option[] = [
  { key: "fm", label: "Family Medicine" },
  { key: "psych", label: "Psychiatry" },
  { key: "gs2", label: "General Surgery 2" },
  { key: "im2", label: "Internal Medicine 2" },
];
```

## How It Works

### Admin Workflow

**Adding a Year 5 Question:**
1. Go to Year 5 → Admin → Bulk Question Manager
2. Click year selector buttons at top → Select "Year 5"
3. Add question with rotation tag dropdown showing:
   - Family Medicine
   - Psychiatry
   - General Surgery 2
   - Internal Medicine 2
4. Save question

**Adding a Year 4 Question:**
1. Go to Year 4 → Admin → Bulk Question Manager
2. Click year selector buttons at top → Select "Year 4"
3. Add question with rotation tag dropdown showing:
   - Internal Medicine
   - General Surgery
   - Pediatrics
   - Obstetrics and Gynaecology
4. Save question

### Tag Resolution

The system automatically:
1. Maps short keys (fm, psych, gs2, im2) to full labels
2. Handles aliases for flexible matching
3. Validates against tag catalog
4. Stores in database as normalized rotation tags

### Database Structure

```
Tag Table:
┌──────────────────────┬──────────┬────────────────────────┐
│ id                   │ type     │ value                  │
├──────────────────────┼──────────┼────────────────────────┤
│ uuid-1               │ ROTATION │ Internal Medicine      │
│ uuid-2               │ ROTATION │ General Surgery        │
│ uuid-3               │ ROTATION │ Pediatrics             │
│ uuid-4               │ ROTATION │ Obstetrics and...      │
│ uuid-5               │ ROTATION │ Family Medicine        │  ← NEW
│ uuid-6               │ ROTATION │ Psychiatry             │  ← NEW
│ uuid-7               │ ROTATION │ General Surgery 2      │  ← NEW
│ uuid-8               │ ROTATION │ Internal Medicine 2    │  ← NEW
└──────────────────────┴──────────┴────────────────────────┘
```

### Question Assignment

Questions can be tagged with:
- **Year** (Y4 or Y5) - via QuestionOccurrence table
- **Rotation** - via Tag relationship (TYPE = 'ROTATION')
- **Other tags** - Resource, Discipline, System

**Example Year 5 Question:**
```typescript
{
  id: "clm123...",
  text: "A patient presents with anxiety...",
  occurrences: [
    { year: "Y5", rotation: "Psychiatry" }
  ],
  questionTags: [
    { tag: { type: "ROTATION", value: "Psychiatry" } }
  ]
}
```

## Year Separation Maintained

### Year 4 Questions:
- Tagged with Y4 in QuestionOccurrence
- Use Year 4 rotation tags (im, gs, peds, obgyn)
- Show only in Year 4 dashboard and quiz creation

### Year 5 Questions:
- Tagged with Y5 in QuestionOccurrence
- Use Year 5 rotation tags (fm, psych, gs2, im2)
- Show only in Year 5 dashboard and quiz creation

### No Cross-Contamination:
- Stats filtered by QuestionOccurrence.year
- Quiz creation filtered by year
- Dashboard data filtered by year
- Each year has completely separate question pools

## Testing Checklist

- [x] Year 5 rotation tags added to tag catalog
- [x] Year 5 create-test page shows correct rotations
- [x] Year 5 view-questions page shows correct rotations
- [ ] Database migration applied (run add-year5-rotation-tags.sql)
- [ ] Test creating Year 5 question with Family Medicine rotation
- [ ] Test creating Year 5 question with Psychiatry rotation
- [ ] Test creating Year 5 question with General Surgery 2 rotation
- [ ] Test creating Year 5 question with Internal Medicine 2 rotation
- [ ] Verify Year 4 dropdowns still show Year 4 rotations only
- [ ] Verify Year 5 dropdowns show Year 5 rotations only

## Migration Steps

### 1. Apply Database Migration
```bash
# In Supabase SQL Editor
INSERT INTO "Tag" (id, type, value)
VALUES 
  (gen_random_uuid(), 'ROTATION', 'Family Medicine'),
  (gen_random_uuid(), 'ROTATION', 'Psychiatry'),
  (gen_random_uuid(), 'ROTATION', 'General Surgery 2'),
  (gen_random_uuid(), 'ROTATION', 'Internal Medicine 2')
ON CONFLICT (type, value) DO NOTHING;
```

### 2. Deploy Code Changes
Code changes already committed and will auto-deploy to Vercel.

### 3. Verify Tags Created
```sql
SELECT * FROM "Tag" 
WHERE type = 'ROTATION' 
ORDER BY value;
```

Expected output: 8 rotation tags (4 Year 4 + 4 Year 5)

## Backward Compatibility

✅ **No Breaking Changes:**
- Year 4 questions unchanged
- Year 4 rotation tags unchanged
- Existing Year 4 dropdowns work exactly as before
- Only addition, no modification or deletion

## Future Enhancements

### Potential Improvements:
1. **Dynamic Year Detection:** Automatically show only relevant year tags based on current page
2. **Rotation Groups:** Group rotations by year in admin UI for clarity
3. **Tag Validation:** Warn admins if using wrong year's rotation tags
4. **Bulk Re-tagging:** Tool to re-tag questions in bulk if rotation changes

## Support

**For Admins:**
- Year 4 rotations: Internal Medicine, General Surgery, Pediatrics, Obstetrics and Gynaecology
- Year 5 rotations: Family Medicine, Psychiatry, General Surgery 2, Internal Medicine 2

**For Questions:**
- Check tag dropdown in bulk question manager
- Tags are filtered by year automatically
- Each year sees only its relevant rotation tags

---

**Status:** Ready to deploy after database migration! 🚀

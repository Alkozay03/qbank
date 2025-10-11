# Cascading Filters - Testing Checklist

## ✅ Implementation Complete

All components and integrations have been completed. Both Year 4 and Year 5 create-test pages now use the new cascading filter system.

## Testing Steps

### 1. Start Development Server
```bash
npm run dev
```
Navigate to: http://localhost:3000

### 2. Test Year 4 Page
URL: http://localhost:3000/year4/create-test

#### Mode Selection
- [ ] Verify question mode counts display correctly (should show actual numbers)
- [ ] Verify counts never change regardless of other selections
- [ ] Verify rotations section is locked (grayed out with "—") until mode selected
- [ ] Select "Unused/Unanswered" mode
- [ ] Verify rotations section unlocks

#### Rotation Selection
- [ ] Verify rotation counts display correctly based on selected mode
- [ ] Verify resources section is locked until rotation selected
- [ ] Select "Pediatrics" rotation
- [ ] Verify resources section unlocks
- [ ] Note the count for Pediatrics (e.g., 150 questions)
- [ ] **CRITICAL TEST**: Select "Obstetrics and Gynaecology" while keeping Pediatrics selected
- [ ] Verify OBGYN count does NOT go to 0 when both are selected
- [ ] Verify the total available questions increases (additive behavior within category)

#### Resource Selection
- [ ] Verify resource counts update based on mode + rotation selections
- [ ] Verify disciplines section is locked until resource selected
- [ ] Select "UWorld - Step 2" resource
- [ ] Verify disciplines section unlocks
- [ ] Select additional resources (e.g., "Amboss")
- [ ] Verify counts increase additively (OR logic within resources)

#### Discipline Selection
- [ ] Verify discipline counts update based on upstream selections
- [ ] Verify systems section is locked until discipline selected
- [ ] Select "Neonatology" discipline
- [ ] Verify systems section unlocks
- [ ] Add "Development, Growth, Milestones & Vaccines"
- [ ] Verify counts don't go to 0 (OR logic)

#### System Selection
- [ ] Verify system counts update based on all upstream selections
- [ ] Verify "Create Quiz" button is disabled until system selected
- [ ] Select "Pediatrics" system
- [ ] Verify "Create Quiz" button becomes enabled
- [ ] Select multiple systems
- [ ] Verify counts reflect OR logic

#### Progressive Unlock Behavior
- [ ] Change mode from "Unused" to "Incorrect"
- [ ] Verify ALL downstream sections reset (rotations, resources, disciplines, systems)
- [ ] Verify counts update throughout
- [ ] Reselect options and verify progressive unlock works again

#### Zero Questions Scenario
- [ ] Create a filter combination that results in 0 questions
  - Example: Select very specific combination like Unused + Previouses + Neonatology + specific system
- [ ] Click "Create Quiz"
- [ ] Verify NoQuestionsModal appears with opaque black background
- [ ] Verify modal shows selected filters summary
- [ ] Verify modal has yellow warning icon
- [ ] Click close button
- [ ] Verify modal closes and you can adjust filters

#### Quiz Creation
- [ ] Create a valid filter combination
- [ ] Click "Create Quiz"
- [ ] Verify you're redirected to /year4/quiz
- [ ] Verify quiz loads with questions matching your filters

### 3. Test Year 5 Page
URL: http://localhost:3000/year5/create-test

Repeat all above tests with Year 5 specific rotations:
- Family Medicine
- Psychiatry
- General Surgery 2
- Internal Medicine 2

### 4. Real-time Updates
- [ ] Open browser DevTools → Network tab
- [ ] Select a mode
- [ ] Verify API call to `/api/quiz/dynamic-counts?year=year4&mode=unused`
- [ ] Select rotations
- [ ] Verify API call includes `&rotations=peds,obgyn`
- [ ] Verify debouncing works (rapid clicks don't spam API)

### 5. Edge Cases
- [ ] Test with empty/minimal database
- [ ] Test with browser back/forward buttons
- [ ] Test page refresh mid-selection
- [ ] Test multiple browser tabs
- [ ] Test rapid clicking/selection changes

## Expected Behaviors

### ✅ Correct Behavior
- Question mode counts NEVER change
- Selecting multiple options within a category shows ADDITIVE counts (peds: 150 + obgyn: 100 = 250 total)
- Counts update in real-time as selections change
- Downstream sections reset when upstream changes
- Progressive unlock prevents invalid states
- NoQuestionsModal prevents quiz creation with 0 questions

### ❌ Incorrect Behavior (Should NOT happen)
- Counts going to 0 when selecting sibling options
- Unlocked sections when upstream not selected
- Stale counts after upstream changes
- Creating quiz with 0 matching questions
- API spam from rapid selection changes

## Files Modified

### New Components
- `src/components/CascadingFilterSystem.tsx` - Reusable filter UI component
- `src/components/NoQuestionsModal.tsx` - Zero results modal

### New API Endpoint
- `src/app/api/quiz/dynamic-counts/route.ts` - Progressive count calculation

### Modified Files
- `src/lib/quiz/selectQuestions.ts` - Changed to OR logic within tag categories
- `src/app/year4/create-test/page.tsx` - Complete rewrite using CascadingFilterSystem
- `src/app/year5/create-test/page.tsx` - Complete rewrite using CascadingFilterSystem

### Backup Files (can be deleted after successful testing)
- `src/app/year4/create-test/page-old-backup.tsx`
- `src/app/year4/create-test/page-new.tsx`
- `src/app/year5/create-test/page-old-backup.tsx`
- `src/app/year5/create-test/page-new.tsx`

## Commit & Deploy (Only After Testing)

**DO NOT commit/deploy until all tests pass!**

After successful testing:
```bash
git add .
git commit -m "Implement UWorld-style cascading filter system with progressive disclosure

- Add dynamic counts API endpoint with OR within categories, AND across categories
- Create CascadingFilterSystem component with progressive unlock
- Create NoQuestionsModal for zero results scenario
- Rewrite year4/year5 create-test pages to use cascading filters
- Update selectQuestions logic to support OR within tag types
- Simplify state management (550 lines → 260 lines per page)
- Add real-time count updates with debouncing
- Prevent user confusion with counts going to 0"

git push origin main
```

## Rollback Plan (If Issues Found)

If critical issues are discovered:
```bash
# Restore old implementations
Copy-Item -Path "src\app\year4\create-test\page-old-backup.tsx" -Destination "src\app\year4\create-test\page.tsx" -Force
Copy-Item -Path "src\app\year5\create-test\page-old-backup.tsx" -Destination "src\app\year5\create-test\page.tsx" -Force

# Remove new files
Remove-Item "src\components\CascadingFilterSystem.tsx"
Remove-Item "src\components\NoQuestionsModal.tsx"
Remove-Item "src\app\api\quiz\dynamic-counts\route.ts"

# Revert selectQuestions.ts to git version
git checkout src\lib\quiz\selectQuestions.ts
```

## Documentation
See `CASCADING_FILTERS_IMPLEMENTATION.md` for technical details.

# Draft Question System - Complete Implementation ✅

## Overview
Implemented a draft question system that creates a database question ID immediately when an admin clicks "Add Individual Question". This enables the Question Discussion section to work instantly without requiring the user to save the question first.

## Problem Solved
Previously, the Question Discussion section (comments from previous batches) required a saved question with a database ID. This created friction:
- Users had to fill out question details before they could see/add comments
- Comments section was hidden for new questions
- No way to add comments while drafting a question

## Solution
When an admin clicks "Add Individual Question":
1. **Immediately create a minimal draft question** in the database via API
2. Use that draft question ID in the editor modal
3. Question Discussion section works right away
4. **If user cancels without saving**, automatically delete the draft question
5. **If user saves**, the draft is updated with real content and kept

## Implementation Details

### API Endpoint: `/api/admin/questions/draft/route.ts`

#### POST - Create Draft Question
```typescript
POST /api/admin/questions/draft
```
Creates a minimal question with:
- Text: `"[Draft - Not yet saved]"`
- Explanation: `""`
- 5 default answer options (all incorrect, "Option X" labels)
- Returns: `{ questionId, customId }`

#### DELETE - Remove Draft Question
```typescript
DELETE /api/admin/questions/draft?id=<questionId>
```
Safety checks:
- Only deletes if questionText is still `"[Draft - Not yet saved]"`
- Protects edited questions from accidental deletion
- Returns 404 if question not found or already edited

### Year 4 & Year 5 Bulk Question Manager Changes

#### 1. Draft Creation (`handleAddManualQuestion`)
```typescript
const handleAddManualQuestion = useCallback(async () => {
  // Create draft question in database
  const response = await fetch('/api/admin/questions/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  
  // Question now has a database ID immediately
  const freshQuestion = {
    ...createEmptyQuestion(),
    dbId: data.questionId,
  };
  openQuestionForEditing(freshQuestion);
}, [createEmptyQuestion, openQuestionForEditing]);
```

#### 2. Draft Tracking State
```typescript
const [isDraft, _setIsDraft] = useState(() => question.questionText === '');
const [hasBeenSaved, setHasBeenSaved] = useState(false);
```

#### 3. Cleanup on Cancel
```typescript
// Cleanup effect - runs when modal closes
useEffect(() => {
  return () => {
    if (isDraft && !hasBeenSaved && stableQuestionId) {
      // Delete draft question if not saved
      fetch(`/api/admin/questions/draft?id=${stableQuestionId}`, {
        method: 'DELETE',
      }).catch(error => console.error('Failed to delete draft:', error));
    }
  };
}, [isDraft, hasBeenSaved, stableQuestionId]);

// handleClose - for explicit Cancel/X button clicks
const handleClose = useCallback(async () => {
  if (isDraft && !hasBeenSaved && stableQuestionId) {
    try {
      await fetch(`/api/admin/questions/draft?id=${stableQuestionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete draft question:', error);
    }
  }
  onClose();
}, [isDraft, hasBeenSaved, stableQuestionId, onClose]);
```

#### 4. Mark as Saved
```typescript
const handleSave = async () => {
  // ... saving logic ...
  await onSave(normalised, questionIndex);
  setHasBeenSaved(true); // Prevents deletion on close
  onClose();
};
```

#### 5. UI Updates
- X button: `onClick={handleClose}` (line ~1313)
- Cancel button: `onClick={handleClose}` (line ~1787)

## User Experience

### Before (❌ Old Behavior)
1. Admin clicks "Add Individual Question"
2. Question Discussion section hidden (no ID yet)
3. Must fill out question details
4. Must click Save
5. Only then can see/add comments

### After (✅ New Behavior)
1. Admin clicks "Add Individual Question"
2. Question Discussion section **immediately visible**
3. Can add comments right away
4. Can draft question with comments
5. If Cancel → draft auto-deleted
6. If Save → question kept with all details

## Files Modified

### Created
- `/src/app/api/admin/questions/draft/route.ts` - Draft CRUD API

### Modified
- `/src/app/year4/admin/bulk-question-manager/page.tsx`
  - handleAddManualQuestion: async, creates draft
  - QuestionEditModal: draft tracking, cleanup logic
  - Modal buttons: use handleClose instead of onClose
  
- `/src/app/year5/admin/bulk-question-manager/page.tsx`
  - Same changes as Year 4

## Testing Checklist

### ✅ Draft Creation
- [ ] Click "Add Individual Question" in Year 4
- [ ] Verify Question Discussion section appears (not placeholder)
- [ ] Check database - draft question exists with "[Draft - Not yet saved]" text

### ✅ Draft Deletion on Cancel
- [ ] Click "Add Individual Question"
- [ ] Add a comment (to verify Discussion works)
- [ ] Click "Cancel" button
- [ ] Check database - draft question deleted

### ✅ Draft Deletion on X Button
- [ ] Click "Add Individual Question"
- [ ] Click X button (top right)
- [ ] Check database - draft question deleted

### ✅ Question Save (Not Deleted)
- [ ] Click "Add Individual Question"
- [ ] Fill in question text, answers, etc.
- [ ] Click "Save"
- [ ] Check database - question saved with real content (NOT deleted)

### ✅ Year 5 Functionality
- [ ] Repeat all tests above in Year 5 bulk question manager
- [ ] Verify Year 5 drafts work identically to Year 4

## Technical Notes

### Why `_setIsDraft`?
The setter is prefixed with `_` because we only need to read the initial draft state, not update it. This is intentional and follows TypeScript conventions for unused variables.

### Cleanup Strategy
Two cleanup mechanisms work together:
1. **useEffect cleanup**: Runs when component unmounts (handles all modal closes)
2. **handleClose function**: Explicit async cleanup for button clicks (more reliable)

Both check the same conditions:
- `isDraft === true` (empty questionText)
- `hasBeenSaved === false` (never saved)
- `stableQuestionId` exists (has DB ID)

### Database Safety
The DELETE endpoint protects against accidental deletion:
- Only deletes if questionText is still `"[Draft - Not yet saved]"`
- If user typed anything, deletion is rejected
- Returns 404 for already-deleted or edited questions

## Benefits

### For Admins
- **Instant access** to Question Discussion
- **Natural workflow** - can add comments while drafting
- **No friction** - don't need to save incomplete questions
- **Clean database** - drafts auto-deleted on cancel

### For Development
- **Type-safe** - Full TypeScript support
- **RBAC protected** - Requires admin/master-admin role
- **Cascade deletes** - Prisma handles related records
- **Error handling** - Graceful failures, console logs

### For Users (Students)
- **Better question quality** - Admins can reference comments while creating questions
- **No orphaned drafts** - Database stays clean
- **Consistent data** - Only saved questions appear in quizzes

## Future Enhancements (Optional)

### Potential Improvements
1. **Auto-save drafts** - Periodically save work in progress
2. **Draft recovery** - List and recover abandoned drafts
3. **Draft timestamps** - Show "Last edited X minutes ago"
4. **Draft indicators** - UI badge showing "Draft" status
5. **Collaborative editing** - Lock drafts being edited by others

### Current Limitations
- No draft list/recovery (drafts deleted on cancel)
- No auto-save (manual save only)
- No multi-user draft locking
- No draft history/versioning

## Conclusion

The draft question system successfully removes friction from question creation while maintaining database integrity. Admins can now use Question Discussion immediately, and the system automatically cleans up abandoned drafts.

**Status**: ✅ Fully implemented and ready for testing
**Years**: Year 4 and Year 5 both complete
**Safety**: Protected against accidental deletion
**UX**: Seamless - works as users expect

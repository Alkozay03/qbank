# Question Creation Flow - Complete Technical Explanation

This document explains EVERY step of the question creation flow in the Bulk Question Manager, including all state management, modal behavior, and UI transitions.

---

## 🎬 PHASE 1: User Clicks "Add New Question"

### Step 1.1: Button Click Handler (`handleAddManualQuestion`)
**Location:** Line 356-400 in `bulk-question-manager/page.tsx`

```typescript
const handleAddManualQuestion = useCallback(async () => {
  // ...implementation
}, [createEmptyQuestion, openQuestionForEditing]);
```

**What happens:**

1. **Console Log**: Logs `🆕 [ADD QUESTION] Calling draft API...`

2. **API Call to Create Draft**:
   ```typescript
   const response = await fetch('/api/admin/questions/draft', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
   });
   ```
   - Endpoint: `/api/admin/questions/draft`
   - Method: `POST`
   - Purpose: Creates an EMPTY draft question in the database IMMEDIATELY
   - Returns: `{ questionId: "clxxxxxxxxx" }` (a Prisma CUID)

3. **Why Create Draft First?**
   - So the question has a database ID (`dbId`) before opening the modal
   - This allows comments to be added to the question (requires ID)
   - Prevents orphaned data - if user abandons, the cleanup will delete it

4. **Success Path**:
   ```typescript
   const data = await response.json();
   const draftQuestionId = data.questionId; // e.g., "clxxx123"
   
   const freshQuestion = {
     ...createEmptyQuestion(), // All fields empty/default
     dbId: draftQuestionId,     // Database ID assigned!
     questionText: '[Draft - Not yet saved]', // Special marker
   };
   
   openQuestionForEditing(freshQuestion);
   ```

5. **Fallback Path** (if API fails):
   ```typescript
   const freshQuestion = createEmptyQuestion();
   openQuestionForEditing(freshQuestion);
   ```
   - Creates question without `dbId`
   - Sets `questionText: ''` (empty string)
   - This is where the bug WAS - empty string would fail isDraft check
   - **NOW FIXED**: Empty string also counts as draft

---

## 🪟 PHASE 2: Modal Opens (QuestionEditModal Component)

### Step 2.1: Modal Initialization
**Location:** Line 1180-1207

**State Variables Created:**

```typescript
// 1. EDITED QUESTION STATE
const [editedQuestion, setEditedQuestion] = useState<ExtractedQuestion>(() => ({
  ...question, // Props passed from parent
  occurrences: normalizeOccurrencesForEditing(question.occurrences),
}));
// This holds all the question data being edited
// Updates as user types in form fields

// 2. DRAFT DETECTION
const [isDraft, _setIsDraft] = useState(() => 
  question.questionText === '[Draft - Not yet saved]' || question.questionText === ''
);
// ✅ FIXED: Now checks BOTH marker text AND empty string
// Before: Only checked '[Draft - Not yet saved]'
// Issue: API fallback creates empty string, which failed check
// isDraft = true means: "This is a new unsaved question"
// isDraft = false means: "This is an existing question from database"

// 3. SAVE STATE TRACKING
const [hasBeenSaved, setHasBeenSaved] = useState(() => !isDraft);
// This is the KEY state that controls button display
// hasBeenSaved = false → Show "Save Question" button (blue)
// hasBeenSaved = true → Show "Finalize & Close" button (green)
//
// Initial values:
// - New question: isDraft=true → hasBeenSaved=false → "Save Question"
// - Existing question: isDraft=false → hasBeenSaved=true → "Finalize & Close"

// 4. REF FOR CLEANUP
const hasBeenSavedRef = useRef(hasBeenSaved);
// Why ref? Because useEffect cleanup uses closure
// Closure captures OLD value at mount time
// Ref always points to CURRENT value
// Used in cleanup to decide if draft should be deleted

// 5. STABLE QUESTION ID
const stableQuestionId = editedQuestion.dbId ? String(editedQuestion.dbId) : null;
// Converts database ID to string for API calls
// Used as React key for AdminQuestionComments component
```

### Step 2.2: Console Log Output
**Location:** Line 1200-1205

```typescript
console.warn('🎭 [MODAL INIT] Initial state:', {
  isDraft,           // true for new questions
  hasBeenSaved,      // false for new questions
  stableQuestionId,  // "clxxx123" (the draft ID)
  willShowPlaceholder: !hasBeenSaved && isDraft // true for new questions
});
```

**Expected output for NEW question:**
```
🎭 [MODAL INIT] Initial state: {
  isDraft: true,
  hasBeenSaved: false,
  stableQuestionId: "clxxxxxxxxx",
  willShowPlaceholder: true
}
```

---

## 📋 PHASE 3: Modal UI Rendering (Before Save)

### Step 3.1: Question Discussion Section
**Location:** Line 2090-2120

**Conditional Logic:**
```typescript
{!hasBeenSaved && isDraft ? (
  /* PLACEHOLDER: Instructions for user */
) : stableQuestionId && hasBeenSaved ? (
  /* COMMENT INTERFACE: After save */
) : stableQuestionId ? (
  /* EXISTING QUESTION: Direct comments */
) : null}
```

**For NEW Question** (`!hasBeenSaved && isDraft` = `true`):

**Displays:**
- 📘 Blue box with dashed border
- 💬 Chat icon
- **Heading:** "How to Add Comments"
- **Instructions:**
  1. Click "Save Question" below
  2. The modal will stay open
  3. Add comments using the form that appears here
  4. Each comment saves automatically when posted
  5. Click "Finalize & Close" when you're done
- **Tip:** "💡 Don't worry - this window won't close until you click 'Finalize & Close'"

**Purpose:**
- Tell user they MUST save first before adding comments
- Explain that modal stays open after save (non-standard behavior)
- Set expectations for two-step process

### Step 3.2: Action Buttons
**Location:** Line 2180-2202

```typescript
{!hasBeenSaved ? (
  /* BLUE BUTTON */
  <button onClick={handleSave}>
    Save Question
  </button>
) : (
  /* GREEN BUTTON */
  <button onClick={handleFinalizeAndClose}>
    Finalize & Close
  </button>
)}
```

**For NEW Question** (`hasBeenSaved = false`):
- Shows **"Save Question"** button (blue background)
- Click handler: `handleSave`
- While saving: Shows "Saving..." text
- Disabled during save

---

## 💾 PHASE 4: User Clicks "Save Question"

### Step 4.1: handleSave Function Execution
**Location:** Line 1268-1312

**Console Logs:**
```typescript
console.warn('🔵 [MODAL] handleSave called');
console.warn('🔵 [MODAL] Current state:', {
  hasBeenSaved,      // false
  isDraft,           // true
  stableQuestionId,  // "clxxx123"
  questionText: editedQuestion.questionText?.substring(0, 50)
});
```

### Step 4.2: Data Preparation
```typescript
const normalizedDrafts = normalizeOccurrencesForEditing(occurrences);
const primaryMeta = derivePrimaryOccurrenceMeta(normalizedDrafts);

const normalised = {
  ...editedQuestion,
  tags: normalizeTagValues(editedQuestion.tags),
  occurrences: normalizedDrafts,
  questionYear: primaryMeta.questionYear,
  rotationNumber: primaryMeta.rotationNumber,
  source: 'existing' as const, // ⚠️ CRITICAL!
};
```

**⚠️ CRITICAL Detail: `source: 'existing'`**

Why "existing" for a NEW question?
- The draft already EXISTS in database (created in Phase 1)
- We're UPDATING that existing draft with real data
- If we use `source: 'manual'`, the API creates a NEW question
- That would create duplicates and orphan the draft

### Step 4.3: Save API Call
```typescript
await onSave(normalised, questionIndex);
```

**What `onSave` does:**
- Calls `handleSaveQuestion` function in parent component
- Routes to `/api/admin/questions` (PUT request)
- Updates the draft in database with full question data
- Returns updated question object

### Step 4.4: Mark as Saved
```typescript
console.warn('🟢 [MODAL] onSave completed successfully');
setHasBeenSaved(true); // ⭐ KEY STATE CHANGE!
console.warn('🟢 [MODAL] hasBeenSaved set to true - DRAFT WILL NOT BE DELETED ON CLOSE');

// DON'T close the modal - let user add comments or finalize
// onClose(); // ← This is commented out!
```

**What happens:**
1. `setHasBeenSaved(true)` triggers re-render
2. Modal stays open (no `onClose()` call)
3. UI updates because `hasBeenSaved` changed from `false` to `true`

### Step 4.5: Error Handling
```typescript
} catch (error) {
  console.error('🔴 [MODAL] Error saving question:', error);
  setSaveError(error instanceof Error ? error.message : 'Failed to save question.');
} finally {
  setSaving(false); // Re-enable button
}
```

---

## ✅ PHASE 5: Modal UI Updates (After Save)

### Step 5.1: State Changes Trigger Re-render
- `hasBeenSaved` changed from `false` to `true`
- React re-renders modal component
- All conditional logic re-evaluates

### Step 5.2: Question Discussion Section (NEW UI)
**Location:** Line 2122-2163

**Conditional now evaluates to:**
```typescript
stableQuestionId && hasBeenSaved // true && true = true
```

**Displays:**
1. **Success Banner** (Green gradient box):
   - ✅ Checkmark icon
   - **Heading:** "Question Saved Successfully!"
   - **Message:** "ID: clxxx123 • You can now add comments below"
   - **3 Features:**
     - ✅ Comments save automatically
     - ✅ Edit or delete anytime
     - ✅ Click "Finalize & Close" when done

2. **AdminQuestionComments Component**:
   ```typescript
   <AdminQuestionComments 
     key={stableQuestionId} 
     questionId={stableQuestionId} 
   />
   ```
   - Full comment interface loads
   - Shows existing comments (if any)
   - Comment form (name, body, image upload)
   - "Post Comment" button
   - Each comment saves independently to database

### Step 5.3: Action Button Changes
**Location:** Line 2183-2200

**Conditional now evaluates to:**
```typescript
!hasBeenSaved ? (...) : (...) // false ? ... : GREEN BUTTON
```

**Displays:**
- **"Finalize & Close"** button (green background)
- Click handler: `handleFinalizeAndClose`
- While saving: Shows "Finalizing..." text
- Brighter green color indicates final action

---

## 💬 PHASE 6: User Adds Comments (Optional)

### Step 6.1: Comment Form Interaction
- User types in comment form
- Uploads image (optional)
- Clicks "Post Comment"
- Comment saves to database via API
- Appears in comment list immediately
- **Modal stays open** - user can add multiple comments

### Step 6.2: State Remains Stable
- `hasBeenSaved = true` (unchanged)
- `stableQuestionId = "clxxx123"` (unchanged)
- `isDraft = true` (unchanged, but no longer relevant)
- Button still shows "Finalize & Close"

---

## 🏁 PHASE 7: User Clicks "Finalize & Close"

### Step 7.1: handleFinalizeAndClose Execution
**Location:** Line 1314-1350

```typescript
const handleFinalizeAndClose = async () => {
  if (hasBeenSaved) { // true - we enter this block
    setSaving(true);
    setSaveError(null);
    try {
      // Prepare data same as handleSave
      const normalised = {
        ...editedQuestion,
        tags: normalizeTagValues(editedQuestion.tags),
        occurrences: normalizedDrafts,
        questionYear: primaryMeta.questionYear,
        rotationNumber: primaryMeta.rotationNumber,
        source: 'existing' as const,
      };
      
      console.warn('🔵 [FINALIZE] Calling onSave before close:', {
        dbId: normalised.dbId,
        source: normalised.source,
        hasBeenSaved
      });
      
      await onSave(normalised, questionIndex); // Save any final edits
      onClose(); // ⭐ NOW we close the modal!
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to finalize question.');
    } finally {
      setSaving(false);
    }
  } else {
    // If somehow not saved yet, just close without saving
    onClose();
  }
};
```

**What happens:**
1. **Final save** - captures any last-minute edits user made
2. **onClose()** - triggers modal unmount
3. Modal animates out and disappears
4. User returns to question list

---

## 🧹 PHASE 8: Modal Cleanup (useEffect Unmount)

### Step 8.1: Cleanup Effect Runs
**Location:** Line 1237-1258

```typescript
useEffect(() => {
  return () => {
    // This runs when modal unmounts (closes)
    const wasSaved = hasBeenSavedRef.current; // Get CURRENT value from ref
    
    console.warn('🧹 [CLEANUP] Modal unmounting, checking if should delete draft:', {
      isDraft,
      wasSaved,
      stableQuestionId
    });
    
    if (isDraft && !wasSaved && stableQuestionId) {
      // Delete draft if user abandoned without saving
      fetch(`/api/admin/questions/draft?id=${stableQuestionId}`, {
        method: 'DELETE',
      }).catch(error => {
        console.error('Failed to delete draft question:', error);
      });
    } else {
      console.warn('✅ [CLEANUP] NOT deleting - question was saved or is not a draft');
    }
  };
}, [isDraft, stableQuestionId]);
```

### Step 8.2: Decision Tree

**Scenario A: User clicked "Finalize & Close"**
- `wasSaved = true` (we set this in handleSave)
- `isDraft && !wasSaved` = `true && false` = `false`
- **Draft NOT deleted** ✅
- Console: `✅ [CLEANUP] NOT deleting - question was saved`

**Scenario B: User clicked "Cancel" or X button (handleClose)**
**Location:** Line 1352-1365

```typescript
const handleClose = useCallback(async () => {
  if (isDraft && !hasBeenSaved && stableQuestionId) {
    // Explicitly delete draft before closing
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

- `hasBeenSaved = false` (user never saved)
- Draft deleted immediately
- Then modal closes
- Console: `🧹 [CLEANUP] Deleting unsaved draft`

**Scenario C: User refreshes page or browser crashes**
- Modal unmounts suddenly
- useEffect cleanup runs
- `wasSaved = false` (user never saved)
- **Draft deleted automatically** 🗑️
- Prevents orphaned draft questions in database

---

## 🔄 ALTERNATIVE FLOWS

### Flow A: Editing Existing Question
**User searches for question ID and opens it**

**Modal Initialization:**
```typescript
isDraft = false  // questionText is NOT '[Draft - Not yet saved]' or ''
hasBeenSaved = !isDraft = true
```

**UI Display:**
- No placeholder - shows `<AdminQuestionComments>` immediately
- Button shows "Finalize & Close" (green)
- User can edit and add comments right away
- Click "Finalize & Close" to save and exit

### Flow B: User Abandons Before First Save

**Steps:**
1. Click "Add New Question" → Modal opens
2. Start typing question text
3. Change mind and click X or Cancel
4. `handleClose` runs → Draft deleted
5. Modal closes
6. No question added to database

### Flow C: User Saves But Then Cancels

**Steps:**
1. Click "Add New Question" → Modal opens
2. Fill in question details
3. Click "Save Question" → `hasBeenSaved = true`
4. See comment interface
5. Change mind and click Cancel
6. `handleClose` runs → `hasBeenSaved = true`, so draft NOT deleted
7. Modal closes
8. **Question remains in database** (not deleted)
9. Shows up in question list

---

## 🎯 STATE SUMMARY TABLE

| Phase | isDraft | hasBeenSaved | Button | Discussion UI | Draft in DB? |
|-------|---------|--------------|--------|---------------|--------------|
| **Modal Opens** | `true` | `false` | Save Question (blue) | Placeholder with instructions | Yes (empty) |
| **After handleSave** | `true` | `true` | Finalize & Close (green) | Success banner + comment form | Yes (full data) |
| **After Finalize** | N/A | N/A | N/A | N/A | Yes (permanent) |
| **If Canceled (before save)** | `true` | `false` | N/A | N/A | **Deleted** |
| **If Canceled (after save)** | `true` | `true` | N/A | N/A | Yes (kept) |
| **Editing Existing** | `false` | `true` | Finalize & Close (green) | Comment form immediately | Yes (existing) |

---

## 🐛 THE BUG THAT WAS FIXED

### Before Fix:
```typescript
const [isDraft, _setIsDraft] = useState(() => 
  question.questionText === '[Draft - Not yet saved]'
);
```

**Problem:**
- API creates draft with marker text: `questionText: '[Draft - Not yet saved]'` ✅
- But if API fails, fallback uses: `createEmptyQuestion()` which has `questionText: ''` ❌
- Empty string `''` !== `'[Draft - Not yet saved]'`
- `isDraft = false`
- `hasBeenSaved = true`
- Button shows "Finalize & Close" immediately! 🚨

### After Fix:
```typescript
const [isDraft, _setIsDraft] = useState(() => 
  question.questionText === '[Draft - Not yet saved]' || question.questionText === ''
);
```

**Solution:**
- Now checks BOTH conditions
- Empty string OR marker text = draft
- `isDraft = true` in both cases
- `hasBeenSaved = false`
- Button correctly shows "Save Question" ✅

---

## 📝 KEY TAKEAWAYS

1. **Draft Created First**: Question gets database ID before modal opens
2. **Two-State Flow**: Save → Add Comments → Finalize
3. **Modal Stays Open**: After first save, modal doesn't close (unusual pattern)
4. **Cleanup Protection**: useEffect + ref prevents orphaned drafts
5. **Button Controls Flow**: Blue = first save, Green = final close
6. **State Drives UI**: `hasBeenSaved` boolean controls entire experience
7. **Ref for Cleanup**: `hasBeenSavedRef` solves closure problem
8. **Source = 'existing'**: Critical for updating draft, not creating duplicate

---

## 🔍 DEBUGGING CHECKLIST

If something seems wrong, check console for these logs:

1. ✅ `🆕 [ADD QUESTION] Calling draft API...`
2. ✅ `🆕 [ADD QUESTION] Draft created with ID: clxxx123`
3. ✅ `🎭 [MODAL INIT] Initial state: { isDraft: true, hasBeenSaved: false, ... }`
4. ✅ `🔵 [MODAL] handleSave called`
5. ✅ `🟢 [MODAL] onSave completed successfully`
6. ✅ `🟢 [MODAL] hasBeenSaved set to true - DRAFT WILL NOT BE DELETED ON CLOSE`
7. ✅ `🔵 [FINALIZE] Calling onSave before close`
8. ✅ `🧹 [CLEANUP] NOT deleting - question was saved`

If you see different values or missing logs, that indicates where the issue is!

---

**Last Updated:** October 9, 2025
**Version:** Post-isDraft fix for empty string handling

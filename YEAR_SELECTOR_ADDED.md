# Year Selector Added to Question Editor ✅

## 🎯 What Was Implemented

Added a **Year Selector** to differentiate between Year 4 and Year 5 questions in the admin interface.

---

## ✨ Changes Made

### 1. **Year Selector in Question Editor** (Both Year 4 & Year 5)

**Location**: Top of the question editor modal (before question text)

**Appearance**:
```
┌──────────────────────────────────────────────────┐
│ QUESTION YEAR                                    │
│ Select which year this question belongs to...   │
│                                                  │
│  [  Year 4  ]    [  Year 5  ]                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**How It Works**:
- Click **"Year 4"** button → Removes all Y5 occurrences, adds Y4 occurrence if needed
- Click **"Year 5"** button → Removes all Y4 occurrences, adds Y5 occurrence if needed
- Currently selected year is highlighted in blue
- Unselected year shows as white with blue border

**Benefits**:
- Quick one-click year selection
- Visual feedback showing which year is selected
- Automatically manages the underlying QuestionOccurrence records

---

### 2. **View Questions Page Filtering**

**Year 4 Admin → View Questions**:
- ✅ Now only shows questions with `year: "Y4"` in their occurrences
- ❌ Year 5 questions will NOT appear

**Year 5 Admin → View Questions**:
- ✅ Now only shows questions with `year: "Y5"` in their occurrences
- ❌ Year 4 questions will NOT appear

**Implementation**:
```typescript
// Year 4
body: JSON.stringify({
  year: 'Y4',  // ← Added this filter
  rotations: selRotations,
  // ...
})

// Year 5
body: JSON.stringify({
  year: 'Y5',  // ← Added this filter
  rotations: selRotations,
  // ...
})
```

---

### 3. **API Endpoint Update**

**File**: `/api/admin/questions/search/route.ts`

**Changes**:
- Accepts `year` parameter in request body
- Filters questions by QuestionOccurrence.year
- Only returns questions that have at least one occurrence matching the specified year

**Query**:
```typescript
if (yearFilter) {
  whereFilters.push({
    occurrences: {
      some: {
        year: yearFilter,
      },
    },
  });
}
```

---

## 🎨 User Experience

### When Creating/Editing a Question:

**Step 1**: Open Bulk Question Manager
- Year 4 Admin: `/year4/admin/bulk-question-manager`
- Year 5 Admin: `/year5/admin/bulk-question-manager`

**Step 2**: Create or edit a question

**Step 3**: At the TOP of the editor, you'll see the Year Selector
- Highlighted section with blue border
- Two large buttons: "Year 4" and "Year 5"
- Currently selected year is blue with white text
- Unselected year is white with blue text

**Step 4**: Click your desired year
- Clicking "Year 4" → Question will appear in Year 4
- Clicking "Year 5" → Question will appear in Year 5

**Step 5**: Fill in the rest of the question details and save

---

### When Viewing Questions:

**Year 4 Admin**:
1. Go to "View Questions"
2. See ONLY Year 4 questions
3. Filter by rotation/resource/etc. (all Y4 questions)
4. No Year 5 questions visible

**Year 5 Admin**:
1. Go to "View Questions"
2. See ONLY Year 5 questions
3. Filter by rotation/resource/etc. (all Y5 questions)
4. No Year 4 questions visible

---

## 🔧 Technical Details

### How the Year Selector Works

**Before** (Manual QuestionOccurrence Management):
```typescript
// Had to manually add occurrences like:
occurrences: [
  { year: 'Y4', rotation: 'im', orderIndex: 0 },
  { year: 'Y5', rotation: 'surgery', orderIndex: 1 }
]
```

**After** (One-Click Year Selection):
```typescript
// Click "Year 4" button:
// - Filters out all Y5 occurrences
// - Ensures at least one Y4 occurrence exists
// - Auto-manages the occurrences array

// Click "Year 5" button:
// - Filters out all Y4 occurrences
// - Ensures at least one Y5 occurrence exists
// - Auto-manages the occurrences array
```

### State Management

The year selector modifies `editedQuestion.occurrences`:
```typescript
setEditedQuestion((prev) => {
  const existing = Array.isArray(prev.occurrences) ? [...prev.occurrences] : [];
  const withoutY5 = existing.filter((occ) => occ.year !== 'Y5');
  const hasY4 = withoutY5.some((occ) => occ.year === 'Y4');
  if (!hasY4) {
    withoutY5.push({ 
      clientKey: makeOccurrenceKey(), 
      year: 'Y4', 
      rotation: '', 
      orderIndex: withoutY5.length 
    });
  }
  // ... normalize and update
});
```

---

## 📊 Default Behavior

### Existing Questions
- ✅ If a question already has Y4 occurrences → Shows as "Year 4" selected
- ✅ If a question already has Y5 occurrences → Shows as "Year 5" selected
- ✅ If a question has BOTH → Shows last added year
- ⚠️ If a question has NO occurrences → Neither button highlighted (rare case)

### New Questions
- In Year 4 admin: Click "Year 4" button before saving
- In Year 5 admin: Click "Year 5" button before saving

---

## 🚨 Important Notes

### 1. **One Year at a Time (via Quick Selector)**
The year selector enforces mutual exclusivity:
- Clicking "Year 4" removes ALL Y5 occurrences
- Clicking "Year 5" removes ALL Y4 occurrences
- This prevents confusion and keeps questions clearly separated

### 2. **Advanced: Questions in Both Years**
If you need a question in BOTH years:
- Use the **"Question Appearances"** section lower in the editor
- Manually add multiple occurrences:
  - One with `year: "Y4"`
  - One with `year: "Y5"`
- The year selector will show the last occurrence's year

### 3. **View Questions Filtering**
- Year 4 admin can ONLY see Y4 questions
- Year 5 admin can ONLY see Y5 questions
- This prevents accidental editing of the wrong year's questions

### 4. **Existing Question Pool**
- All current questions default to Year 4 (since they were created before Year 5 existed)
- You can change them to Year 5 by:
  1. Opening the question in Year 5 admin
  2. Clicking "Year 5" button
  3. Saving

---

## 📝 Example Workflow

### Scenario 1: Create a New Year 5 Question

1. Go to **Year 5 Admin** → "Bulk Question Manager"
2. Upload a PDF or click "Add Question Manually"
3. **First thing you see**: Year Selector at the top
4. Click **"Year 5"** button (turns blue)
5. Fill in question text, options, answer, explanation
6. Save the question
7. ✅ Question now appears in Year 5 create-test
8. ❌ Question does NOT appear in Year 4

### Scenario 2: Move an Existing Question from Year 4 to Year 5

1. Go to **Year 5 Admin** → "View Questions"
2. Search for the question (won't find it because it's Y4)
3. Go to **Year 4 Admin** → "View Questions"
4. Find and click "Edit" on the question
5. Click **"Year 5"** button at the top
6. Save the question
7. ✅ Question now appears in Year 5
8. ❌ Question removed from Year 4

### Scenario 3: View Only Year-Specific Questions

**In Year 4 Admin**:
1. Go to "View Questions"
2. See list of ALL Year 4 questions
3. Filter by rotation, resource, etc.
4. All results are Year 4 only

**In Year 5 Admin**:
1. Go to "View Questions"
2. See list of ALL Year 5 questions
3. Filter by rotation, resource, etc.
4. All results are Year 5 only

---

## ✅ Summary

**What You Can Now Do**:
- ✅ Quickly assign questions to Year 4 or Year 5 with one click
- ✅ See visual feedback of which year is selected
- ✅ View Questions page shows only the relevant year
- ✅ No more confusion about which year a question belongs to
- ✅ Clear separation between Year 4 and Year 5 question pools

**Files Modified**:
- `/api/admin/questions/search/route.ts` - Added year filtering
- `/year4/admin/bulk-question-manager/page.tsx` - Added year selector
- `/year5/admin/bulk-question-manager/page.tsx` - Added year selector
- `/year4/admin/view-questions/page.tsx` - Added Y4 filter
- `/year5/admin/view-questions/page.tsx` - Added Y5 filter

**Result**: Complete separation between Year 4 and Year 5 questions in the admin interface! 🎉

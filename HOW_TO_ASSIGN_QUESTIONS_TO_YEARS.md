# How to Assign Questions to Year 4 or Year 5

## 📋 Overview

Questions are assigned to **Year 4** or **Year 5** (or both) using the **QuestionOccurrence** table. This is done through the **"Question Appearances"** section in the Bulk Question Manager.

---

## 🎯 The QuestionOccurrence System

### Database Structure
```typescript
model QuestionOccurrence {
  id         String   @id
  questionId String
  year       String?     // ← THIS is where you set "Y4" or "Y5"
  rotation   String?     // ← The rotation/module (e.g., "im", "surgery", "paeds")
  orderIndex Int
  createdAt  DateTime
  updatedAt  DateTime
}
```

### Key Points:
- **One question** can appear in **multiple years and rotations**
- Each occurrence is a separate entry with its own `year` and `rotation` values
- The `year` field determines whether the question appears in Year 4 or Year 5 (or both)

---

## 🛠️ How to Assign Questions to Years

### Method 1: When Creating a New Question

1. **Go to Admin Panel**:
   - Year 4: Click "Year 4 Admin Settings" → "Bulk Question Manager"
   - Year 5: Click "Year 5 Admin Settings" → "Bulk Question Manager"

2. **Upload or Create a Question**:
   - Upload a PDF with questions
   - Or manually create a question

3. **Scroll to "Question Appearances" Section**:
   - Located near the bottom of the question editor
   - Shows all year/rotation combinations where the question appears

4. **Add an Occurrence**:
   - Click **"+ Add occurrence"** button
   - Fill in:
     - **Year**: Enter `Y4` for Year 4 or `Y5` for Year 5
     - **Rotation**: Enter rotation code (e.g., `im`, `surgery`, `paeds`, `rotation1`)

5. **Save the Question**

---

### Method 2: Editing an Existing Question

1. **Go to "View Questions"**:
   - Year 4: Admin Settings → "View Questions"
   - Year 5: Admin Settings → "View Questions"

2. **Find the Question**:
   - Use filters to find the question you want to edit
   - Click "Edit" button

3. **Modify Question Appearances**:
   - Scroll to the "Question Appearances" section
   - **Add occurrence** to add the question to a new year/rotation
   - **Remove** to delete an occurrence
   - **Edit** existing year/rotation values

4. **Save Changes**

---

## 📝 Examples

### Example 1: Question Only in Year 4
```
Occurrences:
- Year: Y4, Rotation: im
- Year: Y4, Rotation: surgery
```
✅ Appears in Year 4 create-test page
❌ Does NOT appear in Year 5

---

### Example 2: Question Only in Year 5
```
Occurrences:
- Year: Y5, Rotation: paeds
- Year: Y5, Rotation: psych
```
❌ Does NOT appear in Year 4
✅ Appears in Year 5 create-test page

---

### Example 3: Question in BOTH Years
```
Occurrences:
- Year: Y4, Rotation: im
- Year: Y5, Rotation: im
```
✅ Appears in BOTH Year 4 and Year 5
- In Year 4: Shows up when filtering by "im" rotation
- In Year 5: Shows up when filtering by "im" rotation
- Stats tracked separately per year

---

### Example 4: Same Question, Different Rotations Per Year
```
Occurrences:
- Year: Y4, Rotation: im
- Year: Y4, Rotation: surgery
- Year: Y5, Rotation: paeds
- Year: Y5, Rotation: psych
```
✅ Appears in Year 4 for "im" and "surgery" rotations
✅ Appears in Year 5 for "paeds" and "psych" rotations

---

## 🎨 Visual Guide: Question Appearances Section

When editing a question, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ Question Appearances                      [+ Add occurrence] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Year         Rotation                                     │
│ ┌─────┐      ┌─────────────┐        [Remove]            │
│ │ Y4  │      │ im          │                             │
│ └─────┘      └─────────────┘                             │
│                                                           │
│ ┌─────┐      ┌─────────────┐        [Remove]            │
│ │ Y5  │      │ paeds       │                             │
│ └─────┘      └─────────────┘                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ What Happens Behind the Scenes

### When You Add an Occurrence:
```typescript
// Database creates a new QuestionOccurrence entry
{
  id: "abc123",
  questionId: "question_xyz",
  year: "Y5",           // ← This makes it appear in Year 5
  rotation: "im",
  orderIndex: 0
}
```

### When Creating a Quiz:
```typescript
// Year 5 create-test page sends:
POST /api/quiz/generate
{
  year: "Y5",  // ← Only questions with Y5 occurrences are selected
  rotation: "im",
  // ... other filters
}

// API filters questions by:
where: {
  occurrences: {
    some: {
      year: "Y5",    // ← MUST have a Y5 occurrence
      rotation: "im"
    }
  }
}
```

---

## 🚨 Important Notes

### 1. **Year Values Must Be Exact**
- ✅ Use `Y4` for Year 4
- ✅ Use `Y5` for Year 5
- ❌ Don't use `year4`, `Year4`, `4`, etc. (won't work)

### 2. **Rotation Values**
- Use whatever rotation codes you prefer (e.g., `im`, `surgery`, `paeds`, `rotation1`)
- Must match the rotation options in your create-test page
- Case-sensitive (recommend lowercase for consistency)

### 3. **Multiple Occurrences = Flexible Usage**
- Same question can appear in multiple years
- Same question can appear in multiple rotations within a year
- Stats are tracked separately per year (Year 4 stats ≠ Year 5 stats)

### 4. **No Occurrence = Question Won't Appear**
- If a question has NO occurrences with `year: "Y5"`, it won't show up in Year 5
- If a question has NO occurrences at all, it won't appear anywhere in create-test

---

## 🔍 Checking Which Year a Question Belongs To

### Method 1: View Questions Page
1. Go to Admin → "View Questions"
2. Look at the question's details
3. The "Year/Rotation" column shows all occurrences

### Method 2: Database Query
```sql
SELECT 
  q.id,
  q.questionText,
  qo.year,
  qo.rotation
FROM "Question" q
LEFT JOIN "QuestionOccurrence" qo ON qo."questionId" = q.id
WHERE qo.year = 'Y5';  -- Shows all Year 5 questions
```

---

## 📊 Migration: Moving Questions from Year 4 to Year 5

If you want to copy all Year 4 questions to also appear in Year 5:

```sql
-- This adds Y5 occurrences for all questions that have Y4 occurrences
INSERT INTO "QuestionOccurrence" (id, "questionId", year, rotation, "orderIndex", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  "questionId",
  'Y5',                    -- Change to Y5
  rotation,
  "orderIndex",
  NOW(),
  NOW()
FROM "QuestionOccurrence"
WHERE year = 'Y4'
ON CONFLICT DO NOTHING;
```

**⚠️ Warning**: This makes questions appear in BOTH years. If you want questions ONLY in Year 5, you'd need to delete the Y4 occurrences or create new Y5-specific questions.

---

## ✅ Quick Checklist

To make a question appear in Year 5:

- [ ] Open Bulk Question Manager (Year 5 Admin)
- [ ] Create or edit the question
- [ ] Scroll to "Question Appearances" section
- [ ] Click "+ Add occurrence"
- [ ] Enter `Y5` in the Year field
- [ ] Enter rotation code (e.g., `im`, `surgery`)
- [ ] Click "Save Question"
- [ ] Verify in Year 5 create-test page that the question appears

---

## 🎉 Summary

**Questions are assigned to years via the QuestionOccurrence table:**
- **Year field**: `Y4` or `Y5`
- **Rotation field**: Your rotation code
- **Location**: "Question Appearances" section in Bulk Question Manager
- **Flexibility**: One question can be in multiple years and rotations
- **Stats**: Tracked separately per year (Y4 stats ≠ Y5 stats)

Now you can easily assign questions to Year 4, Year 5, or both! 🚀

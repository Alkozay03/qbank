# Question Mode System - Complete Architecture

## Your Question: "Is Mode a Tag?"

**My Answer:** Mode is **NOT a traditional tag** like rotation, resource, discipline, or system. It's a **user-specific state tracker** that's fundamentally different in architecture and purpose.

---

## 🔑 Key Difference: Static Tags vs Dynamic User State

### Traditional Tags (STATIC - Stored on Questions)
```typescript
// Stored in Question.tags array as strings
tags: ["rotation:im", "resource:uworld_s1", "discipline:pharm", "system:cardio"]
```
- **Attached to questions** in the database
- **Same for ALL users** (if a question has `rotation:im`, everyone sees `rotation:im`)
- **Set by admins** when creating questions
- **Never changes** based on who views the question

### Mode (DYNAMIC - Stored per User per Question)
```typescript
// Stored in separate UserQuestionMode table
{
  userId: "user123",
  questionId: "question456",
  mode: "incorrect",  // ← This is DIFFERENT for each user!
  updatedAt: "2025-10-07T..."
}
```
- **NOT attached to questions** directly
- **Different for EACH user** (you might have "incorrect", I might have "unused")
- **Set automatically** by the system when users answer questions
- **Changes dynamically** as users interact with questions

---

## 📊 The Five Mode States

Each question has a **user-specific mode** that represents the user's interaction history:

### 1. **unused** (Default State)
- **Meaning**: User has never seen or attempted this question
- **When set**: Default state for all questions a user hasn't answered
- **Database**: No row exists in UserQuestionMode table (absence = unused)

### 2. **correct** ✅
- **Meaning**: User answered this question correctly in their most recent attempt
- **When set**: After quiz ends, if user selected the correct answer
- **Priority**: Lower than "marked" (if marked, stays marked even if correct)

### 3. **incorrect** ❌
- **Meaning**: User answered this question incorrectly in their most recent attempt
- **When set**: After quiz ends, if user selected a wrong answer
- **Priority**: Lower than "marked" (if marked, stays marked even if incorrect)

### 4. **omitted** ⊘
- **Meaning**: User saw the question but didn't select any answer
- **When set**: After quiz ends, if user left the question blank
- **Priority**: Lower than "marked"

### 5. **marked** 🚩
- **Meaning**: User flagged this question for review (regardless of correct/incorrect)
- **When set**: User clicks "Mark for Review" during quiz
- **Priority**: HIGHEST - once marked, stays marked until unflagged

---

## 🏗️ Architecture: UserQuestionMode Table

```prisma
model UserQuestionMode {
  userId     String
  questionId String
  mode       String   // "unused", "correct", "incorrect", "omitted", "marked"
  updatedAt  DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id])
  question Question @relation(fields: [questionId], references: [id])

  @@id([userId, questionId])  // Composite primary key
  @@index([userId])
  @@index([questionId])
  @@index([userId, mode])     // For fast mode-based filtering
}
```

**Why this design?**
- **Composite key** (`userId` + `questionId`): Each user has exactly ONE mode per question
- **Updated automatically**: System updates this table when quizzes end
- **Fast filtering**: Indexes allow quick "give me all incorrect questions for this user" queries

---

## 🔄 Mode Lifecycle: How Modes Change

### Step 1: User Creates Quiz
```typescript
// User selects: "Show me 20 incorrect questions from Internal Medicine"
POST /api/quiz/filtered-counts
{
  year: "Y5",
  selectedModes: ["incorrect"],  // ← User wants incorrect questions
  rotationKeys: ["im"],
  resourceValues: [],
  disciplineValues: [],
  systemValues: []
}
```

**What happens:**
1. System finds all questions matching rotation=im
2. System looks up UserQuestionMode for this user
3. System filters to only questions where mode="incorrect" for THIS user
4. System returns count: "You have 47 incorrect questions available"

### Step 2: User Takes Quiz
```typescript
// User answers questions in the quiz
// Frontend tracks: answered, omitted, marked
// Nothing written to database yet (quiz is in-progress)
```

### Step 3: User Ends Quiz
```typescript
// POST /api/quiz/[id]/end
// System calculates final mode for each question:

for (const item of quiz.items) {
  let mode: string;
  
  if (item.marked) {
    mode = "marked";  // ← Highest priority
  } else if (item.choiceId === null) {
    mode = "omitted";  // ← No answer selected
  } else if (item.isCorrect === true) {
    mode = "correct";  // ← Correct answer
  } else if (item.isCorrect === false) {
    mode = "incorrect";  // ← Wrong answer
  }
  
  // Update UserQuestionMode table
  await prisma.userQuestionMode.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: { mode, updatedAt: new Date() },
    create: { userId, questionId, mode }
  });
}
```

### Step 4: Next Quiz Creation
```typescript
// User creates another quiz
// System queries UserQuestionMode with updated modes
// Counts reflect the latest user performance
```

---

## 🎯 Mode vs Tag Comparison Table

| Aspect | Traditional Tags (rotation, resource, etc.) | Mode |
|--------|-------------------------------------------|------|
| **Storage Location** | `Question.tags` array | `UserQuestionMode` table |
| **Scope** | Global (same for all users) | User-specific (different per user) |
| **Set By** | Admins (manual) | System (automatic) |
| **Changes Over Time** | No (static) | Yes (dynamic) |
| **Format** | `"category:value"` string | Plain string |
| **Used In Admin UI** | Yes (TagSelector component) | No |
| **Used In Quiz Creation** | Yes (filter criteria) | Yes (filter criteria) |
| **Shown To Students** | Yes (in results) | No (internal tracking only) |
| **Database Relationship** | Many-to-Many (QuestionTag join table) | One-to-One per user (UserQuestionMode table) |

---

## 📋 How Mode Filtering Works in Quiz Creation

### Year 5 Example Scenario

**User Profile:**
- Has answered 200 questions total
- 120 correct, 50 incorrect, 20 omitted, 10 marked
- All questions from Year 5

**User Action:**
Goes to Create Test page, selects:
- Rotation: Internal Medicine 2 (im2)
- Resource: UWorld Step 2
- Mode: **Incorrect** + **Marked**

**Backend Logic:**
```typescript
// Step 1: Find questions matching STATIC tags
const questions = await prisma.question.findMany({
  where: {
    AND: [
      { tags: { some: { type: "ROTATION", value: "Internal Medicine 2" } } },
      { tags: { some: { type: "RESOURCE", value: "UWorld - Step 2" } } },
      { occurrences: { some: { year: "Y5" } } }
    ]
  }
});
// Result: 300 questions match these static criteria

// Step 2: Filter by USER-SPECIFIC mode
const userModes = await prisma.userQuestionMode.findMany({
  where: {
    userId: currentUser.id,
    questionId: { in: questions.map(q => q.id) },
    mode: { in: ["incorrect", "marked"] }  // ← User selected these modes
  }
});
// Result: 25 questions match (15 incorrect, 10 marked)

// Step 3: Return counts to user
return {
  modeCounts: {
    unused: 150,   // Questions user never answered
    incorrect: 15, // Questions user got wrong
    correct: 100,  // Questions user got right
    omitted: 10,   // Questions user skipped
    marked: 10     // Questions user flagged
  }
};
```

---

## 🔍 Mode Priority Rules

When multiple conditions apply, mode is determined by priority:

```typescript
// Priority Order (Highest to Lowest):
1. marked        // If flagged, stays marked regardless of answer
2. omitted       // If not answered (and not marked)
3. incorrect     // If answered wrong (and not marked)
4. correct       // If answered right (and not marked)
5. unused        // If never seen (default/absence)
```

**Example Priority:**
- User marks a question → mode = "marked"
- User then answers it correctly → mode STAYS "marked" (doesn't change to "correct")
- User unflags it → mode updates to "correct" (now reflects answer)

---

## 💡 Why Mode is NOT a Tag

### Tags Are Content Classification
```typescript
// Tags describe WHAT the question is about
"This question is about Internal Medicine pharmacology for the cardiovascular system"
tags: ["rotation:im", "discipline:pharm", "system:cardio"]
```

### Mode Is User Progress Tracking
```typescript
// Mode describes YOUR INTERACTION with the question
"You answered this question incorrectly 2 days ago"
UserQuestionMode: { userId: "you", questionId: "q123", mode: "incorrect" }
```

---

## 🎓 Real-World Example: Two Students, Same Question

**Question:** "A 55-year-old man presents with chest pain..."
- Tags: `["rotation:im", "resource:uworld_s2", "discipline:pharm", "system:cardio"]`
- These tags are THE SAME for everyone

**Student A's Experience:**
```typescript
UserQuestionMode {
  userId: "studentA",
  questionId: "q123",
  mode: "incorrect"  // ← Student A got it wrong
}
```

**Student B's Experience:**
```typescript
UserQuestionMode {
  userId: "studentB",
  questionId: "q123",
  mode: "correct"    // ← Student B got it right
}
```

**Student C's Experience:**
```typescript
// No row in UserQuestionMode table
// mode = "unused"   // ← Student C never saw this question
```

---

## ✅ Summary

### Mode is NOT a Tag Because:

1. **Scope**: Mode is user-specific, tags are global
2. **Storage**: Mode is in UserQuestionMode table, tags are in Question.tags array
3. **Lifecycle**: Mode changes dynamically, tags are static
4. **Purpose**: Mode tracks user progress, tags classify content
5. **Relationship**: Mode is 1-per-user-per-question, tags are many-per-question
6. **Visibility**: Mode is never shown to users, tags are displayed in results

### Mode is a Separate System That:

1. **Works WITH tags** to filter questions (e.g., "incorrect questions from Internal Medicine")
2. **Tracks user performance** automatically when quizzes end
3. **Enables personalized studying** by showing only relevant questions (incorrect, marked, unused)
4. **Updates dynamically** as users practice more questions
5. **Lives in its own table** with optimized indexes for fast queries

**In your codebase:**
- Mode is technically listed as a `TagCategory` type for consistency
- But it's NOT stored as a tag on questions
- It's NOT selectable in the admin TagSelector
- It's NOT displayed to students in quiz results
- It's a completely separate user progress tracking system

Think of it this way:
- **Tags** = What the question IS (content metadata)
- **Mode** = What YOU DID with the question (user interaction state)

# Question Type Tag Implementation - TODO

## What's Done ✅
1. ✅ Added `QUESTION_TYPE` to `PreClerkshipTagType` enum in Prisma schema
2. ✅ Generated Prisma client with new enum value
3. ✅ Updated bulk API route to handle `question_type` / `questiontype` mappings
4. ✅ Updated single question edit API to handle question_type mappings
5. ✅ Created question type options array in create-test page
6. ✅ Created question type state in create-test page

## What Needs to Be Done 🔧

### 1. Update create-test page (Year 2, 1, 3)
**Files:**
- `src/app/year1/create-test/page.tsx`
- `src/app/year2/create-test/page.tsx`
- `src/app/year3/create-test/page.tsx`

**Steps:**
1. Add Question Type filter UI component (after Lecture section)
2. Update counts state to include `questionTypes: Record<string, number>`
3. Update progressive disclosure to allow Question Types after Lecture
4. Update API call to include `questionTypeKeys: selQuestionTypes`
5. Copy the pattern from the Lecture filter

### 2. Update bulk-question-manager (Year 2, 1, 3)
**Files:**
- `src/app/year1/admin/bulk-question-manager/page.tsx`
- `src/app/year2/admin/bulk-question-manager/page.tsx`
- `src/app/year3/admin/bulk-question-manager/page.tsx`

**Steps:**
1. Add QUESTION_TYPE to TAG_TYPE_TO_CATEGORY mapping
2. Add question_type to tag options in TagSelector
3. Update tag validation if needed

### 3. Run database migration
```bash
npx prisma migrate dev --name add_question_type_tag
```

### 4. Fix TypeScript error in server/db.ts
Remove unused eslint-disable directive on line 6

## Question Type Values
- Previous
- TBL
- Books
- Others

## Tag Type Mapping
```typescript
questiontype: PreClerkshipTagType.QUESTION_TYPE,
question_type: PreClerkshipTagType.QUESTION_TYPE,
```

## Progressive Disclosure Order
Mode → System → Discipline → Week → Lecture → **Question Type**

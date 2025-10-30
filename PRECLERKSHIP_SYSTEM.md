# Pre-Clerkship System Implementation

## Overview
This document outlines the implementation of a separate Pre-Clerkship system (Years 1, 2, 3) that runs parallel to the existing Clerkship system (Years 4, 5).

## Database Schema

### ✅ COMPLETED: Prisma Schema Models

All Pre-Clerkship models have been added to `prisma/schema.prisma` with complete separation from Clerkship models.

#### Core Models:

1. **PreClerkshipQuestion**
   - Stores questions for Years 1, 2, 3
   - Fields: `yearLevel` (1, 2, or 3), text, explanation, images, etc.
   - Similar structure to `Question` but completely separate

2. **PreClerkshipQuiz**
   - Student quiz sessions for pre-clerkship years
   - Links to `yearLevel` (1, 2, or 3)

3. **PreClerkshipQuizItem** & **PreClerkshipResponse**
   - Quiz items and student responses
   - Tracks performance, timing, etc.

4. **PreClerkshipAnswer**
   - Multiple choice answers for questions
   - Links to PreClerkshipQuestion

#### Tag System:

**PreClerkshipTag** with **PreClerkshipTagType** enum:
- `SUBJECT` - Academic subjects
- `SYSTEM` - Body systems (Cardiovascular, Respiratory, etc.)
- `TOPIC` - Specific topics
- **`WEEK`** - Week 1 through Week 10 (replaces ROTATION)
- **`LECTURE`** - Lecture 1 through Lecture 10 (new)
- `RESOURCE` - Study resources
- `MODE` - Question modes

#### Supporting Models:

- **PreClerkshipQuestionComment** - Comments and replies on questions
- **PreClerkshipCommentVote** - Upvotes on comments
- **PreClerkshipQuestionOccurrence** - Tracks where questions appeared (year, week, lecture)
- **PreClerkshipUserQuestionMode** - User's interaction with questions (unused, correct, incorrect, etc.)
- **PreClerkshipAnswerVote** - Voting on correct answers during active periods
- **PreClerkshipSimilarQuestionGroup** - Similar question detection (separated by yearLevel)
- **PreClerkshipAIExtraction** & **PreClerkshipExtractionImage** - AI-powered question extraction

#### User Relations:

Added to `User` model:
```prisma
preClerkshipQuestionComments PreClerkshipQuestionComment[]
preClerkshipCommentVotes     PreClerkshipCommentVote[]
preClerkshipQuizzes          PreClerkshipQuiz[]
preClerkshipResponses        PreClerkshipResponse[]
preClerkshipQuestionModes    PreClerkshipUserQuestionMode[]
preClerkshipAnswerVotes      PreClerkshipAnswerVote[]
```

## Key Differences: Clerkship vs Pre-Clerkship

| Feature | Clerkship (Year 4/5) | Pre-Clerkship (Year 1/2/3) |
|---------|---------------------|---------------------------|
| **Tables** | `Question`, `Quiz`, etc. | `PreClerkshipQuestion`, `PreClerkshipQuiz`, etc. |
| **Year Selection** | Year 4 or Year 5 | Year 1, 2, or 3 |
| **Primary Tag** | ROTATION (Pediatrics, Surgery, etc.) | WEEK (Week 1-10) |
| **Secondary Tag** | N/A | LECTURE (Lecture 1-10) |
| **Database** | Current tables | Separate Pre-Clerkship tables |
| **Admin Routes** | `/year4/admin`, `/year5/admin` | `/year1/admin`, `/year2/admin`, `/year3/admin` |

## Next Steps

### TODO: Admin Route Structure
Create admin pages for each pre-clerkship year:
- `/year1/admin/` - Dashboard
- `/year1/admin/bulk-manager` - Question management
- `/year1/admin/similar-questions` - Similarity detection
- (Same for year2 and year3)

### TODO: API Routes
Build separate API endpoints:
- `/api/preclerkship/questions` - Question CRUD
- `/api/preclerkship/quiz` - Quiz generation
- `/api/preclerkship/tags` - Tag management
- `/api/year1/dashboard-stats` - Already created!
- `/api/year2/dashboard-stats` - Already created!
- `/api/year3/dashboard-stats` - Already created!

### TODO: Bulk Question Manager
Modify bulk manager to:
- Show Year 1/2/3 dropdown (not Year 4/5)
- Use Week/Lecture tags instead of Rotation tags
- Separate backend processing

### TODO: Admin Components
Create reusable components:
- Pre-Clerkship question editor
- Week/Lecture tag selectors
- Pre-Clerkship quiz builder
- Stats displays

## Migration Plan

1. ✅ **Schema created** - Prisma schema updated
2. **Run migration** - `npx prisma migrate dev --name add-preclerkship-models`
3. **Generate client** - `npx prisma generate`
4. **Create admin routes** - Build Year 1/2/3 admin pages
5. **Build APIs** - Create backend endpoints
6. **Test isolation** - Verify no data leakage

## Design Principles

### Complete Separation
- ✅ Separate tables for all pre-clerkship data
- ✅ No foreign key relationships between clerkship and pre-clerkship
- ✅ Separate tag systems (WEEK/LECTURE vs ROTATION)
- ⏳ Separate admin routes and APIs (in progress)

### Reusable UI Components
- Same visual design as Year 4/5
- Different backend logic
- Context-based routing (portal determines which system)

### Role-Based Access
- Admins see BOTH systems
- Context determines which admin interface:
  - In Year 1/2/3 portal → Pre-Clerkship admin
  - In Year 4/5 portal → Clerkship admin

## Status

✅ **Phase 1: Database Schema** - COMPLETE
⏳ **Phase 2: Admin Routes** - IN PROGRESS
⏳ **Phase 3: API Endpoints** - PENDING
⏳ **Phase 4: Bulk Manager** - PENDING
⏳ **Phase 5: Components** - PENDING
⏳ **Phase 6: Testing** - PENDING

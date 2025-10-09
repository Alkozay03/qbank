# Similar Questions Detection System - Testing Guide

## ✅ Implementation Complete (NOT DEPLOYED)

This feature uses **AI Semantic Similarity** (OpenAI embeddings) to detect duplicate questions with ≥50% similarity.

---

## 🧪 How to Test in Dev Mode

### Prerequisites:
1. Stop your dev server if running
2. Run: `npx prisma generate` (to update Prisma client with new model)
3. Run: `npx prisma migrate dev --name add_similar_question_groups` (to create database table)
4. Start dev server: `npm run dev`

### Test Scenario 1: Create Similar Questions

1. **Login as Admin** (any admin role)
2. Go to Year 4 Admin Portal → **Bulk Question Manager**
3. Create two similar questions:
   
   **Question 1:**
   ```
   Text: "What is the first-line treatment for acute myocardial infarction in adults?"
   Answers: A) Aspirin B) Morphine C) Beta blocker D) ACE inhibitor
   Correct: A
   ```
   
   **Question 2:**
   ```
   Text: "What is the initial treatment for acute heart attack in adult patients?"
   Answers: A) Aspirin B) Nitroglycerin C) Oxygen D) Heparin
   Correct: A
   ```

4. After creating Question 2, the system will **automatically detect similarity** in the background

5. Navigate to **⚠️ Similar Questions Alert** from the admin hub

### Test Scenario 2: Review Similar Questions

1. In the **Similar Questions Alert** page:
   - You should see a table with grouped similar questions
   - Each row shows:
     - Group number
     - Preview of questions in the group
     - Similarity percentage (should be ≥50%)
     - Detection date
     - **View** button

2. Click **View** to open the side-by-side comparison modal

### Test Scenario 3: Side-by-Side Comparison

In the modal, you should see:
- Both questions displayed side by side
- All details: Question text, answers (correct answer highlighted), explanation, tags, references
- Similarity badges showing percentage between questions
- **Keep** button (green) - keeps the question, removes from alerts
- **Delete** button (red) - deletes the question permanently

### Test Scenario 4: Keep a Question

1. Click **Keep** on one question
2. Confirm the action
3. The question should be removed from the alert
4. If only 1 question remains in the group, the entire group disappears

### Test Scenario 5: Delete a Question

1. Click **Delete** on a question
2. Confirm with the popup: "Are you sure you want to DELETE question XXX?"
3. The question should be:
   - Deleted from the database
   - Removed from the alert
   - Verify it's gone from "View Questions" page

---

## 🔍 How It Works

### 1. **Automatic Detection**
- When an admin creates a question, it's automatically scanned against all existing questions in the same year
- Uses OpenAI's `text-embedding-3-small` model for semantic similarity
- Groups questions with ≥50% similarity together

### 2. **AI Understanding**
The AI understands medical terminology and synonyms:
- "myocardial infarction" ≈ "heart attack"
- "initial treatment" ≈ "first-line treatment"
- "acute" in both contexts
- Different wording but same medical concept → High similarity

### 3. **Year Isolation**
- Year 4 questions only compared to Year 4
- Year 5 questions only compared to Year 5
- Separate databases maintained

### 4. **Smart Grouping**
- If Question A is similar to B, and B is similar to C → All grouped together
- Groups dynamically update as questions are kept/deleted

---

## 📁 Files Changed

### Database
- `prisma/schema.prisma` - Added `SimilarQuestionGroup` model

### Core Logic
- `src/lib/similarity.ts` - OpenAI embedding service
- `src/lib/similar-questions.ts` - Detection and grouping logic

### API Routes
- `src/app/api/admin/questions/route.ts` - Hooked into question creation (POST)
- `src/app/api/admin/similar-questions/keep/route.ts` - Keep action
- `src/app/api/admin/similar-questions/delete/route.ts` - Delete action

### UI Pages
- `src/app/(portal)/year4/admin/similar-questions/page.tsx` - Year 4 alert page
- `src/app/(portal)/year4/admin/similar-questions/client.tsx` - Interactive UI
- `src/app/(portal)/year5/admin/similar-questions/page.tsx` - Year 5 alert page
- `src/app/(portal)/year5/admin/similar-questions/client.tsx` - Interactive UI

### Navigation
- `src/app/(portal)/year4/admin/page.tsx` - Added "Similar Questions Alert" link
- `src/app/(portal)/year5/admin/page.tsx` - Added "Similar Questions Alert" link

### Environment
- `.env.local` - Added OpenAI API key

---

## 💰 Cost Estimate

**OpenAI API Costs (text-embedding-3-small):**
- $0.02 per 1 million tokens (~750,000 words)
- Average medical question: ~100 words = ~130 tokens
- **Cost per comparison: ~$0.000003** (less than a cent)

**Example Scenarios:**
- Compare 1 new question against 1,000 existing: **~$0.003** (less than 1 cent)
- Daily usage (50 new questions, 500 existing each): **~$0.075** (7.5 cents)
- Monthly estimate: **~$2.25**

---

## ⚠️ Important Notes

### Before Production Deployment:
1. ✅ Test thoroughly in dev mode
2. ✅ Verify database migration works correctly
3. ✅ Test with real medical questions
4. ✅ Ensure OpenAI API key is set in production environment
5. ✅ Monitor initial API costs

### Known Behavior:
- Background similarity check runs **asynchronously** - won't slow down question creation
- First-time detection may take 2-3 seconds per question (OpenAI API call)
- Subsequent checks are faster due to embedding caching
- Groups auto-update when questions are kept/deleted

### Access Control:
- **ADMIN** ✅
- **MASTER_ADMIN** ✅
- **WEBSITE_CREATOR** ✅
- **MEMBER** ❌ (redirected)

---

## 🐛 Troubleshooting

### "Cannot find module 'similarQuestionGroup'"
**Fix:** Run `npx prisma generate` to update Prisma client

### "Cannot reach database"
**Fix:** Check `.env.local` for correct `DATABASE_URL`

### "OpenAI API error"
**Fix:** Verify `OPENAI_API_KEY` in `.env.local`

### No similar questions detected
**Check:**
1. Questions are in the same year (year4 vs year5)
2. Questions have substantial text (>20 characters)
3. Similarity is actually ≥50% (try more similar questions)
4. Check browser console for errors

---

## 📊 Testing Checklist

- [ ] Database migration runs successfully
- [ ] Create a new question as admin
- [ ] Create a similar question (should auto-detect)
- [ ] View Similar Questions Alert page
- [ ] Open side-by-side comparison modal
- [ ] Click "Keep" on a question
- [ ] Click "Delete" on a question with confirmation
- [ ] Verify question actually deleted from database
- [ ] Test with Year 4 questions
- [ ] Test with Year 5 questions
- [ ] Verify Year 4 and Year 5 are isolated
- [ ] Check navigation links work from admin hubs

---

## 🚀 Ready to Deploy?

Once all tests pass:
1. Review all changes
2. Commit with message: `feat: add AI-powered duplicate question detection system`
3. Push to GitHub
4. Monitor OpenAI API usage in first 24 hours
5. Check production logs for any errors

---

**Questions or issues? Let me know before deployment!** 🎯

# Similarity Checker - Fixed Implementation

## Date: October 9, 2025

## Overview
The similarity checker now works as intended - checking questions **only when you click the button**, comparing against questions from the **last 24 hours**, with proper **error handling** and **50% threshold**.

---

## ✅ What Was Fixed

### 1. **Removed Automatic Checking** ❌➡️✅
**Problem**: System was checking EVERY new question automatically on create/update  
**Solution**: Removed auto-check from `POST` and `PUT` routes in `src/app/api/admin/questions/route.ts`  
**Impact**: Questions are now created/updated instantly without AI delays

### 2. **Added 24-Hour Filter** 🕒
**Problem**: Was comparing against ALL questions in database (potentially thousands)  
**Solution**: Added `createdAt: { gte: twentyFourHoursAgo }` filter in `check-single/route.ts`  
**Impact**: Much faster processing, relevant comparisons only

### 3. **Fixed Threshold to 50%** 🎯
**Problem**: Threshold was set to 40% (too sensitive)  
**Solution**: Updated to 50% in:
- `src/app/api/admin/similarity/check-single/route.ts`
- `src/lib/similar-questions.ts`
- Both UI files (year4 and year5)

### 4. **Fixed Similarity Percentage Bug** 🐛
**Problem**: Multiplying by 100 twice (scores showed as 8500% instead of 85%)  
**Solution**: Removed duplicate multiplication in `check-single/route.ts` line 108  
**Impact**: Similarity scores now display correctly (0-100%)

### 5. **Added Checkpoint & Error Recovery** 💾
**Problem**: If OpenAI API failed, entire batch would fail silently  
**Solution**: Added checkpoint system that:
- Shows progress every 5 questions
- Logs errors for each failed question
- Prompts user after 3 failures: "Continue or stop?"
- Shows final summary with error count and details

---

## 🎯 How It Works Now

### User Workflow:
1. **Go to**: `/year4/admin/similar-questions` or `/year5/admin/similar-questions`
2. **Click**: "Check Last 24 Hours" button
3. **System**:
   - Fetches all questions created in last 24 hours
   - Processes them **one by one** (not all at once)
   - Shows progress in console every 5 questions
   - If errors occur, prompts user to continue or stop
4. **Results**: Shows summary modal with:
   - Questions processed (e.g., "28/30" if 2 failed)
   - Duplicates found
   - Groups created
   - Error count (if any)

### What Happens Per Question:
1. Get question text + rotation tag
2. Fetch other questions from **same rotation** and **same year** created in **last 24 hours**
3. Send question text to OpenAI to get embedding (vector)
4. Compare embedding against all fetched questions using cosine similarity
5. If similarity ≥ 50%, add to similarity group
6. If error, log it and continue with next question

---

## 📊 Performance Estimates

**Based on OpenAI `text-embedding-3-small` model:**

| Scenario | Questions to Check | Expected Time | Cost (approx) |
|----------|-------------------|---------------|---------------|
| Last 24 Hours (typical) | 10-50 questions | 30 seconds - 2 minutes | $0.01 - $0.05 |
| Last Week | 50-200 questions | 2-8 minutes | $0.05 - $0.20 |
| Custom Range (heavy) | 200+ questions | 8+ minutes | $0.20+ |

**Note**: Processing is sequential (one at a time) to avoid rate limits and allow checkpoints.

---

## 🔧 Technical Details

### Files Modified:
1. `src/app/api/admin/questions/route.ts` - Removed auto-check
2. `src/app/api/admin/similarity/check-single/route.ts` - Added 24hr filter, fixed threshold, fixed percentage bug
3. `src/lib/similar-questions.ts` - Updated threshold to 50%
4. `src/lib/similarity.ts` - (no changes, already correct)
5. `src/app/(portal)/year4/admin/similar-questions/client.tsx` - Added checkpoints, updated UI
6. `src/app/(portal)/year5/admin/similar-questions/client.tsx` - Added checkpoints, updated UI

### Key Functions:
- **`checkForSimilarQuestions()`** - Main similarity logic (unused now, kept for future)
- **`findSimilarQuestions()`** - Core AI comparison using OpenAI embeddings
- **`handleBatchCheck()`** - UI function that processes questions with checkpoints

### Database Schema:
```typescript
SimilarQuestionGroup {
  id: string
  questionIds: string[]         // Array of similar question IDs
  similarityScores: Json         // {"q1-q2": 85, "q1-q3": 72}
  yearContext: string            // "year4" or "year5"
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 🚀 Usage Instructions

### For Admins:

1. **Daily Check** (recommended):
   - After adding questions for the day, click **"Check Last 24 Hours"**
   - Takes 30 seconds to 2 minutes depending on volume

2. **Weekly Cleanup**:
   - Click **"Check Last Week"** to catch any missed duplicates
   - Takes a few minutes

3. **Custom Date Range**:
   - Use for specific imports or troubleshooting
   - Select date range and click "Run Check"

4. **Reviewing Duplicates**:
   - Click **"View"** on any group
   - Side-by-side comparison modal opens
   - For each question, click:
     - **Keep** - Remove from alert, keep in database
     - **Delete** - Permanently delete the question

---

## ⚠️ Important Notes

- **Cost**: OpenAI embedding API costs ~$0.0002 per 1K tokens. 50 questions ≈ $0.05
- **Speed**: Sequential processing prevents rate limits but takes longer
- **Errors**: If many errors occur, check OpenAI API key and quota
- **24-Hour Window**: Only compares against recent questions (configurable in code)
- **Threshold**: 50% similarity catches most duplicates without false positives

---

## 🐛 Troubleshooting

**"No questions found"**
- Check date range is correct
- Verify questions have rotation tags (peds, surgery, etc.)

**"Failed to check question"**
- Check OpenAI API key in environment variables
- Check API quota limits
- Check internet connection

**Checkpoint prompts appearing**
- Normal if API is slow or has intermittent issues
- Click "OK" to continue or "Cancel" to stop

**Similarity scores seem wrong**
- Should be 50-100% for similar questions
- If showing very high numbers (>100), there's a bug - report it

---

## 💡 Future Enhancements (Not Implemented)

- Real-time progress bar instead of console logs
- Batch embedding requests (faster but riskier)
- Resume from checkpoint if page closes
- Email notifications when duplicates found
- Weekly automated scans

---

## Support

If the similarity checker isn't working:
1. Check console for error messages (F12 in browser)
2. Verify OpenAI API key is set in `.env`
3. Check database has `SimilarQuestionGroup` table
4. Review logs in terminal where app is running

---

**Status**: ✅ FULLY FUNCTIONAL  
**Last Updated**: October 9, 2025  
**Version**: 2.0 (Manual-only with checkpoints)

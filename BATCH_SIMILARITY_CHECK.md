# Batch Similarity Check System

## Overview
The batch similarity check feature allows admins to retroactively check recently added questions for duplicates. This complements the automatic real-time similarity checks that run when questions are created.

## How It Works

### Smart Filtering by Year + Rotation
Instead of comparing every question against every other question (which would be slow and expensive), the system:

1. **Groups new questions by rotation** (e.g., Pediatrics, Surgery, Internal Medicine)
2. **Only compares questions within the same year and rotation**
3. **Processes in parallel batches** (5 questions at a time) for speed

**Example:**
- If you add 10 new Year 4 Pediatrics questions, they'll only be compared against existing Year 4 Pediatrics questions
- Year 4 Surgery questions won't be checked against Pediatrics (different topics)
- Year 5 questions won't be checked against Year 4 (different curriculum level)

### Why This Approach is Better

**Before (checking everything):**
- 100 new questions × 5,000 total questions = 500,000 comparisons
- Would take hours and cost hundreds of dollars in API calls

**Now (filtering by year + rotation):**
- 10 Year 4 Pediatrics questions × 600 Year 4 Pediatrics questions = 6,000 comparisons
- Takes ~2 minutes and costs a few cents

## Using the Batch Check

### Location
Navigate to: **Year 4 Admin → Similar Questions** or **Year 5 Admin → Similar Questions**

### Quick Check Options

#### 1. Check Last 24 Hours (Blue Button)
- Checks all questions created in the past day
- Best for: Daily review after bulk imports
- Takes: 1-3 minutes for typical daily uploads

#### 2. Check Last Week (Purple Button)
- Checks all questions from the past 7 days
- Best for: Weekly audits or catching up after missed days
- Takes: 5-10 minutes depending on volume

#### 3. Custom Date Range (Gray Button)
- Opens date picker to select specific date range
- Best for: Auditing a specific import batch or date range
- Example: "Check all questions from October 1-7"

### What Happens During Check

1. **System fetches** all questions in your selected date range
2. **Groups them** by rotation (Pediatrics, Surgery, etc.)
3. **For each rotation:**
   - Gets all existing questions in that rotation
   - Compares new questions against existing ones using OpenAI embeddings
   - Finds duplicates with ≥40% similarity
4. **Creates similarity groups** automatically
5. **Refreshes the page** to show newly found duplicates

### Reading the Results

After the check completes, you'll see a message like:

```
✅ Processed 28 questions in 2.45s. 
Found 5 questions with potential duplicates.
```

**Breakdown:**
- **28 questions**: Total questions checked in your date range
- **2.45s**: How long the check took
- **5 questions**: How many had duplicates found

The page will refresh and show the new similarity groups in the table below.

## Vercel Timeout Handling (Hobby Plan)

### The Problem
Vercel's Hobby plan has a **10-second timeout** for API calls. If you try to check 100+ questions at once, it may timeout.

### The Solution
The batch check automatically:
1. **Stops before timing out** (at 9 seconds)
2. **Saves all results processed so far**
3. **Shows a warning message**:
   ```
   ⚠️ Some questions may not have been processed due to timeout.
   Run the check again to continue.
   ```

### How to Handle Timeouts
Simply click the same button again! The system will:
- Skip questions already checked
- Continue where it left off
- Process the remaining questions

**Example workflow for 200 questions:**
1. First run: Processes 50 questions, timeout warning
2. Second run: Processes next 50 questions, timeout warning
3. Third run: Processes next 50 questions, timeout warning
4. Fourth run: Processes remaining 50 questions, complete ✅

## Technical Details

### API Endpoint
**POST** `/api/admin/similarity/batch`

**Request body:**
```json
{
  "yearContext": "year4" | "year5",
  "hoursAgo": 24,  // Optional: check last N hours
  "dateFrom": "2025-10-01T00:00:00Z",  // Optional: custom start date
  "dateTo": "2025-10-07T23:59:59Z"     // Optional: custom end date
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 28 questions in 2.45s...",
  "processedQuestions": 28,
  "newGroupsCreated": 3,
  "questionsWithDuplicates": 5,
  "timeoutWarning": false,
  "details": [
    {
      "questionId": "abc123",
      "customId": 1234,
      "rotation": "Pediatrics",
      "duplicatesFound": 2
    }
  ]
}
```

### Processing Logic

1. **Fetch new questions** in date range, filtered by year
2. **Group by rotation** using `questionTags` with `type: ROTATION`
3. **For each rotation:**
   - Fetch all existing questions in that rotation
   - Process new questions in batches of 5 (parallel)
   - For each new question:
     - Get OpenAI embedding (`text-embedding-3-small`)
     - Compare against all existing questions
     - Find matches ≥40% similarity
     - Create or update `SimilarQuestionGroup` records
4. **Handle timeouts** by checking elapsed time before each batch
5. **Return results** with summary statistics

### Database Impact

**Reads:**
- 1 query to fetch new questions
- 1 query per rotation to fetch existing questions
- 1 query per new question to check existing groups

**Writes:**
- 1 insert per new similarity group found
- 1 update if questions already belong to existing group

**Cost:**
- OpenAI API: ~$0.0001 per question comparison
- Database: Minimal (few hundred queries max)
- Example: 50 questions × 500 comparisons = $5 in API costs

## Best Practices

### Daily Workflow
1. Bulk import new questions
2. At end of day, click **"Check Last 24 Hours"**
3. Review similarity alerts
4. Keep unique questions, delete duplicates

### Weekly Audit
1. Every Monday, click **"Check Last Week"**
2. Catch any missed duplicates from weekend imports
3. Clean up similarity groups

### After Large Import
1. Use **Custom Date Range** to check specific import batch
2. Example: "October 1-3" if you imported 200 UWorld questions
3. Run multiple times if timeout occurs

### When to Use What

| Scenario | Button | Reason |
|----------|--------|--------|
| Daily check after adding 10-30 questions | Last 24 Hours | Fast, catches recent imports |
| Weekly cleanup | Last Week | Broader coverage |
| Imported 100+ questions on specific day | Custom Range | Target specific batch |
| Retroactive audit of old questions | Custom Range | Check historical data |

## Limitations

### Vercel Hobby Plan
- **10-second timeout**: May need multiple runs for large batches
- **No background jobs**: Can't queue long-running checks
- **Workaround**: Run batch check multiple times, system continues where it left off

### OpenAI Rate Limits
- **Free tier**: 3 requests/minute (not viable)
- **Paid tier**: 3,500 requests/minute (fine for this use case)
- **Batch size**: Limited to 5 parallel questions to avoid rate limits

### Similarity Threshold
- **40% threshold**: May catch some false positives
- Questions with similar topics but different content may be flagged
- **Manual review required**: Admins must review each alert

## Upgrading to Pro Plan

If you upgrade to Vercel Pro:
1. Change `maxDuration` in `/api/admin/similarity/batch/route.ts` to `60`
2. Increase batch size from `5` to `20` for faster processing
3. Can check 200+ questions in one run without timeouts

**Cost:** $20/month for Pro plan

## Troubleshooting

### "No questions found in date range"
- Check the date picker values
- Ensure questions were created with `createdAt` timestamps
- Try expanding the date range

### "Timeout approaching, stopping"
- Normal behavior on Hobby plan with many questions
- Click the same button again to continue
- System will process remaining questions

### "Failed to run batch similarity check"
- Check OpenAI API key is set in environment variables
- Verify user has ADMIN, MASTER_ADMIN, or WEBSITE_CREATOR role
- Check browser console for detailed error

### Questions not being compared
- Verify questions have rotation tags assigned
- Check `questionTags` table for `type: ROTATION` entries
- Questions without rotation tags go to "No Rotation" group

## Future Enhancements

### Potential Improvements
1. **Background job queue** (requires upgrade or external service like Upstash QStash)
2. **Real-time progress updates** (using Server-Sent Events or WebSockets)
3. **Email notifications** when batch check completes
4. **Scheduled daily checks** (using Vercel Cron Jobs)
5. **Batch similarity scoring** (compare multiple questions at once)

### Why Not Implemented Yet
- Hobby plan limitations
- Extra cost/complexity
- Current solution works well for typical use case (daily checks of 20-50 questions)

---

**Last Updated:** October 9, 2025  
**Author:** AI Assistant  
**Version:** 1.0

-- Add performance indexes to improve query speed
-- These indexes will dramatically improve the performance page load time

-- Indexes for Response table (most critical for performance)
CREATE INDEX IF NOT EXISTS "idx_response_userid" ON "Response" ("userId");
CREATE INDEX IF NOT EXISTS "idx_response_userid_createdat" ON "Response" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_response_userid_correct_createdat" ON "Response" ("userId", "isCorrect", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_response_quizitemid" ON "Response" ("quizItemId");

-- Indexes for QuizItem table
CREATE INDEX IF NOT EXISTS "idx_quizitem_quizid" ON "QuizItem" ("quizId");
CREATE INDEX IF NOT EXISTS "idx_quizitem_questionid" ON "QuizItem" ("questionId");

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('Response', 'QuizItem')
ORDER BY tablename, indexname;

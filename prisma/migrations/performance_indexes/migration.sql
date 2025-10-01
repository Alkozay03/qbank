-- Performance optimization indexes for Response table
-- These indexes will dramatically speed up the performance page queries

-- Index for userId queries (most common filter)
CREATE INDEX IF NOT EXISTS "Response_userId_idx" ON "Response"("userId");

-- Index for userId + createdAt (for ordered queries by user)
CREATE INDEX IF NOT EXISTS "Response_userId_createdAt_idx" ON "Response"("userId", "createdAt");

-- Index for quizItemId (for joins)
CREATE INDEX IF NOT EXISTS "Response_quizItemId_idx" ON "Response"("quizItemId");

-- Composite index for performance queries
CREATE INDEX IF NOT EXISTS "Response_userId_isCorrect_createdAt_idx" ON "Response"("userId", "isCorrect", "createdAt");

-- Index for QuizItem questionId (for joins)
CREATE INDEX IF NOT EXISTS "QuizItem_questionId_idx" ON "QuizItem"("questionId");

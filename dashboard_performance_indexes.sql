-- Simple performance indexes for dashboard queries
-- Focus on the most critical slow queries causing 200+ second load times

-- User queries optimization
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User" ("role");
CREATE INDEX IF NOT EXISTS "idx_user_email_id" ON "User" ("email", "id");

-- Quiz queries optimization
CREATE INDEX IF NOT EXISTS "idx_quiz_userid" ON "Quiz" ("userId");
CREATE INDEX IF NOT EXISTS "idx_quiz_createdat" ON "Quiz" ("createdAt");

-- Response queries optimization (most critical for dashboard)
CREATE INDEX IF NOT EXISTS "idx_response_userid" ON "Response" ("userId");
CREATE INDEX IF NOT EXISTS "idx_response_iscorrect" ON "Response" ("isCorrect");
CREATE INDEX IF NOT EXISTS "idx_response_quizitemid_iscorrect" ON "Response" ("quizItemId", "isCorrect");

-- QuizItem optimization for joins
CREATE INDEX IF NOT EXISTS "idx_quizitem_quizid" ON "QuizItem" ("quizId");
CREATE INDEX IF NOT EXISTS "idx_quizitem_questionid" ON "QuizItem" ("questionId");

-- Question table optimization
CREATE INDEX IF NOT EXISTS "idx_question_createdat" ON "Question" ("createdAt");

-- Answer table optimization (mapped to Choice in schema)
CREATE INDEX IF NOT EXISTS "idx_answer_questionid" ON "Answer" ("questionId");

-- Notification optimization
CREATE INDEX IF NOT EXISTS "idx_notification_isdeleted" ON "Notification" ("isDeleted");
CREATE INDEX IF NOT EXISTS "idx_notificationread_userid" ON "NotificationRead" ("userId");

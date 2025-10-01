-- Additional performance indexes for remaining slow queries
-- These will optimize joins and complex queries

-- Indexes for Tag and QuestionTag tables (for quiz options queries)
CREATE INDEX IF NOT EXISTS "idx_tag_type_value" ON "Tag" ("type", "value");
CREATE INDEX IF NOT EXISTS "idx_questiontag_questionid" ON "QuestionTag" ("questionId");
CREATE INDEX IF NOT EXISTS "idx_questiontag_tagid" ON "QuestionTag" ("tagId");

-- Indexes for Quiz table (for user quiz queries)
CREATE INDEX IF NOT EXISTS "idx_quiz_userid" ON "Quiz" ("userId");
CREATE INDEX IF NOT EXISTS "idx_quiz_userid_createdat" ON "Quiz" ("userId", "createdAt");

-- Indexes for Notification tables (for notification queries)
CREATE INDEX IF NOT EXISTS "idx_notification_isdeleted" ON "Notification" ("isDeleted");
CREATE INDEX IF NOT EXISTS "idx_notificationread_userid" ON "NotificationRead" ("userId");
CREATE INDEX IF NOT EXISTS "idx_notificationread_notificationid" ON "NotificationRead" ("notificationId");
CREATE INDEX IF NOT EXISTS "idx_notificationread_userid_notificationid" ON "NotificationRead" ("userId", "notificationId");

-- Composite indexes for complex join queries
CREATE INDEX IF NOT EXISTS "idx_response_quizitem_quiz" ON "Response" ("quizItemId") INCLUDE ("isCorrect", "createdAt");

-- Verify all new indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('Tag', 'QuestionTag', 'Quiz', 'Notification', 'NotificationRead')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Additional critical indexes for JOIN performance
-- These target the specific slow queries we see in the logs

-- Indexes for Quiz table (heavy JOIN usage)
CREATE INDEX IF NOT EXISTS "idx_quiz_userid" ON "Quiz" ("userId");

-- Indexes for QuizItem JOINs (QuizItem -> Quiz -> User)
CREATE INDEX IF NOT EXISTS "idx_quizitem_id_quizid" ON "QuizItem" ("id", "quizId");

-- Indexes for Response JOINs (Response -> QuizItem -> Quiz)
CREATE INDEX IF NOT EXISTS "idx_response_quizitemid_id" ON "Response" ("quizItemId", "id");

-- Indexes for Question JOINs (frequently accessed)
CREATE INDEX IF NOT EXISTS "idx_question_id" ON "Question" ("id");

-- Indexes for Tag-related queries (showing in logs)
CREATE INDEX IF NOT EXISTS "idx_questiontag_questionid" ON "QuestionTag" ("questionId");
CREATE INDEX IF NOT EXISTS "idx_questiontag_tagid" ON "QuestionTag" ("tagId");
CREATE INDEX IF NOT EXISTS "idx_tag_type" ON "Tag" ("type");
CREATE INDEX IF NOT EXISTS "idx_tag_type_value" ON "Tag" ("type", "value");

-- Indexes for Notification queries
CREATE INDEX IF NOT EXISTS "idx_notification_isdeleted" ON "Notification" ("isDeleted");
CREATE INDEX IF NOT EXISTS "idx_notificationread_userid" ON "NotificationRead" ("userId");
CREATE INDEX IF NOT EXISTS "idx_notificationread_userid_notificationid" ON "NotificationRead" ("userId", "notificationId");

-- Verify all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('Quiz', 'QuizItem', 'Response', 'Question', 'QuestionTag', 'Tag', 'Notification', 'NotificationRead')
ORDER BY tablename, indexname;

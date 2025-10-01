-- Performance indexes for optimizing slow queries
-- Based on actual database schema

-- User related indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);

-- Quiz and QuizItem indexes
CREATE INDEX IF NOT EXISTS idx_quiz_userid ON "Quiz"("userId");
CREATE INDEX IF NOT EXISTS idx_quiz_userid_createdat ON "Quiz"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_quizitem_quizid ON "QuizItem"("quizId");

-- Response indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_response_userid ON "Response"("userId");
CREATE INDEX IF NOT EXISTS idx_response_quizitemid ON "Response"("quizItemId");
CREATE INDEX IF NOT EXISTS idx_response_userid_createdat ON "Response"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_response_iscorrect ON "Response"("isCorrect");

-- Question and Answer indexes
CREATE INDEX IF NOT EXISTS idx_question_subject ON "Question"(subject);
CREATE INDEX IF NOT EXISTS idx_answer_questionid ON "Answer"("questionId");

-- Tag and QuestionTag indexes
CREATE INDEX IF NOT EXISTS idx_tag_type ON "Tag"(type);
CREATE INDEX IF NOT EXISTS idx_questiontag_questionid ON "QuestionTag"("questionId");
CREATE INDEX IF NOT EXISTS idx_questiontag_tagid ON "QuestionTag"("tagId");

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_isdeleted ON "Notification"("isDeleted");
CREATE INDEX IF NOT EXISTS idx_notificationread_userid ON "NotificationRead"("userId");

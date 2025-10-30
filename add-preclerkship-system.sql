-- Migration: Add Pre-Clerkship Models
-- Created: 2025-10-30
-- Description: Adds complete Pre-Clerkship system (Years 1, 2, 3) with separate tables from Clerkship system

-- ============================================================================
-- Create Pre-Clerkship Tag Type Enum
-- ============================================================================

CREATE TYPE "PreClerkshipTagType" AS ENUM ('SUBJECT', 'SYSTEM', 'TOPIC', 'WEEK', 'LECTURE', 'RESOURCE', 'MODE');

-- ============================================================================
-- Pre-Clerkship Core Tables
-- ============================================================================

-- PreClerkshipQuestion Table
CREATE TABLE "PreClerkshipQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yearLevel" INTEGER NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objective" TEXT,
    "customId" INTEGER UNIQUE,
    "text" TEXT,
    "updatedAt" TIMESTAMP(3),
    "iduScreenshotUrl" TEXT,
    "questionImageUrl" TEXT,
    "explanationImageUrl" TEXT,
    "references" TEXT,
    "isAnswerConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "embedding" JSONB
);

CREATE INDEX "idx_preclerkship_question_id" ON "PreClerkshipQuestion"("id");
CREATE INDEX "idx_preclerkship_question_yearlevel" ON "PreClerkshipQuestion"("yearLevel");

-- PreClerkshipAnswer Table
CREATE TABLE "PreClerkshipAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PreClerkshipAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PreClerkshipQuiz Table
CREATE TABLE "PreClerkshipQuiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "mode" "QuizMode" NOT NULL DEFAULT 'RANDOM',
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "status" TEXT,
    CONSTRAINT "PreClerkshipQuiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_quiz_userid" ON "PreClerkshipQuiz"("userId");
CREATE INDEX "idx_preclerkship_quiz_userid_createdat" ON "PreClerkshipQuiz"("userId", "createdAt");
CREATE INDEX "idx_preclerkship_quiz_yearlevel" ON "PreClerkshipQuiz"("yearLevel");

-- PreClerkshipQuizItem Table
CREATE TABLE "PreClerkshipQuizItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "marked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderInQuiz" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreClerkshipQuizItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipQuizItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "PreClerkshipQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_quizitem_id_quizid" ON "PreClerkshipQuizItem"("id", "quizId");
CREATE INDEX "idx_preclerkship_quizitem_questionid" ON "PreClerkshipQuizItem"("questionId");
CREATE INDEX "idx_preclerkship_quizitem_quizid" ON "PreClerkshipQuizItem"("quizId");

-- PreClerkshipResponse Table
CREATE TABLE "PreClerkshipResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizItemId" TEXT NOT NULL,
    "choiceId" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSeconds" INTEGER,
    "changeCount" INTEGER DEFAULT 0,
    "userId" TEXT,
    CONSTRAINT "PreClerkshipResponse_quizItemId_fkey" FOREIGN KEY ("quizItemId") REFERENCES "PreClerkshipQuizItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_response_quizitem_quiz" ON "PreClerkshipResponse"("quizItemId", "isCorrect", "createdAt");
CREATE INDEX "idx_preclerkship_response_quizitemid" ON "PreClerkshipResponse"("quizItemId");
CREATE INDEX "idx_preclerkship_response_quizitemid_id" ON "PreClerkshipResponse"("quizItemId", "id");
CREATE INDEX "idx_preclerkship_response_userid" ON "PreClerkshipResponse"("userId");
CREATE INDEX "idx_preclerkship_response_userid_correct_createdat" ON "PreClerkshipResponse"("userId", "isCorrect", "createdAt");
CREATE INDEX "idx_preclerkship_response_userid_createdat" ON "PreClerkshipResponse"("userId", "createdAt");

-- ============================================================================
-- Pre-Clerkship Tag System
-- ============================================================================

-- PreClerkshipTag Table
CREATE TABLE "PreClerkshipTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" "PreClerkshipTagType" NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "PreClerkshipTag_type_value_key" UNIQUE ("type", "value")
);

CREATE INDEX "idx_preclerkship_tag_type" ON "PreClerkshipTag"("type");
CREATE INDEX "idx_preclerkship_tag_type_value" ON "PreClerkshipTag"("type", "value");

-- PreClerkshipQuestionTag Table
CREATE TABLE "PreClerkshipQuestionTag" (
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("questionId", "tagId"),
    CONSTRAINT "PreClerkshipQuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipQuestionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PreClerkshipTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_questiontag_questionid" ON "PreClerkshipQuestionTag"("questionId");
CREATE INDEX "idx_preclerkship_questiontag_tagid" ON "PreClerkshipQuestionTag"("tagId");

-- ============================================================================
-- Pre-Clerkship Comments and Voting
-- ============================================================================

-- PreClerkshipQuestionComment Table
CREATE TABLE "PreClerkshipQuestionComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "authorName" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'runner',
    "parentId" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PreClerkshipQuestionComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipQuestionComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipQuestionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PreClerkshipQuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_questioncomment_questionid" ON "PreClerkshipQuestionComment"("questionId");
CREATE INDEX "idx_preclerkship_questioncomment_createdbyid" ON "PreClerkshipQuestionComment"("createdById");
CREATE INDEX "idx_preclerkship_questioncomment_parentid" ON "PreClerkshipQuestionComment"("parentId");

-- PreClerkshipCommentVote Table
CREATE TABLE "PreClerkshipCommentVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreClerkshipCommentVote_userId_commentId_key" UNIQUE ("userId", "commentId"),
    CONSTRAINT "PreClerkshipCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PreClerkshipQuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_commentvote_commentid" ON "PreClerkshipCommentVote"("commentId");
CREATE INDEX "idx_preclerkship_commentvote_userid" ON "PreClerkshipCommentVote"("userId");

-- ============================================================================
-- Pre-Clerkship Supporting Tables
-- ============================================================================

-- PreClerkshipQuestionOccurrence Table
CREATE TABLE "PreClerkshipQuestionOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "year" TEXT,
    "weekNumber" INTEGER,
    "lecture" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "uniq_preclerkship_questionoccurrence" UNIQUE ("questionId", "year", "weekNumber", "lecture"),
    CONSTRAINT "PreClerkshipQuestionOccurrence_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_questionoccurrence_questionid" ON "PreClerkshipQuestionOccurrence"("questionId");

-- PreClerkshipUserQuestionMode Table
CREATE TABLE "PreClerkshipUserQuestionMode" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("userId", "questionId"),
    CONSTRAINT "PreClerkshipUserQuestionMode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipUserQuestionMode_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_userquestionmode_userid" ON "PreClerkshipUserQuestionMode"("userId");
CREATE INDEX "idx_preclerkship_userquestionmode_questionid" ON "PreClerkshipUserQuestionMode"("questionId");
CREATE INDEX "idx_preclerkship_userquestionmode_userid_mode" ON "PreClerkshipUserQuestionMode"("userId", "mode");

-- PreClerkshipAnswerVote Table
CREATE TABLE "PreClerkshipAnswerVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "lectureNum" INTEGER NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "uniq_preclerkship_answer_vote" UNIQUE ("questionId", "userId", "academicYear", "weekNumber", "lectureNum", "yearLevel"),
    CONSTRAINT "PreClerkshipAnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreClerkshipAnswerVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_preclerkship_answer_vote_questionid" ON "PreClerkshipAnswerVote"("questionId");
CREATE INDEX "idx_preclerkship_answer_vote_userid" ON "PreClerkshipAnswerVote"("userId");
CREATE INDEX "idx_preclerkship_answer_vote_question_period" ON "PreClerkshipAnswerVote"("questionId", "academicYear", "weekNumber", "yearLevel");
CREATE INDEX "idx_preclerkship_answer_vote_archived" ON "PreClerkshipAnswerVote"("isArchived");

-- PreClerkshipAIExtraction Table
CREATE TABLE "PreClerkshipAIExtraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT UNIQUE,
    "imagePath" TEXT,
    "rawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "template" TEXT,
    "processingTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "PreClerkshipAIExtraction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- PreClerkshipExtractionImage Table
CREATE TABLE "PreClerkshipExtractionImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extractionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageData" BYTEA,
    "imageUrl" TEXT,
    "ocrText" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreClerkshipExtractionImage_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "PreClerkshipAIExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PreClerkshipSimilarQuestionGroup Table
CREATE TABLE "PreClerkshipSimilarQuestionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionIds" TEXT[] NOT NULL,
    "similarityScores" JSONB NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "idx_preclerkship_similar_question_year" ON "PreClerkshipSimilarQuestionGroup"("yearLevel");
CREATE INDEX "idx_preclerkship_similar_question_created" ON "PreClerkshipSimilarQuestionGroup"("createdAt");

-- ============================================================================
-- Seed Initial Tags (Weeks and Lectures)
-- ============================================================================

-- Insert Week tags (Week 1 through Week 10)
INSERT INTO "PreClerkshipTag" ("id", "type", "value") VALUES
('pct_week_1', 'WEEK', 'Week 1'),
('pct_week_2', 'WEEK', 'Week 2'),
('pct_week_3', 'WEEK', 'Week 3'),
('pct_week_4', 'WEEK', 'Week 4'),
('pct_week_5', 'WEEK', 'Week 5'),
('pct_week_6', 'WEEK', 'Week 6'),
('pct_week_7', 'WEEK', 'Week 7'),
('pct_week_8', 'WEEK', 'Week 8'),
('pct_week_9', 'WEEK', 'Week 9'),
('pct_week_10', 'WEEK', 'Week 10')
ON CONFLICT ("type", "value") DO NOTHING;

-- Insert Lecture tags (Lecture 1 through Lecture 10)
INSERT INTO "PreClerkshipTag" ("id", "type", "value") VALUES
('pct_lecture_1', 'LECTURE', 'Lecture 1'),
('pct_lecture_2', 'LECTURE', 'Lecture 2'),
('pct_lecture_3', 'LECTURE', 'Lecture 3'),
('pct_lecture_4', 'LECTURE', 'Lecture 4'),
('pct_lecture_5', 'LECTURE', 'Lecture 5'),
('pct_lecture_6', 'LECTURE', 'Lecture 6'),
('pct_lecture_7', 'LECTURE', 'Lecture 7'),
('pct_lecture_8', 'LECTURE', 'Lecture 8'),
('pct_lecture_9', 'LECTURE', 'Lecture 9'),
('pct_lecture_10', 'LECTURE', 'Lecture 10')
ON CONFLICT ("type", "value") DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Pre-Clerkship system tables have been created successfully.
-- The system now supports Years 1, 2, and 3 with Week and Lecture tags.

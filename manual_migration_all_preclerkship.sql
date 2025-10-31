-- ============================================================================
-- MANUAL MIGRATION SCRIPT FOR PRECLERKSHIP TABLES
-- Run this in your Neon database SQL editor to create all PreClerkship tables
-- Date: November 1, 2025
-- ============================================================================

-- Step 1: Create PreClerkship Tag Type Enum
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE "PreClerkshipTagType" AS ENUM ('SUBJECT', 'SYSTEM', 'TOPIC', 'WEEK', 'LECTURE', 'RESOURCE', 'MODE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create PreClerkship Tables
-- ============================================================================

-- PreClerkshipQuestion Table
CREATE TABLE IF NOT EXISTS "PreClerkshipQuestion" (
    "id" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objective" TEXT,
    "customId" INTEGER,
    "text" TEXT,
    "updatedAt" TIMESTAMP(3),
    "iduScreenshotUrl" TEXT,
    "questionImageUrl" TEXT,
    "explanationImageUrl" TEXT,
    "references" TEXT,
    "isAnswerConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "embedding" JSONB,
    CONSTRAINT "PreClerkshipQuestion_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipAnswer Table
CREATE TABLE IF NOT EXISTS "PreClerkshipAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PreClerkshipAnswer_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipQuestionComment Table
CREATE TABLE IF NOT EXISTS "PreClerkshipQuestionComment" (
    "id" TEXT NOT NULL,
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
    CONSTRAINT "PreClerkshipQuestionComment_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipCommentVote Table
CREATE TABLE IF NOT EXISTS "PreClerkshipCommentVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreClerkshipCommentVote_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipQuestionOccurrence Table
CREATE TABLE IF NOT EXISTS "PreClerkshipQuestionOccurrence" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "year" TEXT,
    "weekNumber" INTEGER,
    "lecture" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreClerkshipQuestionOccurrence_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipQuiz Table
CREATE TABLE IF NOT EXISTS "PreClerkshipQuiz" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "mode" "QuizMode" NOT NULL DEFAULT 'RANDOM',
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "status" TEXT,
    CONSTRAINT "PreClerkshipQuiz_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipQuizItem Table
CREATE TABLE IF NOT EXISTS "PreClerkshipQuizItem" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "marked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderInQuiz" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreClerkshipQuizItem_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipResponse Table
CREATE TABLE IF NOT EXISTS "PreClerkshipResponse" (
    "id" TEXT NOT NULL,
    "quizItemId" TEXT NOT NULL,
    "choiceId" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSeconds" INTEGER,
    "changeCount" INTEGER DEFAULT 0,
    "userId" TEXT,
    CONSTRAINT "PreClerkshipResponse_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipTag Table
CREATE TABLE IF NOT EXISTS "PreClerkshipTag" (
    "id" TEXT NOT NULL,
    "type" "PreClerkshipTagType" NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "PreClerkshipTag_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipQuestionTag Table (Junction table)
CREATE TABLE IF NOT EXISTS "PreClerkshipQuestionTag" (
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "PreClerkshipQuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
);

-- PreClerkshipUserQuestionMode Table
CREATE TABLE IF NOT EXISTS "PreClerkshipUserQuestionMode" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreClerkshipUserQuestionMode_pkey" PRIMARY KEY ("userId","questionId")
);

-- PreClerkshipAIExtraction Table
CREATE TABLE IF NOT EXISTS "PreClerkshipAIExtraction" (
    "id" TEXT NOT NULL,
    "questionId" TEXT,
    "imagePath" TEXT,
    "rawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "template" TEXT,
    "processingTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "PreClerkshipAIExtraction_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipExtractionImage Table
CREATE TABLE IF NOT EXISTS "PreClerkshipExtractionImage" (
    "id" TEXT NOT NULL,
    "extractionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageData" BYTEA,
    "imageUrl" TEXT,
    "ocrText" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreClerkshipExtractionImage_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipAnswerVote Table
CREATE TABLE IF NOT EXISTS "PreClerkshipAnswerVote" (
    "id" TEXT NOT NULL,
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
    CONSTRAINT "PreClerkshipAnswerVote_pkey" PRIMARY KEY ("id")
);

-- PreClerkshipSimilarQuestionGroup Table
CREATE TABLE IF NOT EXISTS "PreClerkshipSimilarQuestionGroup" (
    "id" TEXT NOT NULL,
    "questionIds" TEXT[],
    "similarityScores" JSONB NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreClerkshipSimilarQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create Unique Indexes
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "PreClerkshipQuestion_customId_key" 
    ON "PreClerkshipQuestion"("customId");

CREATE UNIQUE INDEX IF NOT EXISTS "PreClerkshipCommentVote_userId_commentId_key" 
    ON "PreClerkshipCommentVote"("userId", "commentId");

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_preclerkship_questionoccurrence" 
    ON "PreClerkshipQuestionOccurrence"("questionId", "year", "weekNumber", "lecture");

CREATE UNIQUE INDEX IF NOT EXISTS "PreClerkshipTag_type_value_key" 
    ON "PreClerkshipTag"("type", "value");

CREATE UNIQUE INDEX IF NOT EXISTS "PreClerkshipAIExtraction_questionId_key" 
    ON "PreClerkshipAIExtraction"("questionId");

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_preclerkship_answer_vote" 
    ON "PreClerkshipAnswerVote"("questionId", "userId", "academicYear", "weekNumber", "lectureNum", "yearLevel");

-- Step 4: Create Performance Indexes
-- ============================================================================

-- PreClerkshipQuestion indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_question_id" 
    ON "PreClerkshipQuestion"("id");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_question_yearlevel" 
    ON "PreClerkshipQuestion"("yearLevel");

-- PreClerkshipQuestionComment indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questioncomment_questionid" 
    ON "PreClerkshipQuestionComment"("questionId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questioncomment_createdbyid" 
    ON "PreClerkshipQuestionComment"("createdById");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questioncomment_parentid" 
    ON "PreClerkshipQuestionComment"("parentId");

-- PreClerkshipCommentVote indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_commentvote_commentid" 
    ON "PreClerkshipCommentVote"("commentId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_commentvote_userid" 
    ON "PreClerkshipCommentVote"("userId");

-- PreClerkshipQuestionOccurrence indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questionoccurrence_questionid" 
    ON "PreClerkshipQuestionOccurrence"("questionId");

-- PreClerkshipQuiz indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quiz_userid" 
    ON "PreClerkshipQuiz"("userId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quiz_userid_createdat" 
    ON "PreClerkshipQuiz"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quiz_yearlevel" 
    ON "PreClerkshipQuiz"("yearLevel");

-- PreClerkshipQuizItem indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quizitem_id_quizid" 
    ON "PreClerkshipQuizItem"("id", "quizId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quizitem_questionid" 
    ON "PreClerkshipQuizItem"("questionId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_quizitem_quizid" 
    ON "PreClerkshipQuizItem"("quizId");

-- PreClerkshipResponse indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_quizitem_quiz" 
    ON "PreClerkshipResponse"("quizItemId", "isCorrect", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_quizitemid" 
    ON "PreClerkshipResponse"("quizItemId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_quizitemid_id" 
    ON "PreClerkshipResponse"("quizItemId", "id");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_userid" 
    ON "PreClerkshipResponse"("userId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_userid_correct_createdat" 
    ON "PreClerkshipResponse"("userId", "isCorrect", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_response_userid_createdat" 
    ON "PreClerkshipResponse"("userId", "createdAt");

-- PreClerkshipTag indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_tag_type" 
    ON "PreClerkshipTag"("type");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_tag_type_value" 
    ON "PreClerkshipTag"("type", "value");

-- PreClerkshipQuestionTag indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questiontag_questionid" 
    ON "PreClerkshipQuestionTag"("questionId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_questiontag_tagid" 
    ON "PreClerkshipQuestionTag"("tagId");

-- PreClerkshipUserQuestionMode indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_userquestionmode_userid" 
    ON "PreClerkshipUserQuestionMode"("userId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_userquestionmode_questionid" 
    ON "PreClerkshipUserQuestionMode"("questionId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_userquestionmode_userid_mode" 
    ON "PreClerkshipUserQuestionMode"("userId", "mode");

-- PreClerkshipAnswerVote indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_answer_vote_questionid" 
    ON "PreClerkshipAnswerVote"("questionId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_answer_vote_userid" 
    ON "PreClerkshipAnswerVote"("userId");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_answer_vote_question_period" 
    ON "PreClerkshipAnswerVote"("questionId", "academicYear", "weekNumber", "yearLevel");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_answer_vote_archived" 
    ON "PreClerkshipAnswerVote"("isArchived");

-- PreClerkshipSimilarQuestionGroup indexes
CREATE INDEX IF NOT EXISTS "idx_preclerkship_similar_question_year" 
    ON "PreClerkshipSimilarQuestionGroup"("yearLevel");
CREATE INDEX IF NOT EXISTS "idx_preclerkship_similar_question_created" 
    ON "PreClerkshipSimilarQuestionGroup"("createdAt");

-- Step 5: Add Foreign Key Constraints
-- ============================================================================

-- PreClerkshipAnswer foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipAnswer" 
        ADD CONSTRAINT "PreClerkshipAnswer_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipQuestionComment foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionComment" 
        ADD CONSTRAINT "PreClerkshipQuestionComment_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionComment" 
        ADD CONSTRAINT "PreClerkshipQuestionComment_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionComment" 
        ADD CONSTRAINT "PreClerkshipQuestionComment_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "PreClerkshipQuestionComment"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipCommentVote foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipCommentVote" 
        ADD CONSTRAINT "PreClerkshipCommentVote_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipCommentVote" 
        ADD CONSTRAINT "PreClerkshipCommentVote_commentId_fkey" 
        FOREIGN KEY ("commentId") REFERENCES "PreClerkshipQuestionComment"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipQuestionOccurrence foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionOccurrence" 
        ADD CONSTRAINT "PreClerkshipQuestionOccurrence_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipQuiz foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuiz" 
        ADD CONSTRAINT "PreClerkshipQuiz_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipQuizItem foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuizItem" 
        ADD CONSTRAINT "PreClerkshipQuizItem_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuizItem" 
        ADD CONSTRAINT "PreClerkshipQuizItem_quizId_fkey" 
        FOREIGN KEY ("quizId") REFERENCES "PreClerkshipQuiz"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipResponse foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipResponse" 
        ADD CONSTRAINT "PreClerkshipResponse_quizItemId_fkey" 
        FOREIGN KEY ("quizItemId") REFERENCES "PreClerkshipQuizItem"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipResponse" 
        ADD CONSTRAINT "PreClerkshipResponse_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipQuestionTag foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionTag" 
        ADD CONSTRAINT "PreClerkshipQuestionTag_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipQuestionTag" 
        ADD CONSTRAINT "PreClerkshipQuestionTag_tagId_fkey" 
        FOREIGN KEY ("tagId") REFERENCES "PreClerkshipTag"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipUserQuestionMode foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipUserQuestionMode" 
        ADD CONSTRAINT "PreClerkshipUserQuestionMode_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipUserQuestionMode" 
        ADD CONSTRAINT "PreClerkshipUserQuestionMode_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipAIExtraction foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipAIExtraction" 
        ADD CONSTRAINT "PreClerkshipAIExtraction_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipExtractionImage foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipExtractionImage" 
        ADD CONSTRAINT "PreClerkshipExtractionImage_extractionId_fkey" 
        FOREIGN KEY ("extractionId") REFERENCES "PreClerkshipAIExtraction"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PreClerkshipAnswerVote foreign keys
DO $$ BEGIN
    ALTER TABLE "PreClerkshipAnswerVote" 
        ADD CONSTRAINT "PreClerkshipAnswerVote_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreClerkshipAnswerVote" 
        ADD CONSTRAINT "PreClerkshipAnswerVote_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All PreClerkship tables have been created with:
-- ✅ All tables
-- ✅ All indexes (unique and performance)
-- ✅ All foreign key constraints
-- ✅ Proper ON DELETE CASCADE relationships
-- 
-- Next steps:
-- 1. Go to your Neon database SQL editor at: https://console.neon.tech/
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
-- 4. Test by clicking "Add Individual Question" in PreClerkship years 1-3
-- ============================================================================

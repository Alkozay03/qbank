-- CreateEnum
CREATE TYPE "PreClerkshipTagType" AS ENUM ('SUBJECT', 'SYSTEM', 'TOPIC', 'WEEK', 'LECTURE', 'RESOURCE', 'MODE');

-- CreateTable
CREATE TABLE "PreClerkshipQuestion" (
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

-- CreateTable
CREATE TABLE "PreClerkshipQuestionComment" (
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

-- CreateTable
CREATE TABLE "PreClerkshipCommentVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreClerkshipCommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreClerkshipQuestionOccurrence" (
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

-- CreateTable
CREATE TABLE "PreClerkshipAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PreClerkshipAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreClerkshipQuiz" (
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

-- CreateTable
CREATE TABLE "PreClerkshipQuizItem" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "marked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderInQuiz" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreClerkshipQuizItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreClerkshipResponse" (
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

-- CreateTable
CREATE TABLE "PreClerkshipTag" (
    "id" TEXT NOT NULL,
    "type" "PreClerkshipTagType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PreClerkshipTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreClerkshipQuestionTag" (
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PreClerkshipQuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
);

-- CreateTable
CREATE TABLE "PreClerkshipUserQuestionMode" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreClerkshipUserQuestionMode_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateTable
CREATE TABLE "PreClerkshipAIExtraction" (
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

-- CreateTable
CREATE TABLE "PreClerkshipExtractionImage" (
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

-- CreateTable
CREATE TABLE "PreClerkshipAnswerVote" (
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

-- CreateTable
CREATE TABLE "PreClerkshipSimilarQuestionGroup" (
    "id" TEXT NOT NULL,
    "questionIds" TEXT[],
    "similarityScores" JSONB NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreClerkshipSimilarQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreClerkshipQuestion_customId_key" ON "PreClerkshipQuestion"("customId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_question_id" ON "PreClerkshipQuestion"("id");

-- CreateIndex
CREATE INDEX "idx_preclerkship_question_yearlevel" ON "PreClerkshipQuestion"("yearLevel");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questioncomment_questionid" ON "PreClerkshipQuestionComment"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questioncomment_createdbyid" ON "PreClerkshipQuestionComment"("createdById");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questioncomment_parentid" ON "PreClerkshipQuestionComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PreClerkshipCommentVote_userId_commentId_key" ON "PreClerkshipCommentVote"("userId", "commentId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_commentvote_commentid" ON "PreClerkshipCommentVote"("commentId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_commentvote_userid" ON "PreClerkshipCommentVote"("userId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questionoccurrence_questionid" ON "PreClerkshipQuestionOccurrence"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_preclerkship_questionoccurrence" ON "PreClerkshipQuestionOccurrence"("questionId", "year", "weekNumber", "lecture");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quiz_userid" ON "PreClerkshipQuiz"("userId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quiz_userid_createdat" ON "PreClerkshipQuiz"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quiz_yearlevel" ON "PreClerkshipQuiz"("yearLevel");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quizitem_id_quizid" ON "PreClerkshipQuizItem"("id", "quizId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quizitem_questionid" ON "PreClerkshipQuizItem"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_quizitem_quizid" ON "PreClerkshipQuizItem"("quizId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_quizitem_quiz" ON "PreClerkshipResponse"("quizItemId", "isCorrect", "createdAt");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_quizitemid" ON "PreClerkshipResponse"("quizItemId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_quizitemid_id" ON "PreClerkshipResponse"("quizItemId", "id");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_userid" ON "PreClerkshipResponse"("userId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_userid_correct_createdat" ON "PreClerkshipResponse"("userId", "isCorrect", "createdAt");

-- CreateIndex
CREATE INDEX "idx_preclerkship_response_userid_createdat" ON "PreClerkshipResponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_preclerkship_tag_type" ON "PreClerkshipTag"("type");

-- CreateIndex
CREATE INDEX "idx_preclerkship_tag_type_value" ON "PreClerkshipTag"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "PreClerkshipTag_type_value_key" ON "PreClerkshipTag"("type", "value");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questiontag_questionid" ON "PreClerkshipQuestionTag"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_questiontag_tagid" ON "PreClerkshipQuestionTag"("tagId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_userquestionmode_userid" ON "PreClerkshipUserQuestionMode"("userId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_userquestionmode_questionid" ON "PreClerkshipUserQuestionMode"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_userquestionmode_userid_mode" ON "PreClerkshipUserQuestionMode"("userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "PreClerkshipAIExtraction_questionId_key" ON "PreClerkshipAIExtraction"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_answer_vote_questionid" ON "PreClerkshipAnswerVote"("questionId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_answer_vote_userid" ON "PreClerkshipAnswerVote"("userId");

-- CreateIndex
CREATE INDEX "idx_preclerkship_answer_vote_question_period" ON "PreClerkshipAnswerVote"("questionId", "academicYear", "weekNumber", "yearLevel");

-- CreateIndex
CREATE INDEX "idx_preclerkship_answer_vote_archived" ON "PreClerkshipAnswerVote"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_preclerkship_answer_vote" ON "PreClerkshipAnswerVote"("questionId", "userId", "academicYear", "weekNumber", "lectureNum", "yearLevel");

-- CreateIndex
CREATE INDEX "idx_preclerkship_similar_question_year" ON "PreClerkshipSimilarQuestionGroup"("yearLevel");

-- CreateIndex
CREATE INDEX "idx_preclerkship_similar_question_created" ON "PreClerkshipSimilarQuestionGroup"("createdAt");

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionComment" ADD CONSTRAINT "PreClerkshipQuestionComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionComment" ADD CONSTRAINT "PreClerkshipQuestionComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionComment" ADD CONSTRAINT "PreClerkshipQuestionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PreClerkshipQuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipCommentVote" ADD CONSTRAINT "PreClerkshipCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipCommentVote" ADD CONSTRAINT "PreClerkshipCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PreClerkshipQuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionOccurrence" ADD CONSTRAINT "PreClerkshipQuestionOccurrence_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipAnswer" ADD CONSTRAINT "PreClerkshipAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuiz" ADD CONSTRAINT "PreClerkshipQuiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuizItem" ADD CONSTRAINT "PreClerkshipQuizItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuizItem" ADD CONSTRAINT "PreClerkshipQuizItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "PreClerkshipQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipResponse" ADD CONSTRAINT "PreClerkshipResponse_quizItemId_fkey" FOREIGN KEY ("quizItemId") REFERENCES "PreClerkshipQuizItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipResponse" ADD CONSTRAINT "PreClerkshipResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionTag" ADD CONSTRAINT "PreClerkshipQuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipQuestionTag" ADD CONSTRAINT "PreClerkshipQuestionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PreClerkshipTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipUserQuestionMode" ADD CONSTRAINT "PreClerkshipUserQuestionMode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipUserQuestionMode" ADD CONSTRAINT "PreClerkshipUserQuestionMode_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipAIExtraction" ADD CONSTRAINT "PreClerkshipAIExtraction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipExtractionImage" ADD CONSTRAINT "PreClerkshipExtractionImage_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "PreClerkshipAIExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipAnswerVote" ADD CONSTRAINT "PreClerkshipAnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreClerkshipAnswerVote" ADD CONSTRAINT "PreClerkshipAnswerVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PreClerkshipQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RotationPeriod
CREATE TABLE "RotationPeriod" (
    "id" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "rotationNumber" TEXT NOT NULL,
    "rotationName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnswerVote
CREATE TABLE "AnswerVote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "rotationNumber" TEXT NOT NULL,
    "rotationName" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerVote_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add rotationNumber to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rotationNumber" TEXT;

-- CreateIndex: RotationPeriod unique constraint
CREATE UNIQUE INDEX "uniq_rotation_period" ON "RotationPeriod"("academicYear", "rotationNumber", "rotationName");

-- CreateIndex: RotationPeriod indexes
CREATE INDEX "idx_rotation_period_year_number" ON "RotationPeriod"("academicYear", "rotationNumber");
CREATE INDEX "idx_rotation_period_active" ON "RotationPeriod"("isActive");

-- CreateIndex: AnswerVote unique constraint
CREATE UNIQUE INDEX "uniq_answer_vote" ON "AnswerVote"("questionId", "userId", "academicYear", "rotationNumber", "rotationName");

-- CreateIndex: AnswerVote indexes
CREATE INDEX "idx_answer_vote_questionid" ON "AnswerVote"("questionId");
CREATE INDEX "idx_answer_vote_userid" ON "AnswerVote"("userId");
CREATE INDEX "idx_answer_vote_question_period" ON "AnswerVote"("questionId", "academicYear", "rotationNumber", "rotationName");
CREATE INDEX "idx_answer_vote_archived" ON "AnswerVote"("isArchived");

-- AddForeignKey: AnswerVote to User
ALTER TABLE "AnswerVote" ADD CONSTRAINT "AnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: AnswerVote to Question
ALTER TABLE "AnswerVote" ADD CONSTRAINT "AnswerVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

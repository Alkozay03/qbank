-- CreateTable: RotationPeriod
CREATE TABLE IF NOT EXISTS "RotationPeriod" (
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
CREATE TABLE IF NOT EXISTS "AnswerVote" (
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema
      AND table_name = 'User'
      AND column_name = 'rotationNumber'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "rotationNumber" TEXT;
  END IF;
END
$$;

-- CreateIndex: RotationPeriod unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_rotation_period" ON "RotationPeriod"("academicYear", "rotationNumber", "rotationName");

-- CreateIndex: RotationPeriod indexes
CREATE INDEX IF NOT EXISTS "idx_rotation_period_year_number" ON "RotationPeriod"("academicYear", "rotationNumber");
CREATE INDEX IF NOT EXISTS "idx_rotation_period_active" ON "RotationPeriod"("isActive");

-- CreateIndex: AnswerVote unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_answer_vote" ON "AnswerVote"("questionId", "userId", "academicYear", "rotationNumber", "rotationName");

-- CreateIndex: AnswerVote indexes
CREATE INDEX IF NOT EXISTS "idx_answer_vote_questionid" ON "AnswerVote"("questionId");
CREATE INDEX IF NOT EXISTS "idx_answer_vote_userid" ON "AnswerVote"("userId");
CREATE INDEX IF NOT EXISTS "idx_answer_vote_question_period" ON "AnswerVote"("questionId", "academicYear", "rotationNumber", "rotationName");
CREATE INDEX IF NOT EXISTS "idx_answer_vote_archived" ON "AnswerVote"("isArchived");

-- AddForeignKey: AnswerVote to User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnswerVote_userId_fkey'
  ) THEN
    ALTER TABLE "AnswerVote"
      ADD CONSTRAINT "AnswerVote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey: AnswerVote to Question
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AnswerVote_questionId_fkey'
  ) THEN
    ALTER TABLE "AnswerVote"
      ADD CONSTRAINT "AnswerVote_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

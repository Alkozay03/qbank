-- Create table to store multiple year/rotation occurrences per question
CREATE TABLE "QuestionOccurrence" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "year" TEXT,
  "rotation" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionOccurrence_pkey" PRIMARY KEY ("id")
);

-- Maintain referential integrity with questions and cascade deletes
ALTER TABLE "QuestionOccurrence"
  ADD CONSTRAINT "QuestionOccurrence_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent duplicate year/rotation combinations for the same question
CREATE UNIQUE INDEX "uniq_questionoccurrence_questionid_year_rotation"
  ON "QuestionOccurrence"("questionId", "year", "rotation");

-- Speed up lookups by question id
CREATE INDEX "idx_questionoccurrence_questionid"
  ON "QuestionOccurrence"("questionId");

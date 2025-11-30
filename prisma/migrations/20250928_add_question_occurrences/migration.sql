-- Create table to store multiple year/rotation occurrences per question (idempotent)
CREATE TABLE IF NOT EXISTS "QuestionOccurrence" (
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuestionOccurrence_questionId_fkey'
  ) THEN
    ALTER TABLE "QuestionOccurrence"
      ADD CONSTRAINT "QuestionOccurrence_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "Question"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Prevent duplicate year/rotation combinations for the same question
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_questionoccurrence_questionid_year_rotation"
  ON "QuestionOccurrence"("questionId", "year", "rotation");

-- Speed up lookups by question id
CREATE INDEX IF NOT EXISTS "idx_questionoccurrence_questionid"
  ON "QuestionOccurrence"("questionId");

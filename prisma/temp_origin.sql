ALTER TABLE "QuestionComment" ADD COLUMN IF NOT EXISTS "origin" TEXT DEFAULT 'runner';
UPDATE "QuestionComment" SET "origin" = COALESCE("origin", 'runner');
ALTER TABLE "QuestionComment" ALTER COLUMN "origin" SET NOT NULL;

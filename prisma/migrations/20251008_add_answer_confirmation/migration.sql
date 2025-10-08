-- Add isAnswerConfirmed column to Question table
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "isAnswerConfirmed" BOOLEAN NOT NULL DEFAULT true;

-- Add index for potential filtering by confirmation status
CREATE INDEX IF NOT EXISTS "idx_question_isanswerconfirmed" ON "Question"("isAnswerConfirmed");

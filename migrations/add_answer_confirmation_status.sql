-- Add isAnswerConfirmed column to Question table
ALTER TABLE "Question" ADD COLUMN "isAnswerConfirmed" BOOLEAN NOT NULL DEFAULT true;

-- Add index for potential filtering by confirmation status
CREATE INDEX "idx_question_isanswerconfirmed" ON "Question"("isAnswerConfirmed");

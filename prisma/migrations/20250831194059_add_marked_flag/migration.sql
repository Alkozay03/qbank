-- Add 'marked' to QuizItem (idempotent)
ALTER TABLE "QuizItem"
  ADD COLUMN IF NOT EXISTS "marked" BOOLEAN NOT NULL DEFAULT false;

-- If this migration also created the composite index, make it idempotent too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema
      AND indexname = 'QuizItem_quizId_order_idx'
  ) THEN
    CREATE INDEX "QuizItem_quizId_order_idx" ON "QuizItem"("quizId", "order");
  END IF;
END$$;

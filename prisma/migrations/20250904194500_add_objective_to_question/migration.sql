-- Add objective column to Question if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Question' AND column_name = 'objective'
  ) THEN
    ALTER TABLE public."Question" ADD COLUMN "objective" TEXT;
  END IF;
END $$;


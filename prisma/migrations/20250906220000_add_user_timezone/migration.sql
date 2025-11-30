-- Add timezone field to User table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema
      AND table_name = 'User'
      AND column_name = 'timezone'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
  END IF;
END
$$;

-- Reconcile legacy Question schema with new tags-based model
-- - Make rotationId nullable (legacy; now represented via TagType.ROTATION)
-- - Backfill text from stem if needed and relax stem NOT NULL

DO $$
BEGIN
  -- Make rotationId NULLABLE if it exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Question' AND column_name = 'rotationId' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public."Question" ALTER COLUMN "rotationId" DROP NOT NULL;
  END IF;

  -- Ensure "text" is populated from legacy "stem" where missing
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Question' AND column_name = 'stem'
  ) THEN
    -- If a "text" column exists, backfill nulls from stem
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Question' AND column_name = 'text'
    ) THEN
      UPDATE public."Question" SET "text" = COALESCE("text", "stem") WHERE "text" IS NULL;
    END IF;

    -- Relax NOT NULL on legacy stem so inserts without it succeed
    BEGIN
      ALTER TABLE public."Question" ALTER COLUMN "stem" DROP NOT NULL;
    EXCEPTION WHEN others THEN
      -- ignore if already nullable or column missing in some envs
      NULL;
    END;
  END IF;
END $$;


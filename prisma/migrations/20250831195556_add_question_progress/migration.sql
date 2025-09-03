-- CreateEnum public.QuestionState (idempotent, shadow-safe, PUBLIC-namespace)
DO $$
DECLARE
  is_shadow boolean := current_schema = '_prisma_migrate_shadow';
  ns        regnamespace := 'public'::regnamespace;
  tname     text := 'QuestionState';
  t_exists  boolean;
BEGIN
  -- If a prior failed run left the enum behind, clean it up in SHADOW only.
  IF is_shadow THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      WHERE t.typname = tname
        AND t.typnamespace = ns
    ) INTO t_exists;

    IF t_exists THEN
      EXECUTE 'DROP TYPE public."' || tname || '" CASCADE';
    END IF;
  END IF;

  -- Create or reconcile enum in PUBLIC.
  BEGIN
    EXECUTE 'CREATE TYPE public."' || tname || '" AS ENUM (''Unanswered'',''Correct'',''Incorrect'',''Omitted'')';
  EXCEPTION
    WHEN duplicate_object THEN
      -- Ensure all labels exist; add missing ones in order (no-op if present)
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = ns
          AND e.enumlabel = 'Unanswered'
      ) THEN
        EXECUTE 'ALTER TYPE public."' || tname || '" ADD VALUE ''Unanswered''';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = ns
          AND e.enumlabel = 'Correct'
      ) THEN
        EXECUTE 'ALTER TYPE public."' || tname || '" ADD VALUE ''Correct''';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = ns
          AND e.enumlabel = 'Incorrect'
      ) THEN
        EXECUTE 'ALTER TYPE public."' || tname || '" ADD VALUE ''Incorrect''';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = ns
          AND e.enumlabel = 'Omitted'
      ) THEN
        EXECUTE 'ALTER TYPE public."' || tname || '" ADD VALUE ''Omitted''';
      END IF;
  END;
END
$$;

-- CreateTable (idempotent): public.QuestionProgress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'QuestionProgress'
  ) THEN
    EXECUTE $CT$
      CREATE TABLE public."QuestionProgress" (
        "id"           TEXT        NOT NULL,
        "userId"       TEXT        NOT NULL,
        "questionId"   TEXT        NOT NULL,
        "year"         public."PortalYear"     NOT NULL,
        "state"        public."QuestionState"  NOT NULL DEFAULT 'Unanswered',
        "marked"       BOOLEAN     NOT NULL DEFAULT false,
        "lastQuizId"   TEXT,
        "firstSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "QuestionProgress_pkey" PRIMARY KEY ("id")
      )
    $CT$;
  END IF;
END
$$;

-- Indexes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'QuestionProgress_userId_year_idx'
  ) THEN
    CREATE INDEX "QuestionProgress_userId_year_idx"
      ON public."QuestionProgress"("userId", "year");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'QuestionProgress_questionId_year_idx'
  ) THEN
    CREATE INDEX "QuestionProgress_questionId_year_idx"
      ON public."QuestionProgress"("questionId", "year");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'QuestionProgress_userId_questionId_year_key'
  ) THEN
    CREATE UNIQUE INDEX "QuestionProgress_userId_questionId_year_key"
      ON public."QuestionProgress"("userId", "questionId", "year");
  END IF;
END
$$;

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionProgress_userId_fkey'
  ) THEN
    ALTER TABLE public."QuestionProgress"
      ADD CONSTRAINT "QuestionProgress_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES public."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionProgress_questionId_fkey'
  ) THEN
    ALTER TABLE public."QuestionProgress"
      ADD CONSTRAINT "QuestionProgress_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES public."Question"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

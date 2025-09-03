-- CreateEnum PortalYear (idempotent, shadow-safe, schema-local)
DO $$
DECLARE
  is_shadow boolean := current_schema = '_prisma_migrate_shadow';
  tname text := 'PortalYear';
  t_exists boolean;
BEGIN
  IF is_shadow THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      WHERE t.typname = tname
        AND t.typnamespace = current_schema::regnamespace
    ) INTO t_exists;
    IF t_exists THEN
      EXECUTE 'DROP TYPE "' || tname || '" CASCADE';
    END IF;
  END IF;

  BEGIN
    EXECUTE 'CREATE TYPE "' || tname || '" AS ENUM (''Y4'',''Y5'')';
  EXCEPTION WHEN duplicate_object THEN
    -- no-op, labels are already there
  END;
END
$$;

-- CreateEnum QuizStatus (idempotent, shadow-safe, schema-local)
DO $$
DECLARE
  is_shadow boolean := current_schema = '_prisma_migrate_shadow';
  tname text := 'QuizStatus';
  t_exists boolean;
BEGIN
  IF is_shadow THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_type t
      WHERE t.typname = tname
        AND t.typnamespace = current_schema::regnamespace
    ) INTO t_exists;
    IF t_exists THEN
      EXECUTE 'DROP TYPE "' || tname || '" CASCADE';
    END IF;
  END IF;

  BEGIN
    EXECUTE 'CREATE TYPE "' || tname || '" AS ENUM (''Active'',''Suspended'',''Ended'')';
  EXCEPTION WHEN duplicate_object THEN
    -- no-op
  END;
END
$$;

-- AlterTable Quiz: add columns if missing (schema-local)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema
      AND table_name = 'Quiz'
      AND column_name = 'completedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Quiz" ADD COLUMN "completedAt" TIMESTAMP(3)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema
      AND table_name = 'Quiz'
      AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER TABLE "Quiz" ADD COLUMN "status" "QuizStatus" NOT NULL DEFAULT ''Active''';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema
      AND table_name = 'Quiz'
      AND column_name = 'year'
  ) THEN
    EXECUTE 'ALTER TABLE "Quiz" ADD COLUMN "year" "PortalYear" NOT NULL DEFAULT ''Y4''';
  END IF;
END
$$;

-- Indexes (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema
      AND indexname = 'Quiz_userId_year_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "Quiz_userId_year_idx" ON "Quiz"("userId","year")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema
      AND indexname = 'Quiz_status_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "Quiz_status_idx" ON "Quiz"("status")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema
      AND indexname = 'Quiz_createdAt_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "Quiz_createdAt_idx" ON "Quiz"("createdAt")';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema
      AND indexname = 'QuizItem_quizId_order_idx'
  ) THEN
    EXECUTE 'CREATE INDEX "QuizItem_quizId_order_idx" ON "QuizItem"("quizId","order")';
  END IF;
END
$$;

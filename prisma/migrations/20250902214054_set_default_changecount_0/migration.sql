-- ===========================================
-- VIP Reconcile Migration (SAFE + IDEMPOTENT)
-- ===========================================

-- Add "MASTER_ADMIN" to Role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'MASTER_ADMIN'
  ) THEN
    ALTER TYPE "public"."Role" ADD VALUE 'MASTER_ADMIN';
  END IF;
END
$$;

-- Add nullable columns IF NOT EXISTS (safe on populated tables)
ALTER TABLE "public"."Question"
  ADD COLUMN IF NOT EXISTS "customId" INTEGER,
  ADD COLUMN IF NOT EXISTS "text" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

ALTER TABLE "public"."Quiz"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

ALTER TABLE "public"."Response"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "timeSeconds" INTEGER;

ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

-- Ensure default for Response.changeCount = 0 (idempotent)
ALTER TABLE "public"."Response"
  ALTER COLUMN "changeCount" SET DEFAULT 0;

-- Unique index on Question.customId (allows multiple NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'Question_customId_key'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "Question_customId_key" ON "public"."Question"("customId");
  END IF;
END
$$;

-- FK Response.userId -> User(id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Response_userId_fkey'
  ) THEN
    ALTER TABLE "public"."Response"
      ADD CONSTRAINT "Response_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

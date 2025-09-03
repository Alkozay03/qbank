BEGIN;
  -- Reconcile drift: ensure changeCount column exists (safe on shadow DB too)
  ALTER TABLE "public"."Response" ADD COLUMN IF NOT EXISTS "changeCount" INTEGER;
COMMIT;
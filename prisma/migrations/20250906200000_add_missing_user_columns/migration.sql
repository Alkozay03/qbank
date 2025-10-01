-- Add missing updatedAt columns to User table
ALTER TABLE "public"."User" 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Update existing records to have a default updatedAt value
UPDATE "public"."User" 
SET "updatedAt" = "createdAt" 
WHERE "updatedAt" IS NULL;

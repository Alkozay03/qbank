-- Add image URL columns to Question table
ALTER TABLE "Question" 
ADD COLUMN IF NOT EXISTS "questionImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "explanationImageUrl" TEXT;
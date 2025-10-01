-- Add question metadata fields for quiz references
ALTER TABLE "Question"
  ADD COLUMN "yearCaptured" TEXT,
  ADD COLUMN "rotationNumber" TEXT,
  ADD COLUMN "iduScreenshotUrl" TEXT;

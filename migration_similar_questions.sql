-- Migration: Add SimilarQuestionGroup table for duplicate detection
-- Run this in Supabase SQL Editor

CREATE TABLE "SimilarQuestionGroup" (
    "id" TEXT NOT NULL,
    "questionIds" TEXT[],
    "similarityScores" JSONB NOT NULL,
    "yearContext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimilarQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "idx_similar_question_year" ON "SimilarQuestionGroup"("yearContext");
CREATE INDEX "idx_similar_question_created" ON "SimilarQuestionGroup"("createdAt");

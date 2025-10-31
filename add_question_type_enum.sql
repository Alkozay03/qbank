-- Add QUESTION_TYPE to PreClerkshipTagType enum
-- Run this in Neon SQL Editor
ALTER TYPE "PreClerkshipTagType" ADD VALUE IF NOT EXISTS 'QUESTION_TYPE';

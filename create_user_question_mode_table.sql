-- Create UserQuestionMode table for user-specific question modes
CREATE TABLE IF NOT EXISTS "UserQuestionMode" (
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "UserQuestionMode_pkey" PRIMARY KEY ("userId", "questionId")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_userquestionmode_userid" ON "UserQuestionMode"("userId");
CREATE INDEX IF NOT EXISTS "idx_userquestionmode_questionid" ON "UserQuestionMode"("questionId");
CREATE INDEX IF NOT EXISTS "idx_userquestionmode_userid_mode" ON "UserQuestionMode"("userId", "mode");

-- Add foreign key constraints
ALTER TABLE "UserQuestionMode" 
  ADD CONSTRAINT "UserQuestionMode_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserQuestionMode" 
  ADD CONSTRAINT "UserQuestionMode_questionId_fkey" 
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

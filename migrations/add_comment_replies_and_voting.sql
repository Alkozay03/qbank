-- Add parentId and upvoteCount columns to QuestionComment table
ALTER TABLE "QuestionComment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "QuestionComment" ADD COLUMN "upvoteCount" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key constraint for parentId (self-referencing for replies)
ALTER TABLE "QuestionComment" ADD CONSTRAINT "QuestionComment_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "QuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for parentId
CREATE INDEX "idx_questioncomment_parentid" ON "QuestionComment"("parentId");

-- Create CommentVote table
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on userId and commentId (one vote per user per comment)
CREATE UNIQUE INDEX "CommentVote_userId_commentId_key" ON "CommentVote"("userId", "commentId");

-- Create indexes
CREATE INDEX "idx_commentvote_commentid" ON "CommentVote"("commentId");
CREATE INDEX "idx_commentvote_userid" ON "CommentVote"("userId");

-- Add foreign key constraints
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" 
  FOREIGN KEY ("commentId") REFERENCES "QuestionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

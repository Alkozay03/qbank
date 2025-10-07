-- Add recipientId and messageType to Conversation table
-- This allows assigning specific admins to conversations

ALTER TABLE "Conversation" 
ADD COLUMN "recipientId" TEXT,
ADD COLUMN "messageType" TEXT DEFAULT 'HELP_CREATOR';

-- Create index for faster admin queries
CREATE INDEX "Conversation_recipientId_idx" ON "Conversation"("recipientId");
CREATE INDEX "Conversation_messageType_idx" ON "Conversation"("messageType");

-- Update existing conversations to be HELP_CREATOR type
UPDATE "Conversation" SET "messageType" = 'HELP_CREATOR' WHERE "messageType" IS NULL;

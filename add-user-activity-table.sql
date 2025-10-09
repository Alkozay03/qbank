-- Add UserActivity table to track user presence
-- This is needed because JWT sessions don't store in database

CREATE TABLE IF NOT EXISTS "UserActivity" (
    "userId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS "idx_user_activity_lastseen" ON "UserActivity"("lastSeen");

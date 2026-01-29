-- Drop legacy messaging system tables; safe to run multiple times
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Conversation" CASCADE;

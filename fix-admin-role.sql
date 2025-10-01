-- Direct SQL to update your role to MASTER_ADMIN
-- Run this in your database console or Prisma Studio

-- First, let's see all users
SELECT id, email, role, "firstName", "lastName" FROM "User";

-- Remove MASTER_ADMIN from all users first
UPDATE "User" SET role = 'MEMBER' WHERE role = 'MASTER_ADMIN';

-- Add your user if it doesn't exist (both email variations)
INSERT INTO "User" (id, email, "firstName", "lastName", role, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'U21103000@sharjah.ac.ae', 'Admin', 'User', 'MASTER_ADMIN', NOW(), NOW()),
  (gen_random_uuid(), 'u21103000@sharjah.ac.ae', 'Admin', 'User', 'MASTER_ADMIN', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role = 'MASTER_ADMIN';

-- Check final result
SELECT email, role FROM "User" WHERE role = 'MASTER_ADMIN';

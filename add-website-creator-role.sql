-- Add WEBSITE_CREATOR role to the Role enum
-- This migration adds a new role type for the website creator

-- Add the new role value to the enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WEBSITE_CREATOR';

-- Update the website creator user to have the new role
-- (u21103000@sharjah.ac.ae should be the only WEBSITE_CREATOR)
UPDATE "User" 
SET "role" = 'WEBSITE_CREATOR' 
WHERE "email" = 'u21103000@sharjah.ac.ae';

-- Ensure no other users have WEBSITE_CREATOR role (safety measure)
-- This shouldn't be needed but adds an extra layer of protection
UPDATE "User" 
SET "role" = 'MASTER_ADMIN' 
WHERE "role" = 'WEBSITE_CREATOR' 
AND "email" != 'u21103000@sharjah.ac.ae';

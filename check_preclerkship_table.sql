-- Run this in Neon Console SQL Editor at https://console.neon.tech/
-- Make sure you're connected to the ACTUAL database (not pooler)

SELECT table_name FROM information_schema.tables WHERE table_name = 'PreClerkshipQuestion';

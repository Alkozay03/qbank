-- Add Year 5 specific rotation tags to the Tag table
-- These will appear in dropdowns when admin selects Y5 for a question

-- Year 5 Rotation Tags
INSERT INTO "Tag" (id, type, value)
VALUES 
  (gen_random_uuid(), 'ROTATION', 'Family Medicine'),
  (gen_random_uuid(), 'ROTATION', 'Psychiatry'),
  (gen_random_uuid(), 'ROTATION', 'General Surgery 2'),
  (gen_random_uuid(), 'ROTATION', 'Internal Medicine 2')
ON CONFLICT (type, value) DO NOTHING;

-- Verify the tags were created
SELECT * FROM "Tag" WHERE type = 'ROTATION' ORDER BY value;

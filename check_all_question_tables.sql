SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%Question%' OR table_name LIKE '%Answer%' OR table_name LIKE '%Choice%')
ORDER BY table_name;

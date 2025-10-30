-- Seed Week and Lecture Tags for Pre-Clerkship System
-- Run this in your Neon SQL Editor

-- Insert Week tags (Week 1 through Week 10)
INSERT INTO "PreClerkshipTag" ("id", "type", "value") VALUES
('pct_week_1', 'WEEK', 'Week 1'),
('pct_week_2', 'WEEK', 'Week 2'),
('pct_week_3', 'WEEK', 'Week 3'),
('pct_week_4', 'WEEK', 'Week 4'),
('pct_week_5', 'WEEK', 'Week 5'),
('pct_week_6', 'WEEK', 'Week 6'),
('pct_week_7', 'WEEK', 'Week 7'),
('pct_week_8', 'WEEK', 'Week 8'),
('pct_week_9', 'WEEK', 'Week 9'),
('pct_week_10', 'WEEK', 'Week 10')
ON CONFLICT ("type", "value") DO NOTHING;

-- Insert Lecture tags (Lecture 1 through Lecture 10)
INSERT INTO "PreClerkshipTag" ("id", "type", "value") VALUES
('pct_lecture_1', 'LECTURE', 'Lecture 1'),
('pct_lecture_2', 'LECTURE', 'Lecture 2'),
('pct_lecture_3', 'LECTURE', 'Lecture 3'),
('pct_lecture_4', 'LECTURE', 'Lecture 4'),
('pct_lecture_5', 'LECTURE', 'Lecture 5'),
('pct_lecture_6', 'LECTURE', 'Lecture 6'),
('pct_lecture_7', 'LECTURE', 'Lecture 7'),
('pct_lecture_8', 'LECTURE', 'Lecture 8'),
('pct_lecture_9', 'LECTURE', 'Lecture 9'),
('pct_lecture_10', 'LECTURE', 'Lecture 10')
ON CONFLICT ("type", "value") DO NOTHING;

-- Verify tags were created
SELECT * FROM "PreClerkshipTag" ORDER BY "type", "value";

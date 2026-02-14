-- Add side2 to meals table (second side dish name)
-- Run this in Supabase SQL Editor if your meals table doesn't have side2 yet.
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS side2 text;

COMMENT ON COLUMN meals.side2 IS 'Second side dish name (bento slot 3).';

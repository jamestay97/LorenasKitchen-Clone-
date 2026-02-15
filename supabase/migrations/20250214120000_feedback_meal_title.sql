-- Store main dish name on feedback so reviews can show under the same dish on future menus.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS meal_title text;

COMMENT ON COLUMN feedback.meal_title IS 'Main dish name when review was submitted; used to show review when that dish appears again on any menu.';

-- Backfill from meals so existing reviews show up when the dish is posted again
UPDATE feedback f
SET meal_title = m.title
FROM meals m
WHERE f.meal_id = m.id AND (f.meal_title IS NULL OR f.meal_title = '');

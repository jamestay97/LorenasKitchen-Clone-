-- Ensure dishes has type for Food Library filter (main vs side)
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS type text DEFAULT 'main';
COMMENT ON COLUMN dishes.type IS 'main or side for filtering in Food Library.';

-- Add first name to feedback; only first name is shown publicly, email kept for admin.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS first_name text;

COMMENT ON COLUMN feedback.first_name IS 'Reviewer first name; shown on homepage. Email is stored but not displayed publicly.';

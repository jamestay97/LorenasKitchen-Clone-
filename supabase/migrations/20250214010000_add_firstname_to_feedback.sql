-- Add first_name column to feedback so reviewer names show on the homepage
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS first_name text;

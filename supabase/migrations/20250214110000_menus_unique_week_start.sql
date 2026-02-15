-- Ensure menus table exists and has UNIQUE(week_start) so upsert(..., { onConflict: 'week_start' }) works.
-- Without this constraint, Supabase returns 400 Bad Request on upsert.

-- Create menus table if it doesn't exist (e.g. from an earlier setup)
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text DEFAULT 'active'
);

-- Add unique constraint on week_start so upsert can use onConflict('week_start')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'menus_week_start_key'
    AND table_name = 'menus'
  ) THEN
    ALTER TABLE menus ADD CONSTRAINT menus_week_start_key UNIQUE (week_start);
  END IF;
END $$;

-- Update the status check constraint to include all statuses used by the app
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('pending', 'new', 'approved', 'denied', 'rejected', 'read'));

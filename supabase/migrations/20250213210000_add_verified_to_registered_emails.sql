-- Add verified column for email verification flow
ALTER TABLE registered_emails ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN registered_emails.verified IS 'True after user clicks verification link from signInWithOtp.';

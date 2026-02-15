-- Allow authenticated users to upsert their own email (for verification flow)
ALTER TABLE registered_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can upsert own email for verification" ON registered_emails;
CREATE POLICY "Users can upsert own email for verification" ON registered_emails
  FOR ALL USING (auth.jwt() ->> 'email' = LOWER(email))
  WITH CHECK (auth.jwt() ->> 'email' = LOWER(email));

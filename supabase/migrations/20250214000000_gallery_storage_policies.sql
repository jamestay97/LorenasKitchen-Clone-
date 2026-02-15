-- Fix: Allow authenticated users to upload/delete from the "gallery" storage bucket.
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- 1. Make sure the gallery bucket exists and is public (so images can be viewed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow anyone to VIEW gallery images (public bucket)
CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- 3. Allow authenticated users to UPLOAD to gallery
CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- 4. Allow authenticated users to UPDATE gallery images
CREATE POLICY "Authenticated users can update gallery images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- 5. Allow authenticated users to DELETE gallery images
CREATE POLICY "Authenticated users can delete gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

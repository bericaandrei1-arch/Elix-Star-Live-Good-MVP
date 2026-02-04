-- ===================================================================
-- ELIX STAR MVP - STORAGE BUCKET SETUP
-- Run this in Supabase SQL Editor to create storage bucket and policies
-- ===================================================================

-- Create storage bucket for user content
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-content', 'user-content', true)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- STORAGE POLICIES
-- ===================================================================

-- Anyone can view public files
CREATE POLICY "Public files are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

-- Authenticated users can upload their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'user-content' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'user-content' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'user-content' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===================================================================
-- STORAGE CONFIGURATION
-- ===================================================================

-- Set max file size to 500MB
UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500MB in bytes
WHERE id = 'user-content';

-- Set allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
]
WHERE id = 'user-content';

-- ===================================================================
-- ✅ DONE! Storage bucket created with proper security!
-- ===================================================================

-- FILE STRUCTURE:
-- user-content/
--   {user_id}/
--     avatars/
--       {filename}.jpg
--     videos/
--       {video_id}.mp4
--       {video_id}_thumbnail.jpg
--     gifts/
--       {gift_id}.mp4

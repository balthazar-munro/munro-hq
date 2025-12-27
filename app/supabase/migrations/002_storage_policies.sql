-- Storage bucket for media files
-- Run this in Supabase SQL Editor after creating the bucket in the dashboard

-- Create storage bucket (if not exists, do this via Dashboard)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('media', 'media', false);

-- Storage policies for the media bucket
-- Note: These need to be applied via Dashboard or using the storage API

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Policy: Authenticated users can view media they have access to
CREATE POLICY "Users can view media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media');

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

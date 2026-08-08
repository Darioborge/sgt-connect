DROP POLICY IF EXISTS "read_shared_media" ON storage.objects;
CREATE POLICY "read_shared_media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','covers','posts','statuses'));
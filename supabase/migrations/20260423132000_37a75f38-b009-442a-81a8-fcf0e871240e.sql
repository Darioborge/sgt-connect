-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Tighten storage SELECT: drop overly broad public-read policies
-- Public access to files is still possible via signed/public URL;
-- this just prevents listing the whole bucket via the API.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read posts" ON storage.objects;
DROP POLICY IF EXISTS "Public read statuses" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat" ON storage.objects;
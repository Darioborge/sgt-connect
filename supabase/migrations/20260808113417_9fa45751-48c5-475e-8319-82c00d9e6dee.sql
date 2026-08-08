
-- 1. Hide sensitive profile columns from anonymous visitors
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, full_name, avatar_url, cover_url, bio, city, mode, category,
              price_from_kz, rating, jobs_done, available, verified, created_at, updated_at,
              location_enabled)
  ON public.profiles TO anon;

-- 2. Scope shared media reads to real user folders instead of whole buckets
DROP POLICY IF EXISTS read_shared_media ON storage.objects;
CREATE POLICY "Shared profile media readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = ANY (ARRAY['avatars','covers','posts','statuses'])
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
  )
);

-- 3. Internal trigger/helper functions must not be directly callable
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_monetization() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_verify_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_billing_invoice_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

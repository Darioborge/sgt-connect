
-- 1) profiles: restrict anon to non-sensitive columns; keep authenticated full access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles readable" ON public.profiles FOR SELECT USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, full_name, avatar_url, cover_url, bio, city, mode, category, price_from_kz, rating, jobs_done, available, verified, created_at, updated_at, location_enabled) ON public.profiles TO anon;

-- 2) smart_post_events: remove always-true INSERT policy, require authenticated
DROP POLICY IF EXISTS "Anyone can insert events" ON public.smart_post_events;
CREATE POLICY "Authenticated can insert events" ON public.smart_post_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.smart_posts sp WHERE sp.id = smart_post_events.post_id)
  );

-- 3) storage: smart-posts bucket - restrict listing, keep public URL reads working (URLs bypass RLS)
DROP POLICY IF EXISTS "Smart posts images public read" ON storage.objects;
CREATE POLICY "Smart posts owner can list" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'smart-posts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) SECURITY DEFINER functions: revoke public execute, grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.conclude_booking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_billing_invoice_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.apply_coupon(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conclude_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_billing_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Trigger-only functions: revoke from all client roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_monetization() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_verify_profile() FROM PUBLIC, anon, authenticated;

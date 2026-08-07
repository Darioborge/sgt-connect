CREATE TYPE public.booking_status AS ENUM ('pendente', 'confirmado', 'em_curso', 'concluido', 'cancelado', 'recusado');
CREATE TYPE public.coupon_type AS ENUM ('percentual', 'fixo');
CREATE TYPE public.emergency_status AS ENUM ('aberto', 'aceite', 'fechado', 'cancelado');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  category TEXT,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER DEFAULT 60,
  address TEXT,
  price_kz INTEGER NOT NULL DEFAULT 0,
  discount_kz INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  status public.booking_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (client_id <> provider_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
CREATE INDEX idx_bookings_provider_time ON public.bookings(provider_id, scheduled_at);
CREATE INDEX idx_bookings_client_time ON public.bookings(client_id, scheduled_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "Clients create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Participants update bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1000;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  number TEXT NOT NULL UNIQUE DEFAULT ('SGT-' || to_char(now(),'YY') || '-' || nextval('public.invoice_seq')),
  service_name TEXT NOT NULL,
  amount_kz INTEGER NOT NULL,
  discount_kz INTEGER NOT NULL DEFAULT 0,
  total_kz INTEGER NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_provider ON public.invoices(provider_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "Provider creates invoice" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.coupon_type NOT NULL DEFAULT 'percentual',
  value INTEGER NOT NULL CHECK (value > 0),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
CREATE INDEX idx_coupons_code ON public.coupons(code);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active coupons viewable" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own redemptions" ON public.coupon_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_replies TO authenticated;
GRANT ALL ON public.quick_replies TO service_role;
CREATE INDEX idx_quick_replies_user ON public.quick_replies(user_id, position);
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own quick replies" ON public.quick_replies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own quick replies" ON public.quick_replies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  city TEXT DEFAULT 'Luanda',
  status public.emergency_status NOT NULL DEFAULT 'aberto',
  accepted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_requests TO authenticated;
GRANT ALL ON public.emergency_requests TO service_role;
CREATE INDEX idx_emergency_status ON public.emergency_requests(status, category);
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open emergencies visible to providers" ON public.emergency_requests
  FOR SELECT USING (
    auth.uid() = client_id
    OR auth.uid() = accepted_by
    OR (status = 'aberto' AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.mode = 'prestador' AND p.available = true
    ))
  );
CREATE POLICY "Clients create emergencies" ON public.emergency_requests FOR INSERT
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client or accepter updates emergency" ON public.emergency_requests FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = accepted_by);

CREATE OR REPLACE FUNCTION public.apply_coupon(_code TEXT, _amount INTEGER)
RETURNS TABLE(coupon_id UUID, discount_kz INTEGER, total_kz INTEGER, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c RECORD;
  _discount INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0, _amount, 'Não autenticado'::TEXT; RETURN;
  END IF;
  SELECT * INTO c FROM public.coupons WHERE code = upper(_code) AND active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 0, _amount, 'Cupão inválido'::TEXT; RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT NULL::UUID, 0, _amount, 'Cupão expirado'::TEXT; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN QUERY SELECT NULL::UUID, 0, _amount, 'Cupão esgotado'::TEXT; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = c.id AND user_id = auth.uid()) THEN
    RETURN QUERY SELECT NULL::UUID, 0, _amount, 'Já usaste este cupão'::TEXT; RETURN;
  END IF;
  IF c.type = 'percentual' THEN
    _discount := (_amount * c.value) / 100;
  ELSE
    _discount := LEAST(c.value, _amount);
  END IF;
  RETURN QUERY SELECT c.id, _discount, GREATEST(_amount - _discount, 0), 'OK'::TEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_coupon(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.conclude_booking(_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b RECORD;
  _invoice_id UUID;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agendamento não encontrado'; END IF;
  IF auth.uid() <> b.provider_id THEN RAISE EXCEPTION 'Apenas o prestador pode concluir'; END IF;
  UPDATE public.bookings SET status = 'concluido', updated_at = now() WHERE id = _booking_id;
  INSERT INTO public.invoices (booking_id, client_id, provider_id, service_name, amount_kz, discount_kz, total_kz)
  VALUES (b.id, b.client_id, b.provider_id, COALESCE(b.category,'Serviço'), b.price_kz, b.discount_kz, GREATEST(b.price_kz - b.discount_kz, 0))
  RETURNING id INTO _invoice_id;
  UPDATE public.profiles SET jobs_done = COALESCE(jobs_done,0) + 1 WHERE id = b.provider_id;
  RETURN _invoice_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.conclude_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.conclude_booking(uuid) TO authenticated;

INSERT INTO public.coupons (code, description, type, value, max_uses, active)
VALUES
  ('BEMVINDO10', 'Bem-vindo — 10% off na primeira contratação', 'percentual', 10, 1000, true),
  ('SGT500', '500 Kz de desconto', 'fixo', 500, 500, true)
ON CONFLICT (code) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;

CREATE TABLE public.smart_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_image_url TEXT,
  generated_image_url TEXT,
  title TEXT,
  caption_short TEXT,
  caption_medium TEXT,
  caption_long TEXT,
  copy_direct TEXT,
  copy_emotional TEXT,
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  mode TEXT NOT NULL DEFAULT 'viral',
  format TEXT NOT NULL DEFAULT 'square',
  audience TEXT,
  emotion TEXT,
  service_type TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smart_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_posts TO authenticated;
GRANT ALL ON public.smart_posts TO service_role;
ALTER TABLE public.smart_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Smart posts viewable by everyone" ON public.smart_posts FOR SELECT USING (true);
CREATE POLICY "Users insert own smart posts" ON public.smart_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own smart posts" ON public.smart_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own smart posts" ON public.smart_posts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER smart_posts_updated_at
  BEFORE UPDATE ON public.smart_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_smart_posts_user ON public.smart_posts(user_id, created_at DESC);

CREATE TABLE public.smart_post_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.smart_posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','click','convert')),
  visitor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.smart_post_events TO authenticated;
GRANT ALL ON public.smart_post_events TO service_role;
ALTER TABLE public.smart_post_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can insert events" ON public.smart_post_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.smart_posts sp WHERE sp.id = smart_post_events.post_id));
CREATE POLICY "Owner views events" ON public.smart_post_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.smart_posts sp WHERE sp.id = post_id AND sp.user_id = auth.uid()));
CREATE INDEX idx_smart_post_events_post ON public.smart_post_events(post_id, event_type);

CREATE POLICY "Smart posts owner can list" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'smart-posts' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth users upload smart posts" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'smart-posts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Owners update smart posts files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'smart-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete smart posts files" ON storage.objects FOR DELETE
  USING (bucket_id = 'smart-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.auto_verify_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0
     AND NEW.username IS NOT NULL AND length(trim(NEW.username)) > 0
     AND NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 0
     AND NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0
     AND NEW.city IS NOT NULL AND length(trim(NEW.city)) > 0
     AND NEW.category IS NOT NULL AND length(trim(NEW.category)) > 0
     AND NEW.price_from_kz IS NOT NULL AND NEW.price_from_kz > 0
     AND NEW.avatar_url IS NOT NULL AND length(trim(NEW.avatar_url)) > 0
  THEN
    NEW.verified := true;
  ELSE
    NEW.verified := false;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.auto_verify_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_auto_verify_profile ON public.profiles;
CREATE TRIGGER trg_auto_verify_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_verify_profile();
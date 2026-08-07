CREATE TYPE public.plan_tier AS ENUM ('gratuito', 'premium');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'confirmado', 'rejeitado', 'cancelado');
CREATE TYPE public.payment_method AS ENUM ('multicaixa_express', 'transferencia_iban', 'cartao');
CREATE TYPE public.payment_kind AS ENUM ('assinatura_premium', 'creditos_ia', 'promover_post', 'template_pack');
CREATE TYPE public.boost_level AS ENUM ('basico', 'medio', 'alto');

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier public.plan_tier NOT NULL DEFAULT 'gratuito',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 5,
  total_purchased integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_credits TO authenticated;
GRANT ALL ON public.ai_credits TO service_role;
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credits" ON public.ai_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credits" ON public.ai_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage credits" ON public.ai_credits FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_credits_updated_at BEFORE UPDATE ON public.ai_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.payment_kind NOT NULL,
  amount_kz integer NOT NULL CHECK (amount_kz > 0),
  method public.payment_method NOT NULL DEFAULT 'multicaixa_express',
  status public.payment_status NOT NULL DEFAULT 'pendente',
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own payments" ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pendente');
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payments_user_status ON public.payments(user_id, status);

CREATE TABLE public.post_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  smart_post_id uuid NOT NULL REFERENCES public.smart_posts(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  level public.boost_level NOT NULL,
  amount_kz integer NOT NULL,
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_boosts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_boosts TO authenticated;
GRANT ALL ON public.post_boosts TO service_role;
ALTER TABLE public.post_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boosts viewable by everyone" ON public.post_boosts FOR SELECT USING (true);
CREATE POLICY "Users create own boosts" ON public.post_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage boosts" ON public.post_boosts FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_post_boosts_active ON public.post_boosts(active, expires_at) WHERE active = true;

CREATE TABLE public.template_packs_owned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id text NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_packs_owned TO authenticated;
GRANT ALL ON public.template_packs_owned TO service_role;
ALTER TABLE public.template_packs_owned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own packs" ON public.template_packs_owned FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own packs" ON public.template_packs_owned FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage packs" ON public.template_packs_owned FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user_monetization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'gratuito') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.ai_credits (user_id, balance) VALUES (NEW.id, 5) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_monetization() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created_monetization ON auth.users;
CREATE TRIGGER on_auth_user_created_monetization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_monetization();

INSERT INTO public.subscriptions (user_id, tier) SELECT id, 'gratuito' FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.ai_credits (user_id, balance) SELECT id, 5 FROM public.profiles ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p RECORD;
  _credits int;
  _months int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem confirmar pagamentos';
  END IF;
  SELECT * INTO p FROM public.payments WHERE id = _payment_id AND status = 'pendente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado ou já processado'; END IF;
  UPDATE public.payments SET status = 'confirmado', confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _payment_id;
  IF p.kind = 'assinatura_premium' THEN
    _months := COALESCE((p.metadata->>'months')::int, 1);
    INSERT INTO public.subscriptions (user_id, tier, started_at, expires_at, auto_renew)
      VALUES (p.user_id, 'premium', now(), now() + (_months || ' months')::interval, false)
      ON CONFLICT (user_id) DO UPDATE
        SET tier = 'premium',
            started_at = CASE WHEN public.subscriptions.tier = 'premium' AND public.subscriptions.expires_at > now()
                              THEN public.subscriptions.started_at ELSE now() END,
            expires_at = CASE WHEN public.subscriptions.tier = 'premium' AND public.subscriptions.expires_at > now()
                              THEN public.subscriptions.expires_at + (_months || ' months')::interval
                              ELSE now() + (_months || ' months')::interval END,
            updated_at = now();
  ELSIF p.kind = 'creditos_ia' THEN
    _credits := COALESCE((p.metadata->>'credits')::int, 0);
    UPDATE public.ai_credits SET balance = balance + _credits, total_purchased = total_purchased + _credits, updated_at = now()
      WHERE user_id = p.user_id;
  ELSIF p.kind = 'promover_post' THEN
    UPDATE public.post_boosts SET active = true, starts_at = now(), expires_at = now() + interval '7 days'
      WHERE payment_id = p.id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid) TO authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (latitude, longitude) WHERE location_enabled = true;

CREATE SEQUENCE IF NOT EXISTS public.contract_seq START 1000;
CREATE TYPE public.contract_status AS ENUM ('pendente', 'assinado_prestador', 'assinado_ambos', 'rejeitado', 'concluido');

CREATE TABLE public.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL DEFAULT ('NUP-' || to_char(now(), 'YY') || '-' || nextval('public.contract_seq')),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  provider_name TEXT,
  provider_doc TEXT,
  provider_phone TEXT,
  provider_iban TEXT,
  provider_mcx TEXT,
  provider_logo_url TEXT,
  client_name TEXT,
  client_doc TEXT,
  client_phone TEXT,
  service_title TEXT NOT NULL,
  service_description TEXT,
  amount_kz INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  conditions TEXT,
  status public.contract_status NOT NULL DEFAULT 'pendente',
  signed_provider_at TIMESTAMPTZ,
  signed_client_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_contracts TO authenticated;
GRANT ALL ON public.service_contracts TO service_role;
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view contracts" ON public.service_contracts FOR SELECT
  USING (auth.uid() = provider_id OR auth.uid() = client_id);
CREATE POLICY "Provider creates contract" ON public.service_contracts FOR INSERT
  WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Participants update contract" ON public.service_contracts FOR UPDATE
  USING (auth.uid() = provider_id OR auth.uid() = client_id);
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_contracts_conversation ON public.service_contracts(conversation_id);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.service_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_contracts;

CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read reactions" ON public.message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));
CREATE POLICY "Participants react" ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));
CREATE POLICY "Owner removes reaction" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'video' CHECK (kind IN ('audio','video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','rejected','ended','missed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read calls" ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Caller creates call" ON public.calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Participants update call" ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

CREATE TABLE public.billing_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_clients TO authenticated;
GRANT ALL ON public.billing_clients TO service_role;
ALTER TABLE public.billing_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.billing_clients FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_billing_clients_updated BEFORE UPDATE ON public.billing_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_billing_clients_user ON public.billing_clients(user_id);

CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.billing_clients(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_kz INTEGER NOT NULL DEFAULT 0,
  tax_kz INTEGER NOT NULL DEFAULT 0,
  discount_kz INTEGER NOT NULL DEFAULT 0,
  total_kz INTEGER NOT NULL DEFAULT 0,
  paid_kz INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'emitida',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_invoices TO authenticated;
GRANT ALL ON public.billing_invoices TO service_role;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoices" ON public.billing_invoices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_billing_invoices_updated BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_billing_invoices_user ON public.billing_invoices(user_id);
CREATE INDEX idx_billing_invoices_client ON public.billing_invoices(client_id);

CREATE TABLE public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  amount_kz INTEGER NOT NULL,
  method TEXT,
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_payments TO authenticated;
GRANT ALL ON public.billing_payments TO service_role;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.billing_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_billing_payments_invoice ON public.billing_payments(invoice_id);

CREATE OR REPLACE FUNCTION public.next_billing_invoice_number(_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _year TEXT := to_char(now(), 'YYYY');
  _count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.billing_invoices
  WHERE user_id = _user_id AND number LIKE 'FT-' || _year || '-%';
  RETURN 'FT-' || _year || '-' || LPAD(_count::TEXT, 4, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_billing_invoice_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_billing_invoice_number(uuid) TO authenticated;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, full_name, avatar_url, cover_url, bio, city, mode, category, price_from_kz, rating, jobs_done, available, verified, created_at, updated_at, location_enabled) ON public.profiles TO anon;

REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
-- Enums
CREATE TYPE public.plan_tier AS ENUM ('gratuito', 'premium');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'confirmado', 'rejeitado', 'cancelado');
CREATE TYPE public.payment_method AS ENUM ('multicaixa_express', 'transferencia_iban', 'cartao');
CREATE TYPE public.payment_kind AS ENUM ('assinatura_premium', 'creditos_ia', 'promover_post', 'template_pack');
CREATE TYPE public.boost_level AS ENUM ('basico', 'medio', 'alto');

-- Subscriptions
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

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AI Credits
CREATE TABLE public.ai_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 5,
  total_purchased integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credits" ON public.ai_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credits" ON public.ai_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage credits" ON public.ai_credits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_credits_updated_at
  BEFORE UPDATE ON public.ai_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payments
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

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pendente');
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payments_user_status ON public.payments(user_id, status);

-- Post boosts
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

ALTER TABLE public.post_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boosts viewable by everyone" ON public.post_boosts
  FOR SELECT USING (true);
CREATE POLICY "Users create own boosts" ON public.post_boosts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage boosts" ON public.post_boosts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_post_boosts_active ON public.post_boosts(active, expires_at) WHERE active = true;

-- Template packs ownership
CREATE TABLE public.template_packs_owned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id text NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

ALTER TABLE public.template_packs_owned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own packs" ON public.template_packs_owned
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own packs" ON public.template_packs_owned
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage packs" ON public.template_packs_owned
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap on signup: free plan + 5 bonus credits
CREATE OR REPLACE FUNCTION public.handle_new_user_monetization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'gratuito')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.ai_credits (user_id, balance) VALUES (NEW.id, 5)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_monetization ON auth.users;
CREATE TRIGGER on_auth_user_created_monetization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_monetization();

-- Backfill existing users
INSERT INTO public.subscriptions (user_id, tier)
  SELECT id, 'gratuito' FROM public.profiles
  ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.ai_credits (user_id, balance)
  SELECT id, 5 FROM public.profiles
  ON CONFLICT (user_id) DO NOTHING;

-- Confirm payment & deliver entitlement (called by admin)
CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  UPDATE public.payments
    SET status = 'confirmado', confirmed_at = now(), confirmed_by = auth.uid()
    WHERE id = _payment_id;

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
    UPDATE public.ai_credits
      SET balance = balance + _credits,
          total_purchased = total_purchased + _credits,
          updated_at = now()
      WHERE user_id = p.user_id;
  ELSIF p.kind = 'promover_post' THEN
    UPDATE public.post_boosts
      SET active = true, starts_at = now(),
          expires_at = now() + interval '7 days'
      WHERE payment_id = p.id;
  ELSIF p.kind = 'template_pack' THEN
    -- pack already inserted by user; nothing else to do
    NULL;
  END IF;
END;
$$;
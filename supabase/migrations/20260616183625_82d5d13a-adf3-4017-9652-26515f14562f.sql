
-- Clients
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

-- Invoices
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

-- Payments
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

-- Sequential invoice number generator
CREATE OR REPLACE FUNCTION public.next_billing_invoice_number(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT := to_char(now(), 'YYYY');
  _count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO _count
  FROM public.billing_invoices
  WHERE user_id = _user_id
    AND number LIKE 'FT-' || _year || '-%';
  RETURN 'FT-' || _year || '-' || LPAD(_count::TEXT, 4, '0');
END;
$$;


CREATE SEQUENCE IF NOT EXISTS contract_seq START 1000;

CREATE TYPE contract_status AS ENUM ('pendente', 'assinado_prestador', 'assinado_ambos', 'rejeitado', 'concluido');

CREATE TABLE public.service_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL DEFAULT ('NUP-' || to_char(now(), 'YY') || '-' || nextval('contract_seq')),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  -- Prestador
  provider_name TEXT,
  provider_doc TEXT,
  provider_phone TEXT,
  provider_iban TEXT,
  provider_mcx TEXT,
  provider_logo_url TEXT,
  -- Cliente
  client_name TEXT,
  client_doc TEXT,
  client_phone TEXT,
  -- Serviço
  service_title TEXT NOT NULL,
  service_description TEXT,
  amount_kz INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  conditions TEXT,
  -- Assinaturas
  status contract_status NOT NULL DEFAULT 'pendente',
  signed_provider_at TIMESTAMPTZ,
  signed_client_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view contracts"
  ON public.service_contracts FOR SELECT
  USING (auth.uid() = provider_id OR auth.uid() = client_id);

CREATE POLICY "Provider creates contract"
  ON public.service_contracts FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Participants update contract"
  ON public.service_contracts FOR UPDATE
  USING (auth.uid() = provider_id OR auth.uid() = client_id);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_contracts_conversation ON public.service_contracts(conversation_id);

ALTER TABLE public.messages ADD COLUMN contract_id UUID REFERENCES public.service_contracts(id) ON DELETE SET NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_contracts;

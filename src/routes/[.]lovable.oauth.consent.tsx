import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const oauth = (supabase.auth as unknown as {
      oauth: {
        getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
      };
    }).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar este pedido de autorização: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

function Consent() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "esta aplicação";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as {
      oauth: {
        approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
        denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
      };
    }).oauth;
    const { data, error: err } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não devolveu um endereço de retorno.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Ligar {clientName} à tua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Isto permite que {clientName} aceda ao BB Serviços Express em teu nome: ver e atualizar o teu perfil, publicações,
          agendamentos e faturação.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Autorizar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="w-full rounded-xl border border-border bg-background py-3 text-sm font-medium text-muted-foreground disabled:opacity-60"
          >
            Recusar
          </button>
        </div>
      </div>
    </main>
  );
}

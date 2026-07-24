import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { usePlan } from "@/hooks/usePlan";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PREMIUM_PLANS,
  PREMIUM_BENEFITS,
  CREDIT_PACKS,
  TEMPLATE_PACKS,
  BOOST_OPTIONS,
  fmtKz,
} from "@/lib/monetization";
import { CheckoutDialog, type CheckoutPayload } from "@/components/sgt/CheckoutDialog";
import {
  ArrowLeft,
  Check,
  Crown,
  Sparkles,
  Rocket,
  Package,
  Zap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/planos")({
  component: () => (
    <RequireAuth>
      <Planos />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Planos & Créditos — Núpublico" }] }),
});

type Tab = "assinatura" | "promover";

function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, expiresAt, isPremiumActive, credits, refresh } = usePlan(user?.id);
  const [tab, setTab] = useState<Tab>("assinatura");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [posts, setPosts] = useState<{ id: string; title: string | null }[]>([]);
  const [boostPostId, setBoostPostId] = useState<string>("");
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("template_packs_owned")
      .select("pack_id")
      .eq("user_id", user.id)
      .then(({ data }) => setOwnedPacks((data ?? []).map((r) => r.pack_id)));
  }, [user]);

  useEffect(() => {
    if (tab !== "promover" || !user) return;
    setLoadingPosts(true);
    supabase
      .from("smart_posts")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPosts(data ?? []);
        if (data && data.length && !boostPostId) setBoostPostId(data[0].id);
        setLoadingPosts(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user]);

  const buyPremium = (planId: "mensal" | "trimestral") => {
    const plan = PREMIUM_PLANS.find((p) => p.id === planId)!;
    setCheckout({
      kind: "assinatura_premium",
      amountKz: plan.priceKz,
      title: `Premium — ${plan.label}`,
      subtitle: `${fmtKz(plan.perMonthKz)}/mês • selo azul, posts ilimitados, sem marca de água`,
      metadata: { months: plan.months },
    });
  };

  const buyCredits = (packId: string) => {
    const pack = CREDIT_PACKS.find((p) => p.id === packId)!;
    setCheckout({
      kind: "creditos_ia",
      amountKz: pack.priceKz,
      title: pack.label,
      subtitle: `${pack.credits} gerações de IA para criar posts`,
      metadata: { credits: pack.credits },
    });
  };

  const buyTemplatePack = (packId: string) => {
    const pack = TEMPLATE_PACKS.find((p) => p.id === packId)!;
    setCheckout({
      kind: "template_pack",
      amountKz: pack.priceKz,
      title: pack.label,
      subtitle: `${pack.count} templates premium`,
      metadata: { pack_id: pack.id },
      onCreated: async (paymentId) => {
        if (!user) return;
        await supabase.from("template_packs_owned").insert({
          user_id: user.id,
          pack_id: pack.id,
          payment_id: paymentId,
        });
      },
    });
  };

  const boostPost = (level: "basico" | "medio" | "alto") => {
    if (!boostPostId) {
      toast.error("Escolhe um post para promover");
      return;
    }
    const opt = BOOST_OPTIONS.find((b) => b.id === level)!;
    setCheckout({
      kind: "promover_post",
      amountKz: opt.priceKz,
      title: `Promover — ${opt.label}`,
      subtitle: opt.reach,
      metadata: { post_id: boostPostId, level },
      onCreated: async (paymentId) => {
        if (!user) return;
        await supabase.from("post_boosts").insert({
          user_id: user.id,
          smart_post_id: boostPostId,
          payment_id: paymentId,
          level,
          amount_kz: opt.priceKz,
          active: false,
        });
      },
    });
  };

  return (
    <MobileShell hideTopBar>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/configuracoes" })} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Planos & Créditos</h1>
      </header>

      {/* Status */}
      <div className="px-4 pt-4">
        <div
          className="rounded-2xl p-4 text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center gap-2">
            {isPremiumActive ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            <p className="text-sm font-semibold">
              {isPremiumActive ? "Plano Premium ativo" : "Plano Gratuito"}
            </p>
          </div>
          {isPremiumActive && expiresAt && (
            <p className="mt-1 text-xs opacity-80">
              Renova / expira em {new Date(expiresAt).toLocaleDateString("pt-PT")}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-white/15 px-3 py-2 backdrop-blur">
              <p className="opacity-80">Créditos IA</p>
              <p className="text-lg font-bold">{credits}</p>
            </div>
            <div className="rounded-lg bg-white/15 px-3 py-2 backdrop-blur">
              <p className="opacity-80">Posts/dia</p>
              <p className="text-lg font-bold">{isPremiumActive ? "∞" : "3"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 mt-4 border-b border-border bg-background/90 px-2 backdrop-blur">
        <div className="flex gap-1">
          <TabBtn active={tab === "assinatura"} onClick={() => setTab("assinatura")} icon={<Crown className="h-4 w-4" />}>
            Assinatura
          </TabBtn>
          <TabBtn active={tab === "promover"} onClick={() => setTab("promover")} icon={<Rocket className="h-4 w-4" />}>

            Promover
          </TabBtn>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 pb-8">
        {tab === "assinatura" && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tudo o que ganhas
              </p>
              <ul className="space-y-1.5">
                {PREMIUM_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {PREMIUM_PLANS.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtKz(plan.perMonthKz)}/mês
                    </p>
                  </div>
                  {plan.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-extrabold">{fmtKz(plan.priceKz)}</p>
                <button
                  onClick={() => buyPremium(plan.id)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {isPremiumActive ? "Renovar" : "Subscrever"}
                </button>
              </div>
            ))}

            <h3 className="mt-2 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4" /> Packs de templates
            </h3>
            {TEMPLATE_PACKS.map((pack) => {
              const owned = ownedPacks.includes(pack.id);
              return (
                <div key={pack.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{pack.label}</p>
                      <p className="text-xs text-muted-foreground">{pack.desc}</p>
                    </div>
                    <p className="text-base font-bold">{fmtKz(pack.priceKz)}</p>
                  </div>
                  <button
                    disabled={owned}
                    onClick={() => buyTemplatePack(pack.id)}
                    className="mt-3 w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {owned ? "Já adquirido" : "Comprar pack"}
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === "creditos" && (
          <>
            <p className="text-xs text-muted-foreground">
              Cada geração de post com IA consome 1 crédito. Compra packs para gerar mais.
            </p>
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{pack.label}</p>
                    <p className="text-xs text-muted-foreground">{pack.credits} gerações de IA</p>
                  </div>
                  <p className="text-base font-bold">{fmtKz(pack.priceKz)}</p>
                </div>
                <button
                  onClick={() => buyCredits(pack.id)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Comprar
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "promover" && (
          <>
            <p className="text-xs text-muted-foreground">
              Aumenta o alcance de um post para conseguir mais clientes.
            </p>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Escolhe o post a promover
              </span>
              {loadingPosts ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted-foreground">
                  Ainda não tens posts. Cria um na secção Inspiração.
                </div>
              ) : (
                <select
                  value={boostPostId}
                  onChange={(e) => setBoostPostId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || `Post ${p.id.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {BOOST_OPTIONS.map((opt) => (
              <div key={opt.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    <p className="mt-1 text-xs text-primary">{opt.reach}</p>
                  </div>
                  <p className="text-base font-bold">{fmtKz(opt.priceKz)}</p>
                </div>
                <button
                  disabled={!boostPostId}
                  onClick={() => boostPost(opt.id)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Promover por {fmtKz(opt.priceKz)}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <CheckoutDialog payload={checkout} onClose={() => setCheckout(null)} onSuccess={refresh} />
    </MobileShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-semibold transition ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { categories } from "@/components/sgt/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Bell, Star, BadgeCheck, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "avatar_url" | "verified" | "category" | "city" | "rating" | "price_from_kz"
>;

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nupublico — Serviços profissionais em Angola" },
      {
        name: "description",
        content:
          "Encontra canalizadores, eletricistas, pintores e mais profissionais de confiança perto de ti, em Angola.",
      },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Profile[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, verified, category, city, rating, price_from_kz")
      .eq("mode", "prestador")
      .eq("available", true)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => setProviders(data ?? []));
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/explorar" });
  };

  return (
    <MobileShell>
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <h1 className="text-2xl tracking-tight text-white">
          <span className="font-semibold text-primary">Nupublico</span>
        </h1>
        <button
          onClick={() => navigate({ to: "/agendamentos" })}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card/60 text-white transition hover:bg-card"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={submitSearch} className="px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="De que serviço precisas hoje?"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </form>

      <section className="mt-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Categorias</h2>
          <Link to="/explorar" className="text-xs font-medium text-primary">Ver todas</Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              to="/explorar"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-3 text-center transition hover:border-primary/50"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white/80">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 px-4 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Profissionais recomendados</h2>
          <Link to="/mapa" className="flex items-center gap-1 text-xs font-medium text-primary">
            <MapPin className="h-3 w-3" /> Mapa
          </Link>
        </div>

        {providers === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : providers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
            Ainda não há profissionais disponíveis. Volta em breve.
          </p>
        ) : (
          <ul className="space-y-2">
            {providers.map((p) => (
              <li key={p.id}>
                <Link
                  to="/perfil/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${p.full_name ?? "U"}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold text-white">
                      <span className="truncate">{p.full_name ?? "Utilizador"}</span>
                      {p.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.category ?? "Serviços"} • {p.city ?? "Luanda"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="font-medium text-white/90">{p.rating ?? 0}</span>
                      {p.price_from_kz && (
                        <span className="text-muted-foreground">
                          • desde {p.price_from_kz.toLocaleString("pt-PT")} Kz
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}

import { Img } from "@/components/sgt/Img";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { Search, Star, BadgeCheck, Loader2, Calendar } from "lucide-react";
import { categories } from "@/components/sgt/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/sgt/BookingDialog";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const Route = createFileRoute("/explorar")({
  component: Explorar,
  head: () => ({ meta: [{ title: "Explorar — BB Serviços Express" }] }),
});

function Explorar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Profile[] | null>(null);
  const [filter, setFilter] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [bookFor, setBookFor] = useState<Profile | null>(null);

  useEffect(() => {
    let q = supabase.from("profiles").select("*").eq("mode", "prestador");
    if (cat) q = q.eq("category", cat);
    q.order("rating", { ascending: false }).limit(50).then(({ data }) => setProviders(data ?? []));
  }, [cat]);

  const filtered =
    providers?.filter((p) =>
      [p.full_name, p.category, p.city].some((s) => (s ?? "").toLowerCase().includes(filter.toLowerCase())),
    ) ?? null;

  const contratar = async (provider: Profile) => {
    if (!user) return navigate({ to: "/auth" });
    if (provider.id === user.id) return toast.info("Não podes contratar a ti mesmo");
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: provider.id });
    if (error || !data) return toast.error(error?.message ?? "Erro");
    navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Procurar prestadores…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setCat(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
            !cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary",
          )}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.label)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              cat === c.label ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary",
            )}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {filtered === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum prestador encontrado.</p>
      ) : (
        <ul className="space-y-2 px-3 pb-6">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <Img
                src={p.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${p.full_name ?? "U"}`}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {p.full_name ?? "Utilizador"}
                  {p.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.category ?? "—"} • {p.city ?? "Luanda"}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="font-medium">{p.rating ?? 0}</span>
                  {p.price_from_kz && (
                    <span className="text-muted-foreground">• desde {p.price_from_kz.toLocaleString("pt-PT")} Kz</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => contratar(p)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Chat
                </button>
                <button
                  onClick={() => {
                    if (!user) return navigate({ to: "/auth" });
                    if (p.id === user.id) return toast.info("Não podes agendar contigo");
                    setBookFor(p);
                  }}
                  className="flex items-center justify-center gap-1 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <Calendar className="h-3 w-3" /> Agendar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {bookFor && (
        <BookingDialog
          open={!!bookFor}
          onClose={() => setBookFor(null)}
          provider={{
            id: bookFor.id,
            full_name: bookFor.full_name,
            category: bookFor.category,
            price_from_kz: bookFor.price_from_kz,
          }}
        />
      )}
    </MobileShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { providers, categories } from "@/components/sgt/data";
import { Search, Star, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/explorar")({
  component: Explorar,
  head: () => ({ meta: [{ title: "Explorar prestadores — SGT Express" }] }),
});

function Explorar() {
  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Procurar serviços ou prestadores"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-card"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="relative aspect-square">
              <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
              {p.online && (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> online
                </span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1 text-sm font-semibold">
                {p.name.split(" ")[0]}
                {p.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground">{p.category} • {p.distanceKm} km</p>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="font-medium">{p.rating}</span>
                <span className="text-muted-foreground">({p.jobs})</span>
              </div>
              <button
                className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Contratar
              </button>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

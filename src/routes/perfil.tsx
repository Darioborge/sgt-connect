import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { Settings, BadgeCheck, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
  head: () => ({ meta: [{ title: "Meu perfil — SGT Express" }] }),
});

function Perfil() {
  const [mode, setMode] = useState<"cliente" | "prestador">("prestador");

  return (
    <MobileShell>
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-base font-semibold">@joaquim_sgt</span>
        <button className="text-muted-foreground"><Settings className="h-5 w-5" /></button>
      </div>

      <div className="flex items-center gap-4 px-4 py-4">
        <div
          className="rounded-full p-[2px]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <img
            src="https://i.pravatar.cc/120?img=58"
            alt="Avatar"
            className="h-20 w-20 rounded-full bg-background object-cover ring-2 ring-background"
          />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat label="Posts" value="24" />
          <Stat label="Seguidores" value="1.2k" />
          <Stat label="A seguir" value="312" />
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-1 text-sm font-semibold">
          Joaquim Mendes
          <BadgeCheck className="h-4 w-4 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">Eletricista certificado • Luanda</p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="font-medium">4.9</span>
          <span className="text-muted-foreground">• 184 serviços</span>
        </div>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 text-xs font-semibold">
        {(["cliente", "prestador"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-lg py-2 capitalize transition",
              mode === m ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            Modo {m}
          </button>
        ))}
      </div>

      {mode === "prestador" ? (
        <div className="mt-4 space-y-3 px-4 pb-6">
          <DashboardRow label="Ganhos do mês" value="245.000 Kz" />
          <DashboardRow label="Serviços realizados" value="32" />
          <DashboardRow label="Taxa de resposta" value="98%" />
          <DashboardRow label="Ranking" value="#7 em Luanda" />
          <button
            className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
          >
            Ativar disponibilidade
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 px-4 pb-6">
          <DashboardRow label="Pedidos ativos" value="2" />
          <DashboardRow label="Serviços concluídos" value="18" />
          <DashboardRow label="Avaliação média dada" value="4.8" />
          <button
            className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
          >
            Pedir um serviço
          </button>
        </div>
      )}
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function DashboardRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

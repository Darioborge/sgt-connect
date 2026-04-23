import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { Camera, Image as ImageIcon, Megaphone, Briefcase } from "lucide-react";

export const Route = createFileRoute("/publicar")({
  component: Publicar,
  head: () => ({ meta: [{ title: "Publicar — SGT Express" }] }),
});

const options = [
  { icon: Camera, title: "Novo Status (24h)", desc: "Mostre disponibilidade ou um trabalho rápido" },
  { icon: ImageIcon, title: "Post no SGT Connect", desc: "Partilhe um trabalho realizado no feed" },
  { icon: Megaphone, title: "Promoção", desc: "Crie uma oferta com prazo limitado" },
  { icon: Briefcase, title: "Solicitar serviço", desc: "Descreva o que precisa e receba propostas" },
] as const;

function Publicar() {
  return (
    <MobileShell>
      <div className="p-4">
        <h2 className="text-xl font-semibold">O que quer publicar?</h2>
        <p className="text-sm text-muted-foreground">Escolha um formato para começar.</p>

        <div className="mt-4 space-y-3">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.title}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}

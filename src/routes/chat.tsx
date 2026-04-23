import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { providers } from "@/components/sgt/data";
import { Search } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => ({ meta: [{ title: "Mensagens — SGT Express" }] }),
});

const previews = [
  { providerId: "p1", text: "Posso passar amanhã às 9h?", time: "12:42", unread: 2 },
  { providerId: "p4", text: "Marcado! Obrigada 💚", time: "11:08", unread: 0 },
  { providerId: "p2", text: "Enviei o orçamento", time: "Ontem", unread: 1 },
  { providerId: "p5", text: "A caminho 🚚", time: "Seg", unread: 0 },
];

function Chat() {
  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Procurar conversas"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {previews.map((c) => {
          const p = providers.find((pr) => pr.id === c.providerId)!;
          return (
            <li key={c.providerId}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/40">
                <div className="relative">
                  <img src={p.avatar} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
                  {p.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{c.text}</span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </MobileShell>
  );
}

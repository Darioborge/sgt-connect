import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Loader2, CheckCircle2, X, Play, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setBookingStatus, concludeBooking } from "@/lib/booking";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/agendamentos")({
  component: () => (
    <RequireAuth>
      <Bookings />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Agendamentos — Núpublico" }] }),
});

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const STATUS_LABEL: Record<Booking["status"], string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  em_curso: "Em curso",
  concluido: "Concluído",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<Booking["status"], string> = {
  pendente: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  confirmado: "bg-primary/15 text-primary",
  em_curso: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  concluido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  recusado: "bg-destructive/15 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const fmtKz = (n: number) => new Intl.NumberFormat("pt-PT").format(n) + " Kz";

function Bookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"recebidos" | "meus">("recebidos");
  const [items, setItems] = useState<Booking[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const col = tab === "recebidos" ? "provider_id" : "client_id";
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq(col, user.id)
      .order("scheduled_at", { ascending: false });
    setItems(data ?? []);
  }, [user, tab]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`bookings-${user.id}-${tab}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, tab, load]);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const openChat = async (otherId: string) => {
    const { data } = await supabase.rpc("get_or_create_conversation", { _other: otherId });
    if (data) navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  return (
    <MobileShell>
      <div className="border-b border-border px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5 text-primary" /> Agendamentos
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-border bg-secondary/40 p-2 text-xs font-semibold">
        {(["recebidos", "meus"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg py-2 capitalize transition",
              tab === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            {t === "recebidos" ? "Recebidos (prestador)" : "Os meus pedidos"}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">Sem agendamentos.</p>
      ) : (
        <ul className="space-y-2 px-3 py-3">
          {items.map((b) => {
            const isProvider = user?.id === b.provider_id;
            const total = Math.max(b.price_kz - b.discount_kz, 0);
            return (
              <li key={b.id} className="rounded-2xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{b.category ?? "Serviço"}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(b.scheduled_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })} • {b.duration_min}min
                    </div>
                    {b.address && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {b.address}
                      </div>
                    )}
                    {b.description && <p className="mt-1 line-clamp-2 text-xs">{b.description}</p>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[b.status])}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">
                    {b.discount_kz > 0 && <span className="line-through mr-1">{fmtKz(b.price_kz)}</span>}
                    Total
                  </span>
                  <span className="text-base font-bold text-primary">{fmtKz(total)}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => openChat(isProvider ? b.client_id : b.provider_id)}
                    className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-accent"
                  >
                    <MessageCircle className="h-3 w-3" /> Chat
                  </button>

                  {isProvider && b.status === "pendente" && (
                    <>
                      <button
                        onClick={() => act(b.id, () => setBookingStatus(b.id, "confirmado"), "Confirmado")}
                        className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Aceitar
                      </button>
                      <button
                        onClick={() => act(b.id, () => setBookingStatus(b.id, "recusado"), "Recusado")}
                        className="flex items-center gap-1 rounded-full border border-destructive px-2.5 py-1 text-[11px] text-destructive"
                      >
                        <X className="h-3 w-3" /> Recusar
                      </button>
                    </>
                  )}
                  {isProvider && b.status === "confirmado" && (
                    <button
                      onClick={() => act(b.id, () => setBookingStatus(b.id, "em_curso"), "Em curso")}
                      className="flex items-center gap-1 rounded-full bg-primary/80 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                    >
                      <Play className="h-3 w-3" /> Iniciar
                    </button>
                  )}
                  {isProvider && (b.status === "em_curso" || b.status === "confirmado") && (
                    <button
                      onClick={() => act(b.id, async () => { await concludeBooking(b.id); }, "Concluído — fatura emitida")}
                      className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Concluir
                    </button>
                  )}
                  {!isProvider && (b.status === "pendente" || b.status === "confirmado") && (
                    <button
                      onClick={() => act(b.id, () => setBookingStatus(b.id, "cancelado"), "Cancelado")}
                      className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-accent"
                    >
                      <X className="h-3 w-3" /> Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </MobileShell>
  );
}

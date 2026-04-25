import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Siren, Loader2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/components/sgt/data";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/emergencia")({
  component: () => (
    <RequireAuth>
      <Emergency />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Emergência — Núpublico" }] }),
});

type Em = Database["public"]["Tables"]["emergency_requests"]["Row"];

function Emergency() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const isProvider = profile?.mode === "prestador";

  const [category, setCategory] = useState(categories[0].label);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Em[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("status", "aberto")
      .order("created_at", { ascending: false })
      .limit(30);
    setList(data ?? []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("emergencies")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const create = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("emergency_requests").insert({
        client_id: user.id,
        category,
        description: description || null,
        city: profile?.city ?? "Luanda",
      });
      if (error) throw error;
      toast.success("Pedido de emergência enviado — prestadores serão notificados");
      setDescription("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const accept = async (em: Em) => {
    if (!user) return;
    const { error } = await supabase
      .from("emergency_requests")
      .update({ status: "aceite", accepted_by: user.id })
      .eq("id", em.id);
    if (error) return toast.error(error.message);
    const { data } = await supabase.rpc("get_or_create_conversation", { _other: em.client_id });
    if (data) navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  const cancel = async (em: Em) => {
    await supabase.from("emergency_requests").update({ status: "cancelado", closed_at: new Date().toISOString() }).eq("id", em.id);
    toast.success("Cancelado");
  };

  return (
    <MobileShell>
      <div className="border-b border-border px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Siren className="h-5 w-5 text-destructive" /> Emergência
        </h1>
        <p className="text-xs text-muted-foreground">
          {isProvider ? "Pedidos urgentes na tua categoria" : "Precisas de um serviço urgente agora?"}
        </p>
      </div>

      {!isProvider && (
        <div className="space-y-3 border-b border-border px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.label}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">O que aconteceu?</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: rebentou um cano na cozinha"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <button
            onClick={create}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
            Enviar pedido urgente
          </button>
        </div>
      )}

      <div className="px-3 py-3">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isProvider ? "Pedidos abertos" : "Os teus pedidos abertos"}
        </h2>
        {list === null ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">Sem pedidos abertos.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((em) => {
              const mine = em.client_id === user?.id;
              return (
                <li key={em.id} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      URGENTE
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(em.created_at!).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold">{em.category}</div>
                  {em.description && <p className="mt-0.5 text-xs">{em.description}</p>}
                  <div className="mt-2 flex gap-2">
                    {!mine && isProvider && (
                      <button
                        onClick={() => accept(em)}
                        className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground"
                      >
                        <MessageCircle className="h-3 w-3" /> Aceitar e abrir chat
                      </button>
                    )}
                    {mine && (
                      <button
                        onClick={() => cancel(em)}
                        className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px]"
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
      </div>
    </MobileShell>
  );
}

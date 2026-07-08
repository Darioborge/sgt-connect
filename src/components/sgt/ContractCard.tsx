import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { Button } from "@/components/ui/button";
import { downloadContractPdf } from "@/lib/contract-pdf";
import { toast } from "sonner";
import { FileText, Download, PenLine, Check, X, Share2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Contract = Database["public"]["Tables"]["service_contracts"]["Row"];

interface Props {
  contractId: string;
  compact?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-500/15 text-amber-600" },
  assinado_prestador: { label: "À espera do cliente", cls: "bg-blue-500/15 text-blue-600" },
  assinado_ambos: { label: "Assinado", cls: "bg-green-500/15 text-green-600" },
  rejeitado: { label: "Rejeitado", cls: "bg-red-500/15 text-red-600" },
  concluido: { label: "Concluído", cls: "bg-green-600/15 text-green-700" },
};

export function ContractCard({ contractId, compact }: Props) {
  const { user } = useAuth();
  const [c, setC] = useState<Contract | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("service_contracts")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();
      setC(data);
    };
    load();
    const ch = supabase
      .channel(`contract-${contractId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_contracts", filter: `id=eq.${contractId}` },
        (payload) => setC(payload.new as Contract),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [contractId]);

  if (!c) return <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">A carregar contrato…</div>;

  const isProvider = user?.id === c.provider_id;
  const isClient = user?.id === c.client_id;
  const status = STATUS_LABEL[c.status] ?? STATUS_LABEL.pendente;

  const sign = async () => {
    if (!user) return;
    setBusy(true);
    const now = new Date().toISOString();
    let next: Partial<Contract> = {};
    if (isProvider && !c.signed_provider_at) {
      next = {
        signed_provider_at: now,
        status: c.signed_client_at ? "assinado_ambos" : "assinado_prestador",
      };
    } else if (isClient && !c.signed_client_at) {
      next = {
        signed_client_at: now,
        status: c.signed_provider_at ? "assinado_ambos" : "assinado_prestador",
      };
    } else {
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("service_contracts").update(next).eq("id", c.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato assinado");
  };

  const reject = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("service_contracts")
      .update({ status: "rejeitado", rejected_at: new Date().toISOString() })
      .eq("id", c.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato rejeitado");
  };

  const conclude = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("service_contracts")
      .update({ status: "concluido", completed_at: new Date().toISOString() })
      .eq("id", c.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contrato concluído");
  };

  const download = () => downloadContractPdf(c);

  const share = async () => {
    const text = `Contrato ${c.number} — ${c.service_title}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Contrato Núpublico", text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    }
  };

  const canSign =
    (isProvider && !c.signed_provider_at) || (isClient && !c.signed_client_at);
  const canReject = isClient && c.status === "pendente";
  const canConclude = isProvider && c.status === "assinado_ambos";

  return (
    <div className={cn("rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-3 shadow-sm", compact && "max-w-[280px]")}>
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{c.service_title}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">N. {c.number}</div>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", status.cls)}>{status.label}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-2 text-[11px]">
        <div>
          <div className="text-muted-foreground">Valor</div>
          <div className="font-semibold">{new Intl.NumberFormat("pt-PT").format(c.amount_kz)} Kz</div>
        </div>
        <div>
          <div className="text-muted-foreground">Prazo</div>
          <div className="font-semibold">{c.deadline ? new Date(c.deadline).toLocaleDateString("pt-PT") : "—"}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {canSign && (
          <Button size="sm" onClick={sign} disabled={busy} className="h-7 text-xs">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />} Assinar
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="outline" onClick={reject} disabled={busy} className="h-7 text-xs">
            <X className="h-3 w-3" /> Rejeitar
          </Button>
        )}
        {canConclude && (
          <Button size="sm" variant="outline" onClick={conclude} disabled={busy} className="h-7 text-xs">
            <Check className="h-3 w-3" /> Concluir
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={download} className="h-7 text-xs">
          <Download className="h-3 w-3" /> PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={share} className="h-7 text-xs">
          <Share2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { Loader2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { fmtKz, PAYMENT_INFO } from "@/lib/monetization";
import type { Database } from "@/integrations/supabase/types";

type PaymentKind = Database["public"]["Enums"]["payment_kind"];

export interface CheckoutPayload {
  kind: PaymentKind;
  amountKz: number;
  title: string;
  subtitle?: string;
  metadata?: Record<string, string | number>;
  /** Optional callback after payment row is created (e.g. insert post_boost row) */
  onCreated?: (paymentId: string) => Promise<void> | void;
}

interface Props {
  payload: CheckoutPayload | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CheckoutDialog({ payload, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [method, setMethod] = useState<"multicaixa_express" | "transferencia_iban">(
    "multicaixa_express"
  );
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!payload) return null;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const submit = async () => {
    if (!user) return;
    if (reference.trim().length < 4) {
      toast.error("Indica a referência ou últimos dígitos do comprovativo");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          kind: payload.kind,
          amount_kz: payload.amountKz,
          method,
          status: "pendente",
          reference: reference.trim(),
          metadata: payload.metadata ?? {},
        })
        .select("id")
        .single();
      if (error) throw error;
      if (payload.onCreated && data) await payload.onCreated(data.id);
      toast.success("Pagamento enviado para confirmação", {
        description: "Vamos validar em até 30 minutos.",
      });
      onSuccess?.();
      onClose();
      setReference("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registar pagamento");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{payload.title}</h2>
            {payload.subtitle && (
              <p className="text-xs text-muted-foreground">{payload.subtitle}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mb-4 rounded-2xl p-4 text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <p className="text-xs opacity-80">Total a pagar</p>
          <p className="text-3xl font-extrabold">{fmtKz(payload.amountKz)}</p>
        </div>

        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Método
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MethodBtn
              active={method === "multicaixa_express"}
              onClick={() => setMethod("multicaixa_express")}
              label="Multicaixa Express"
              sub="Pagamento por telefone"
            />
            <MethodBtn
              active={method === "transferencia_iban"}
              onClick={() => setMethod("transferencia_iban")}
              label="Transferência"
              sub="IBAN bancário"
            />
          </div>
        </div>

        {method === "multicaixa_express" ? (
          <div className="mb-4 space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-xs text-muted-foreground">Envia para o número:</p>
            <CopyRow value={PAYMENT_INFO.multicaixaPhone} copied={copied === "phone"} onCopy={() => copy(PAYMENT_INFO.multicaixaPhone, "phone")} />
            <p className="text-xs text-muted-foreground pt-1">Beneficiário: {PAYMENT_INFO.holder}</p>
          </div>
        ) : (
          <div className="mb-4 space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-xs text-muted-foreground">IBAN ({PAYMENT_INFO.bank}):</p>
            <CopyRow value={PAYMENT_INFO.iban} copied={copied === "iban"} onCopy={() => copy(PAYMENT_INFO.iban, "iban")} />
            <p className="text-xs text-muted-foreground pt-1">Titular: {PAYMENT_INFO.holder}</p>
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Referência ou últimos 4 dígitos do comprovativo
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="ex: 1234"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>

        <button
          onClick={submit}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirmar pagamento
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          A tua compra é ativada após validação manual (até 30 min).
        </p>
      </div>
    </div>
  );
}

function MethodBtn({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </button>
  );
}

function CopyRow({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm">
      <span className="truncate">{value}</span>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md p-1 hover:bg-accent"
        aria-label="Copiar"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

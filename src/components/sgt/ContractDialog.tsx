import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  otherUserId: string;
  onCreated?: (contractId: string) => void;
}

/**
 * Dialog used by the provider (current user) to create a new
 * service contract inside a chat. The other party is treated as the client.
 */
export function ContractDialog({ open, onOpenChange, conversationId, otherUserId, onCreated }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    provider_name: "",
    provider_doc: "",
    provider_phone: "",
    provider_iban: "",
    provider_mcx: "",
    client_name: "",
    client_doc: "",
    client_phone: "",
    service_title: "",
    service_description: "",
    amount_kz: "",
    deadline: "",
    conditions: "Pagamento na conclusão do serviço. Garantia de 30 dias sobre defeitos.",
  });

  // Pre-fill from profiles
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: me }, { data: other }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name, phone").eq("id", otherUserId).maybeSingle(),
      ]);
      setForm((f) => ({
        ...f,
        provider_name: f.provider_name || me?.full_name || "",
        provider_phone: f.provider_phone || me?.phone || "",
        client_name: f.client_name || other?.full_name || "",
        client_phone: f.client_phone || other?.phone || "",
      }));
    })();
  }, [open, user, otherUserId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!user) return;
    if (!form.service_title.trim()) return toast.error("Indica o serviço");
    if (!form.amount_kz || Number(form.amount_kz) <= 0) return toast.error("Indica o valor");
    setBusy(true);
    const { data, error } = await supabase
      .from("service_contracts")
      .insert({
        conversation_id: conversationId,
        provider_id: user.id,
        client_id: otherUserId,
        provider_name: form.provider_name,
        provider_doc: form.provider_doc,
        provider_phone: form.provider_phone,
        provider_iban: form.provider_iban,
        provider_mcx: form.provider_mcx,
        client_name: form.client_name,
        client_doc: form.client_doc,
        client_phone: form.client_phone,
        service_title: form.service_title,
        service_description: form.service_description,
        amount_kz: Number(form.amount_kz),
        deadline: form.deadline || null,
        conditions: form.conditions,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      return toast.error(error?.message || "Erro ao criar contrato");
    }
    // Post a message linking the contract
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `📄 Novo contrato de prestação de serviço criado: ${form.service_title}`,
      contract_id: data.id,
    });
    setBusy(false);
    toast.success("Contrato criado");
    onOpenChange(false);
    onCreated?.(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Criar Contrato
          </DialogTitle>
          <DialogDescription>
            Documento profissional partilhado com o cliente. Pode ser assinado e descarregado em PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Prestador</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nome completo" value={form.provider_name} onChange={set("provider_name")} />
              <Field label="NIF / BI" value={form.provider_doc} onChange={set("provider_doc")} />
              <Field label="Telefone" value={form.provider_phone} onChange={set("provider_phone")} />
              <Field label="IBAN" value={form.provider_iban} onChange={set("provider_iban")} placeholder="AO06..." />
              <Field
                label="Multicaixa Express"
                value={form.provider_mcx}
                onChange={set("provider_mcx")}
                placeholder="9XX XXX XXX"
                className="col-span-2"
              />
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Cliente</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nome completo" value={form.client_name} onChange={set("client_name")} />
              <Field label="NIF / BI" value={form.client_doc} onChange={set("client_doc")} />
              <Field label="Telefone" value={form.client_phone} onChange={set("client_phone")} className="col-span-2" />
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Serviço</h4>
            <Field label="Título do serviço" value={form.service_title} onChange={set("service_title")} />
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.service_description} onChange={set("service_description")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Valor (Kz)" type="number" value={form.amount_kz} onChange={set("amount_kz")} />
              <Field label="Prazo" type="date" value={form.deadline} onChange={set("deadline")} />
            </div>
            <div>
              <Label className="text-xs">Condições</Label>
              <Textarea value={form.conditions} onChange={set("conditions")} rows={3} />
            </div>
          </section>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input {...props} />
    </div>
  );
}

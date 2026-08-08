import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Download, Loader2, Plus, Users, Wallet, LayoutDashboard,
  TrendingUp, CheckCircle2, Clock, X, Trash2, CreditCard,
} from "lucide-react";
import { downloadBillingInvoicePdf } from "@/lib/billing-pdf";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/faturas")({
  component: () => (
    <RequireAuth>
      <Billing />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Faturação — BB Serviços Express" }] }),
});

type Client = Database["public"]["Tables"]["billing_clients"]["Row"];
type Invoice = Database["public"]["Tables"]["billing_invoices"]["Row"];
type Payment = Database["public"]["Tables"]["billing_payments"]["Row"];

const fmtKz = (n: number) => new Intl.NumberFormat("pt-PT").format(n) + " Kz";
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-PT");

type Tab = "dashboard" | "invoices" | "clients" | "payments";

function Billing() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInv, setShowInv] = useState(false);
  const [showCli, setShowCli] = useState(false);
  const [payFor, setPayFor] = useState<Invoice | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    const [c, i, p] = await Promise.all([
      supabase.from("billing_clients").select("*").order("created_at", { ascending: false }),
      supabase.from("billing_invoices").select("*").order("issued_at", { ascending: false }),
      supabase.from("billing_payments").select("*").order("paid_at", { ascending: false }),
    ]);
    setClients(c.data ?? []);
    setInvoices(i.data ?? []);
    setPayments(p.data ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user]);

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === "paga");
    const pending = invoices.filter(i => i.status === "emitida" || i.status === "rascunho");
    const overdue = pending.filter(i => i.due_at && new Date(i.due_at) < new Date());
    return {
      revenue: payments.reduce((s, p) => s + p.amount_kz, 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((s, i) => s + i.total_kz, 0),
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, i) => s + (i.total_kz - i.paid_kz), 0),
      overdueCount: overdue.length,
      total: invoices.length,
    };
  }, [invoices, payments]);

  return (
    <MobileShell>
      <div className="border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" /> Faturação
          </h1>
          {tab === "invoices" && (
            <button onClick={() => setShowInv(true)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Nova
            </button>
          )}
          {tab === "clients" && (
            <button onClick={() => setShowCli(true)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Cliente
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto no-scrollbar">
          {([
            ["dashboard", LayoutDashboard, "Resumo"],
            ["invoices", FileText, "Faturas"],
            ["clients", Users, "Clientes"],
            ["payments", CreditCard, "Pagamentos"],
          ] as const).map(([k, Icon, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="px-3 py-4">
          {tab === "dashboard" && <Dashboard stats={stats} invoices={invoices} />}
          {tab === "invoices" && <InvoicesList invoices={invoices} clients={clients} onPay={setPayFor} onReload={reload} />}
          {tab === "clients" && <ClientsList clients={clients} onReload={reload} />}
          {tab === "payments" && <PaymentsList payments={payments} invoices={invoices} />}
        </div>
      )}

      {showInv && <InvoiceForm clients={clients} onClose={() => setShowInv(false)} onSaved={() => { setShowInv(false); reload(); }} />}
      {showCli && <ClientForm onClose={() => setShowCli(false)} onSaved={() => { setShowCli(false); reload(); }} />}
      {payFor && <PaymentForm invoice={payFor} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); reload(); }} />}
    </MobileShell>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ stats, invoices }: { stats: any; invoices: Invoice[] }) {
  const recent = invoices.slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-amber-400 p-4 text-black shadow-elegant">
        <div className="text-xs font-medium opacity-80">Receita total</div>
        <div className="mt-1 text-3xl font-bold">{fmtKz(stats.revenue)}</div>
        <div className="mt-2 flex items-center gap-1 text-xs opacity-90">
          <TrendingUp className="h-3.5 w-3.5" /> {stats.total} faturas emitidas
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CheckCircle2} label="Pagas" value={stats.paidCount} sub={fmtKz(stats.paidTotal)} tone="ok" />
        <StatCard icon={Clock} label="Pendentes" value={stats.pendingCount} sub={fmtKz(stats.pendingTotal)} tone="warn" />
      </div>

      {stats.overdueCount > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          ⚠️ {stats.overdueCount} fatura(s) vencida(s)
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold">Últimas faturas</h3>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sem faturas ainda.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map(inv => (
              <li key={inv.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{inv.number}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(inv.issued_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">{fmtKz(inv.total_kz)}</div>
                  <StatusBadge status={inv.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: any) {
  const toneCls = tone === "ok" ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-elegant">
      <div className={`flex items-center gap-1.5 text-xs ${toneCls}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paga: "bg-emerald-500/15 text-emerald-300",
    emitida: "bg-amber-500/15 text-amber-300",
    rascunho: "bg-muted text-muted-foreground",
    cancelada: "bg-red-500/15 text-red-300",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

/* ---------------- Invoices ---------------- */

function InvoicesList({ invoices, clients, onPay, onReload }: { invoices: Invoice[]; clients: Client[]; onPay: (i: Invoice) => void; onReload: () => void }) {
  const { user } = useAuth();
  if (invoices.length === 0) {
    return <p className="px-6 py-12 text-center text-sm text-muted-foreground">Sem faturas. Clica em "Nova" para começar.</p>;
  }

  const download = async (inv: Invoice) => {
    try {
      const client = clients.find(c => c.id === inv.client_id);
      const { data: prof } = user ? await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle() : { data: null };
      downloadBillingInvoicePdf({
        ...inv,
        client_name: client?.name, client_email: client?.email, client_phone: client?.phone,
        client_tax_id: client?.tax_id, client_address: client?.address,
        provider_name: prof?.full_name, provider_phone: prof?.phone, provider_email: user?.email,
      });
    } catch { toast.error("Erro ao gerar PDF"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminar esta fatura?")) return;
    await supabase.from("billing_invoices").delete().eq("id", id);
    toast.success("Fatura eliminada"); onReload();
  };

  return (
    <ul className="space-y-2">
      {invoices.map(inv => {
        const client = clients.find(c => c.id === inv.client_id);
        const due = inv.total_kz - inv.paid_kz;
        return (
          <li key={inv.id} className="rounded-2xl border border-border bg-card p-3 shadow-elegant">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{inv.number}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{client?.name ?? "Sem cliente"} • {fmtDate(inv.issued_at)}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{inv.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{fmtKz(inv.total_kz)}</div>
                {due > 0 && inv.status !== "cancelada" && <div className="text-[10px] text-amber-400">Em dívida: {fmtKz(due)}</div>}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => download(inv)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              {inv.status !== "paga" && inv.status !== "cancelada" && (
                <button onClick={() => onPay(inv)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> Pagamento
                </button>
              )}
              <button onClick={() => remove(inv.id)} className="rounded-full bg-red-500/10 p-1.5 text-red-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Clients ---------------- */

function ClientsList({ clients, onReload }: { clients: Client[]; onReload: () => void }) {
  const remove = async (id: string) => {
    if (!confirm("Eliminar este cliente?")) return;
    await supabase.from("billing_clients").delete().eq("id", id);
    toast.success("Cliente eliminado"); onReload();
  };
  if (clients.length === 0) return <p className="px-6 py-12 text-center text-sm text-muted-foreground">Sem clientes ainda.</p>;
  return (
    <ul className="space-y-2">
      {clients.map(c => (
        <li key={c.id} className="flex items-start justify-between rounded-2xl border border-border bg-card p-3 shadow-elegant">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{c.name}</div>
            {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
            {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
            {c.tax_id && <div className="text-[11px] text-muted-foreground">NIF: {c.tax_id}</div>}
          </div>
          <button onClick={() => remove(c.id)} className="rounded-full bg-red-500/10 p-1.5 text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Payments ---------------- */

function PaymentsList({ payments, invoices }: { payments: Payment[]; invoices: Invoice[] }) {
  if (payments.length === 0) return <p className="px-6 py-12 text-center text-sm text-muted-foreground">Sem pagamentos registados.</p>;
  return (
    <ul className="space-y-2">
      {payments.map(p => {
        const inv = invoices.find(i => i.id === p.invoice_id);
        return (
          <li key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-elegant">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{inv?.number ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground">
                {fmtDate(p.paid_at)} {p.method ? `• ${p.method}` : ""} {p.reference ? `• ${p.reference}` : ""}
              </div>
            </div>
            <div className="font-bold text-emerald-400">{fmtKz(p.amount_kz)}</div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Forms (modals) ---------------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 shadow-elegant sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary/60"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function ClientForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", email: "", phone: "", tax_id: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!user || !f.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("billing_clients").insert({ user_id: user.id, ...f });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente adicionado"); onSaved();
  };
  return (
    <Modal title="Novo cliente" onClose={onClose}>
      <div className="space-y-2">
        <input className={inputCls} placeholder="Nome *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className={inputCls} placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className={inputCls} placeholder="Telefone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <input className={inputCls} placeholder="NIF" value={f.tax_id} onChange={e => setF({ ...f, tax_id: e.target.value })} />
        <input className={inputCls} placeholder="Morada" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        <textarea className={inputCls} rows={2} placeholder="Notas" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
        <button disabled={saving} onClick={save} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "A guardar..." : "Guardar cliente"}
        </button>
      </div>
    </Modal>
  );
}

function InvoiceForm({ clients, onClose, onSaved }: { clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({
    client_id: clients[0]?.id ?? "",
    description: "",
    amount_kz: 0, tax_kz: 0, discount_kz: 0,
    due_at: "", notes: "", status: "emitida",
  });
  const total = Math.max(0, (f.amount_kz || 0) + (f.tax_kz || 0) - (f.discount_kz || 0));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!user) return;
    if (!f.description.trim()) { toast.error("Descrição obrigatória"); return; }
    if (f.amount_kz <= 0) { toast.error("Valor inválido"); return; }
    setSaving(true);
    const { data: numData } = await supabase.rpc("next_billing_invoice_number", { _user_id: user.id });
    const number = numData ?? `FT-${Date.now()}`;
    const { error } = await supabase.from("billing_invoices").insert({
      user_id: user.id,
      client_id: f.client_id || null,
      number,
      description: f.description,
      amount_kz: f.amount_kz,
      tax_kz: f.tax_kz,
      discount_kz: f.discount_kz,
      total_kz: total,
      status: f.status,
      due_at: f.due_at ? new Date(f.due_at).toISOString() : null,
      notes: f.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Fatura ${number} emitida`); onSaved();
  };
  return (
    <Modal title="Nova fatura" onClose={onClose}>
      <div className="space-y-2">
        <select className={inputCls} value={f.client_id} onChange={e => setF({ ...f, client_id: e.target.value })}>
          <option value="">— Sem cliente —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <textarea className={inputCls} rows={2} placeholder="Descrição do serviço *" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <input className={inputCls} type="number" placeholder="Valor (Kz)" value={f.amount_kz || ""} onChange={e => setF({ ...f, amount_kz: +e.target.value })} />
          <input className={inputCls} type="number" placeholder="IVA" value={f.tax_kz || ""} onChange={e => setF({ ...f, tax_kz: +e.target.value })} />
          <input className={inputCls} type="number" placeholder="Desconto" value={f.discount_kz || ""} onChange={e => setF({ ...f, discount_kz: +e.target.value })} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold text-primary">{fmtKz(total)}</span>
        </div>
        <input className={inputCls} type="date" value={f.due_at} onChange={e => setF({ ...f, due_at: e.target.value })} placeholder="Vencimento" />
        <select className={inputCls} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>
          <option value="emitida">Emitida</option>
          <option value="rascunho">Rascunho</option>
          <option value="paga">Paga</option>
        </select>
        <textarea className={inputCls} rows={2} placeholder="Notas" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
        <button disabled={saving} onClick={save} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "A emitir..." : "Emitir fatura"}
        </button>
      </div>
    </Modal>
  );
}

function PaymentForm({ invoice, onClose, onSaved }: { invoice: Invoice; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const due = invoice.total_kz - invoice.paid_kz;
  const [f, setF] = useState({ amount_kz: due, method: "Transferência", reference: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!user || f.amount_kz <= 0) { toast.error("Valor inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("billing_payments").insert({
      user_id: user.id, invoice_id: invoice.id,
      amount_kz: f.amount_kz, method: f.method, reference: f.reference || null,
    });
    if (!error) {
      const newPaid = invoice.paid_kz + f.amount_kz;
      const status = newPaid >= invoice.total_kz ? "paga" : invoice.status;
      await supabase.from("billing_invoices").update({ paid_kz: newPaid, status }).eq("id", invoice.id);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pagamento registado"); onSaved();
  };
  return (
    <Modal title={`Pagamento • ${invoice.number}`} onClose={onClose}>
      <div className="space-y-2">
        <div className="rounded-xl bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Em dívida: <span className="font-semibold text-primary">{fmtKz(due)}</span>
        </div>
        <input className={inputCls} type="number" placeholder="Valor (Kz)" value={f.amount_kz || ""} onChange={e => setF({ ...f, amount_kz: +e.target.value })} />
        <select className={inputCls} value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>
          <option>Transferência</option>
          <option>Multicaixa</option>
          <option>Numerário</option>
          <option>Cartão</option>
          <option>Outro</option>
        </select>
        <input className={inputCls} placeholder="Referência (opcional)" value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })} />
        <button disabled={saving} onClick={save} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "A registar..." : "Registar pagamento"}
        </button>
      </div>
    </Modal>
  );
}

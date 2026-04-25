import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/faturas")({
  component: () => (
    <RequireAuth>
      <Invoices />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Faturas — Núpublico" }] }),
});

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

const fmtKz = (n: number) => new Intl.NumberFormat("pt-PT").format(n) + " Kz";

function Invoices() {
  const { user } = useAuth();
  const [items, setItems] = useState<Invoice[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("invoices")
      .select("*")
      .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("issued_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  const download = async (inv: Invoice) => {
    try {
      const ids = [inv.client_id, inv.provider_id];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const client = profs?.find((p) => p.id === inv.client_id);
      const provider = profs?.find((p) => p.id === inv.provider_id);
      downloadInvoicePdf({
        ...inv,
        client_name: client?.full_name,
        provider_name: provider?.full_name,
        provider_phone: provider?.phone,
      });
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <MobileShell>
      <div className="border-b border-border px-4 py-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" /> Faturas
        </h1>
      </div>

      {items === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">Sem faturas ainda.</p>
      ) : (
        <ul className="space-y-2 px-3 py-3">
          {items.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{inv.service_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Nº {inv.number} • {new Date(inv.issued_at).toLocaleDateString("pt-PT")}
                </div>
                <div className="mt-1 text-base font-bold text-primary">{fmtKz(inv.total_kz)}</div>
              </div>
              <button
                onClick={() => download(inv)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}

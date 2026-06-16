import { jsPDF } from "jspdf";

export interface BillingInvoicePdf {
  number: string;
  description: string;
  amount_kz: number;
  tax_kz: number;
  discount_kz: number;
  total_kz: number;
  paid_kz: number;
  status: string;
  issued_at: string;
  due_at?: string | null;
  notes?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_tax_id?: string | null;
  client_address?: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
}

const fmtKz = (n: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " Kz";

export function downloadBillingInvoicePdf(inv: BillingInvoicePdf) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header band — Nupublico yellow
  doc.setFillColor(249, 197, 26);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Nupublico", 40, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Faturacao profissional", 40, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`FATURA ${inv.number}`, W - 40, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Emitida: ${new Date(inv.issued_at).toLocaleDateString("pt-PT")}`,
    W - 40,
    68,
    { align: "right" },
  );
  if (inv.due_at) {
    doc.text(
      `Vencimento: ${new Date(inv.due_at).toLocaleDateString("pt-PT")}`,
      W - 40,
      82,
      { align: "right" },
    );
  }

  // Parties
  let y = 140;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DE", 40, y);
  doc.text("PARA", W / 2 + 20, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(inv.provider_name ?? "-", 40, y);
  doc.text(inv.client_name ?? "-", W / 2 + 20, y);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  let yL = y + 14, yR = y + 14;
  if (inv.provider_phone) { doc.text(inv.provider_phone, 40, yL); yL += 12; }
  if (inv.provider_email) { doc.text(inv.provider_email, 40, yL); yL += 12; }
  if (inv.client_phone) { doc.text(inv.client_phone, W / 2 + 20, yR); yR += 12; }
  if (inv.client_email) { doc.text(inv.client_email, W / 2 + 20, yR); yR += 12; }
  if (inv.client_tax_id) { doc.text(`NIF: ${inv.client_tax_id}`, W / 2 + 20, yR); yR += 12; }
  if (inv.client_address) { doc.text(inv.client_address, W / 2 + 20, yR); yR += 12; }

  y = Math.max(yL, yR) + 16;

  // Description
  doc.setDrawColor(230, 230, 230);
  doc.line(40, y, W - 40, y);
  y += 24;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Descricao", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(inv.description, W - 80);
  doc.text(lines, 40, y);
  y += lines.length * 14 + 18;

  // Totals
  doc.line(40, y, W - 40, y);
  const right = W - 40;
  const row = (label: string, value: string, bold = false) => {
    y += 22;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 13 : 11);
    doc.text(label, 40, y);
    doc.text(value, right, y, { align: "right" });
  };
  row("Subtotal", fmtKz(inv.amount_kz));
  if (inv.discount_kz > 0) row("Desconto", "- " + fmtKz(inv.discount_kz));
  if (inv.tax_kz > 0) row("IVA", fmtKz(inv.tax_kz));
  row("TOTAL", fmtKz(inv.total_kz), true);
  if (inv.paid_kz > 0) row("Pago", fmtKz(inv.paid_kz));
  const due = inv.total_kz - inv.paid_kz;
  if (due > 0) row("Em divida", fmtKz(due), true);

  // Status badge
  y += 30;
  const statusLabel = inv.status.toUpperCase();
  doc.setFillColor(
    inv.status === "paga" ? 34 : inv.status === "cancelada" ? 200 : 249,
    inv.status === "paga" ? 160 : inv.status === "cancelada" ? 80 : 197,
    inv.status === "paga" ? 80 : inv.status === "cancelada" ? 80 : 26,
  );
  doc.roundedRect(40, y - 14, 90, 22, 11, 11, "F");
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(statusLabel, 85, y, { align: "center" });

  if (inv.notes) {
    y += 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Notas", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const nl = doc.splitTextToSize(inv.notes, W - 80);
    doc.text(nl, 40, y);
  }

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "Documento gerado pelo Nupublico. Obrigado pela sua preferencia.",
    W / 2,
    H - 30,
    { align: "center" },
  );

  doc.save(`fatura-${inv.number}.pdf`);
}

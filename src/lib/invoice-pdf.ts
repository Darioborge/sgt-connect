import { jsPDF } from "jspdf";

export interface InvoiceForPdf {
  number: string;
  service_name: string;
  amount_kz: number;
  discount_kz: number;
  total_kz: number;
  issued_at: string;
  client_name?: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
}

const fmtKz = (n: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " Kz";

export function downloadInvoicePdf(invoice: InvoiceForPdf) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header — green band
  doc.setFillColor(34, 139, 64);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("BB Serviços Express", 40, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Cria conteudo publicitario com IA em Angola", 40, 68);

  doc.setFontSize(12);
  doc.text(`Fatura N. ${invoice.number}`, W - 40, 50, { align: "right" });
  doc.text(new Date(invoice.issued_at).toLocaleString("pt-PT"), W - 40, 68, { align: "right" });

  // Body
  doc.setTextColor(20, 20, 20);
  let y = 130;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Prestador", 40, y);
  doc.text("Cliente", W / 2 + 20, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.provider_name ?? "-", 40, y);
  doc.text(invoice.client_name ?? "-", W / 2 + 20, y);
  if (invoice.provider_phone) {
    y += 14;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.provider_phone, 40, y);
  }

  // Service block
  y += 50;
  doc.setDrawColor(220, 220, 220);
  doc.line(40, y, W - 40, y);
  y += 28;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Descricao do servico", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(invoice.service_name, 40, y);

  // Totals
  y += 50;
  doc.line(40, y, W - 40, y);
  const right = W - 40;
  const drawRow = (label: string, value: string, bold = false) => {
    y += 22;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 13 : 11);
    doc.text(label, 40, y);
    doc.text(value, right, y, { align: "right" });
  };
  drawRow("Subtotal", fmtKz(invoice.amount_kz));
  if (invoice.discount_kz > 0) drawRow("Desconto", "- " + fmtKz(invoice.discount_kz));
  drawRow("Total", fmtKz(invoice.total_kz), true);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "Documento gerado pelo BB Serviços Express. Obrigado pela sua preferencia.",
    W / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" },
  );

  doc.save(`fatura-${invoice.number}.pdf`);
}

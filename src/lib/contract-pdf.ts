import { jsPDF } from "jspdf";

export interface ContractForPdf {
  number: string;
  created_at: string;
  status: string;
  // Prestador
  provider_name?: string | null;
  provider_doc?: string | null;
  provider_phone?: string | null;
  provider_iban?: string | null;
  provider_mcx?: string | null;
  provider_logo_url?: string | null;
  signed_provider_at?: string | null;
  // Cliente
  client_name?: string | null;
  client_doc?: string | null;
  client_phone?: string | null;
  signed_client_at?: string | null;
  // Serviço
  service_title: string;
  service_description?: string | null;
  amount_kz: number;
  deadline?: string | null;
  conditions?: string | null;
}

const fmtKz = (n: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " Kz";

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-PT") : "—";

export function downloadContractPdf(c: ContractForPdf) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 110, "F");
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 110, W, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("CONTRATO DE PRESTACAO DE SERVICO", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Documento gerado pela plataforma Nupublico", 40, 70);
  doc.text("Republica de Angola", 40, 86);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`N. ${c.number}`, W - 40, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Data: ${new Date(c.created_at).toLocaleDateString("pt-PT")}`, W - 40, 66, { align: "right" });
  doc.text(`Estado: ${c.status.toUpperCase()}`, W - 40, 80, { align: "right" });

  // Body
  let y = 150;
  doc.setTextColor(15, 23, 42);

  const sectionTitle = (label: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y - 14, W - 80, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(label, 50, y);
    y += 22;
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 50, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value || "—", W - 220);
    doc.text(lines, 200, y);
    y += Math.max(18, lines.length * 14);
  };

  sectionTitle("PRESTADOR DE SERVICO (PRIMEIRO OUTORGANTE)");
  row("Nome completo", c.provider_name || "—");
  row("NIF / BI", c.provider_doc || "—");
  row("Telefone", c.provider_phone || "—");
  y += 6;

  sectionTitle("CLIENTE (SEGUNDO OUTORGANTE)");
  row("Nome completo", c.client_name || "—");
  row("NIF / BI", c.client_doc || "—");
  row("Telefone", c.client_phone || "—");
  y += 6;

  sectionTitle("OBJECTO DO CONTRATO");
  row("Servico", c.service_title);
  if (c.service_description) row("Descricao", c.service_description);
  row("Valor acordado", fmtKz(c.amount_kz));
  row("Prazo de entrega", fmtDate(c.deadline));
  y += 6;

  if (c.conditions) {
    sectionTitle("CONDICOES DO ACORDO");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(c.conditions, W - 100);
    doc.text(lines, 50, y);
    y += lines.length * 13 + 8;
  }

  if (c.provider_iban || c.provider_mcx) {
    sectionTitle("COORDENADAS BANCARIAS");
    if (c.provider_iban) row("IBAN", c.provider_iban);
    if (c.provider_mcx) row("Multicaixa Express", c.provider_mcx);
    y += 6;
  }

  // Signatures
  if (y > H - 180) {
    doc.addPage();
    y = 60;
  }
  y = Math.max(y, H - 200);

  doc.setDrawColor(203, 213, 225);
  doc.line(60, y + 40, W / 2 - 20, y + 40);
  doc.line(W / 2 + 20, y + 40, W - 60, y + 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("PRESTADOR", 60, y + 56);
  doc.text("CLIENTE", W / 2 + 20, y + 56);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    c.signed_provider_at ? `Assinado digitalmente em ${fmtDate(c.signed_provider_at)}` : "Pendente",
    60,
    y + 70,
  );
  doc.text(
    c.signed_client_at ? `Assinado digitalmente em ${fmtDate(c.signed_client_at)}` : "Pendente",
    W / 2 + 20,
    y + 70,
  );

  // Digital stamp
  if (c.signed_provider_at && c.signed_client_at) {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(2);
    doc.circle(W - 90, y + 20, 32);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ASSINADO", W - 90, y + 18, { align: "center" });
    doc.text("NUPUBLICO", W - 90, y + 30, { align: "center" });
    doc.setLineWidth(1);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento ${c.number} gerado electronicamente pela plataforma Nupublico. Validade legal mediante aceitacao das partes.`,
    W / 2,
    H - 30,
    { align: "center" },
  );

  doc.save(`contrato-${c.number}.pdf`);
}

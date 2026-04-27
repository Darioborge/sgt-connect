// Núpublico — catálogo de monetização (Kz)

export const FREE_DAILY_POSTS = 3;

export interface PremiumPlan {
  id: "mensal" | "trimestral";
  label: string;
  months: number;
  priceKz: number;
  perMonthKz: number;
  badge?: string;
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: "mensal",
    label: "Mensal",
    months: 1,
    priceKz: 3500,
    perMonthKz: 3500,
  },
  {
    id: "trimestral",
    label: "3 meses",
    months: 3,
    priceKz: 9000,
    perMonthKz: 3000,
    badge: "Poupa 1.500 Kz",
  },
];

export const PREMIUM_BENEFITS = [
  "Posts ilimitados",
  "Templates avançados",
  "Exportação em HD",
  "Selo azul no perfil",
  "Modos Viral, Premium, Venda Rápida e Story",
  "Sem marca de água",
];

export interface BoostOption {
  id: "basico" | "medio" | "alto";
  label: string;
  priceKz: number;
  reach: string;
  desc: string;
}

export const BOOST_OPTIONS: BoostOption[] = [
  { id: "basico", label: "Alcance básico", priceKz: 500, reach: "~500 visualizações", desc: "Aparece no feed por 2 dias" },
  { id: "medio", label: "Alcance médio", priceKz: 1000, reach: "~1.500 visualizações", desc: "Destaque por 5 dias" },
  { id: "alto", label: "Alto alcance", priceKz: 2000, reach: "~5.000 visualizações", desc: "Topo do feed por 7 dias" },
];

export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  priceKz: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c50", label: "50 gerações", credits: 50, priceKz: 1000 },
  { id: "c100", label: "100 gerações", credits: 100, priceKz: 1500 },
];

export interface TemplatePack {
  id: string;
  label: string;
  desc: string;
  priceKz: number;
  count: number;
}

export const TEMPLATE_PACKS: TemplatePack[] = [
  { id: "basico", label: "Pack Básico", desc: "10 templates essenciais para serviços", priceKz: 1000, count: 10 },
  { id: "avancado", label: "Pack Avançado", desc: "25 templates pro com modos viral & premium", priceKz: 2000, count: 25 },
];

export const PAYMENT_INFO = {
  multicaixaPhone: "+244 923 000 000",
  iban: "AO06 0040 0000 1234 5678 9012 3",
  bank: "BAI",
  holder: "Núpublico, Lda.",
};

export const fmtKz = (n: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " Kz";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

import t1 from "@/assets/inspirations/template-1.jpg";
import t2 from "@/assets/inspirations/template-2.jpg";
import t3 from "@/assets/inspirations/template-3.jpg";
import t4 from "@/assets/inspirations/template-4.jpg";
import t5 from "@/assets/inspirations/template-5.jpg";
import t6 from "@/assets/inspirations/template-6.jpg";
import t7 from "@/assets/inspirations/template-7.jpg";

export const Route = createFileRoute("/inspiracao")({
  component: () => (
    <RequireAuth>
      <Inspiracao />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Inspiração — Núpublico" }] }),
});

type Category = "todos" | "servicos" | "negocios" | "beleza" | "produtos" | "promocoes";

interface Template {
  id: string;
  image: string;
  title: string;
  category: Exclude<Category, "todos">;
  mode: "viral" | "premium" | "venda_rapida" | "story";
  format: "square" | "vertical";
  hint: string;
}

const TEMPLATES: Template[] = [
  {
    id: "tpl-1",
    image: t1,
    title: "Academia & Cursos",
    category: "servicos",
    mode: "premium",
    format: "vertical",
    hint: "Curso ou formação profissional com destaque para o resultado",
  },
  {
    id: "tpl-2",
    image: t2,
    title: "Testemunhos & Feedback",
    category: "negocios",
    mode: "viral",
    format: "square",
    hint: "Feedback de cliente com prova social que aquece o coração",
  },
  {
    id: "tpl-3",
    image: t3,
    title: "Anúncio de Colaboração",
    category: "negocios",
    mode: "premium",
    format: "square",
    hint: "Anúncio profissional aberto a colaborações e parcerias",
  },
  {
    id: "tpl-4",
    image: t4,
    title: "Portfólio Criativo",
    category: "servicos",
    mode: "premium",
    format: "square",
    hint: "Mostra de portfólio com fotos, vídeos, logos e branding",
  },
  {
    id: "tpl-5",
    image: t5,
    title: "Agricultura & Produtos Naturais",
    category: "produtos",
    mode: "venda_rapida",
    format: "square",
    hint: "Produtos frescos e naturais com foco em qualidade",
  },
  {
    id: "tpl-6",
    image: t6,
    title: "Promoção de Produto",
    category: "promocoes",
    mode: "venda_rapida",
    format: "square",
    hint: "Banner de promoção com preço destacado e desconto",
  },
  {
    id: "tpl-7",
    image: t7,
    title: "Beleza & Lifestyle",
    category: "beleza",
    mode: "viral",
    format: "vertical",
    hint: "Visual de beleza com tom moderno e aspiracional",
  },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "servicos", label: "Serviços" },
  { id: "negocios", label: "Negócios" },
  { id: "beleza", label: "Beleza" },
  { id: "produtos", label: "Produtos" },
  { id: "promocoes", label: "Promoções" },
];

function Inspiracao() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category>("todos");

  const filtered = cat === "todos" ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat);

  const pickTemplate = (tpl: Template) => {
    navigate({
      to: "/criar-post",
      search: {
        template: tpl.id,
        mode: tpl.mode,
        format: tpl.format,
        hint: tpl.hint,
      } as never,
    });
  };

  return (
    <MobileShell hideTopBar>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/perfil" })} className="rounded-full p-2 hover:bg-accent" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Inspiração Inteligente
          </div>
          <div className="text-[11px] text-muted-foreground">Escolhe um estilo e a IA cria o post por ti</div>
        </div>
      </header>

      {/* Categorias */}
      <div className="sticky top-[60px] z-20 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                cat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero card */}
      <div className="mx-4 mt-4 rounded-2xl p-4 text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold">Não cries do zero.</div>
            <p className="mt-0.5 text-xs opacity-90">
              Escolhe uma inspiração e o Núpublico gera automaticamente o teu post profissional — visual, legenda, CTA e hashtags.
            </p>
          </div>
        </div>
      </div>

      {/* Galeria */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 pb-8">
        {filtered.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => pickTemplate(tpl)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition active:scale-[0.98]"
          >
            <div className="aspect-[4/5] overflow-hidden">
              <img src={tpl.image} alt={tpl.title} className="h-full w-full object-cover transition group-hover:scale-105" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
              <div className="text-xs font-bold text-white">{tpl.title}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                <Sparkles className="h-2.5 w-2.5" /> Usar este estilo
              </div>
            </div>
          </button>
        ))}
      </div>
    </MobileShell>
  );
}

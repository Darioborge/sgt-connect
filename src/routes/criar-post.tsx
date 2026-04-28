import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { usePlan } from "@/hooks/usePlan";
import { FREE_DAILY_POSTS } from "@/lib/monetization";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Sparkles,
  Zap,
  Crown,
  Flame,
  Image as ImageIcon,
  Square,
  RectangleVertical,
  Copy,
  Download,
  Check,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostEditor } from "@/components/sgt/PostEditor";

interface CriarPostSearch {
  template?: string;
  mode?: "viral" | "premium" | "venda_rapida" | "story";
  format?: "square" | "vertical";
  hint?: string;
}

export const Route = createFileRoute("/criar-post")({
  component: () => (
    <RequireAuth>
      <CriarPost />
    </RequireAuth>
  ),
  validateSearch: (s: Record<string, unknown>): CriarPostSearch => ({
    template: typeof s.template === "string" ? s.template : undefined,
    mode: ["viral", "premium", "venda_rapida", "story"].includes(s.mode as string)
      ? (s.mode as CriarPostSearch["mode"])
      : undefined,
    format: ["square", "vertical"].includes(s.format as string)
      ? (s.format as CriarPostSearch["format"])
      : undefined,
    hint: typeof s.hint === "string" ? s.hint : undefined,
  }),
  head: () => ({ meta: [{ title: "Criar Post — Núpublico Smart Post Creator" }] }),
});

type Mode = "viral" | "premium" | "venda_rapida" | "story";
type Format = "square" | "vertical";

interface Analysis {
  service_type: string;
  audience: string;
  emotion: string;
  title: string;
  caption_short: string;
  caption_medium: string;
  caption_long: string;
  copy_direct: string;
  copy_emotional: string;
  cta: string;
  hashtags: string[];
  score: number;
}

const MODES: { id: Mode; label: string; icon: typeof Zap; desc: string }[] = [
  { id: "viral", label: "Viral", icon: Flame, desc: "Tom emocional, partilhável" },
  { id: "venda_rapida", label: "Venda rápida", icon: Zap, desc: "Urgência, ação imediata" },
  { id: "premium", label: "Premium", icon: Crown, desc: "Sofisticado, exclusivo" },
  { id: "story", label: "Story", icon: ImageIcon, desc: "Próximo, primeira pessoa" },
];

function CriarPost() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { isPremiumActive, credits, refresh: refreshPlan } = usePlan(user?.id);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "config" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState(search.hint ?? "");
  const [mode, setMode] = useState<Mode>(search.mode ?? "viral");
  const [format, setFormat] = useState<Format>(search.format ?? "square");
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [activeCaption, setActiveCaption] = useState<"short" | "medium" | "long">("medium");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Imagem muito grande (máx 8MB)");
    setFile(f);
    setStep("config");
  };

  const generate = async () => {
    if (!file || !user) return;

    // Pre-flight: créditos IA
    if (credits <= 0) {
      toast.error("Sem créditos de IA", {
        description: "Compra um pack para continuar a gerar posts.",
        action: { label: "Ver planos", onClick: () => navigate({ to: "/planos" }) },
      });
      return;
    }

    // Pre-flight: limite diário grátis
    if (!isPremiumActive) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("smart_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString());
      if ((count ?? 0) >= FREE_DAILY_POSTS) {
        toast.error(`Atingiste o limite de ${FREE_DAILY_POSTS} posts/dia`, {
          description: "Faz upgrade para Premium e cria sem limites.",
          action: { label: "Ver Premium", onClick: () => navigate({ to: "/planos" }) },
        });
        return;
      }
    }

    setBusy(true);
    try {
      setBusyText("A enviar imagem…");
      const url = await uploadToBucket("smart-posts", user.id, file);
      setSourceUrl(url);

      setBusyText("IA a analisar e a criar o post…");
      const { data, error } = await supabase.functions.invoke("smart-post-generator", {
        body: {
          imageUrl: url,
          mode,
          format,
          userHint: hint || undefined,
          brand: {
            name: profile?.full_name ?? undefined,
            username: profile?.username ?? undefined,
            verified: profile?.verified ?? false,
          },
        },
      });
      if (error) throw error;
      if (!data?.analysis || !data?.imageDataUrl) throw new Error("Resposta inválida da IA");

      // Debit 1 credit
      await supabase
        .from("ai_credits")
        .update({ balance: Math.max(credits - 1, 0) })
        .eq("user_id", user.id);
      await refreshPlan();

      setAnalysis(data.analysis);
      setGeneratedUrl(data.imageDataUrl);
      setStep("result");
    } catch (e: any) {
      const msg = e?.message ?? "Erro a gerar post";
      if (msg.includes("429")) toast.error("Limite atingido. Tenta daqui a pouco.");
      else if (msg.includes("402")) toast.error("Créditos esgotados. Adiciona créditos ao workspace.");
      else toast.error(msg);
    } finally {
      setBusy(false);
      setBusyText("");
    }
  };

  const savePost = async () => {
    if (!user || !analysis || !generatedUrl) return;
    setBusy(true);
    try {
      // upload generated image (data URL → file)
      const blob = await (await fetch(generatedUrl)).blob();
      const genFile = new File([blob], `post-${Date.now()}.png`, { type: "image/png" });
      const finalUrl = await uploadToBucket("smart-posts", user.id, genFile);

      const { error } = await supabase.from("smart_posts").insert({
        user_id: user.id,
        source_image_url: sourceUrl,
        generated_image_url: finalUrl,
        title: analysis.title,
        caption_short: analysis.caption_short,
        caption_medium: analysis.caption_medium,
        caption_long: analysis.caption_long,
        copy_direct: analysis.copy_direct,
        copy_emotional: analysis.copy_emotional,
        hashtags: analysis.hashtags,
        cta: analysis.cta,
        mode,
        format,
        audience: analysis.audience,
        emotion: analysis.emotion,
        service_type: analysis.service_type,
        score: analysis.score,
      });
      if (error) throw error;
      toast.success("Post guardado na tua Central de Conteúdo");
      navigate({ to: "/perfil" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a guardar");
    } finally {
      setBusy(false);
    }
  };

  const captionText = analysis
    ? activeCaption === "short"
      ? analysis.caption_short
      : activeCaption === "long"
        ? analysis.caption_long
        : analysis.caption_medium
    : "";

  const copyCaption = async () => {
    if (!analysis) return;
    const tags = analysis.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    await navigator.clipboard.writeText(`${captionText}\n\n${analysis.cta}\n\n${tags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copiado!");
  };

  const downloadImage = async () => {
    if (!generatedUrl) return;
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.download = `nupublico-${Date.now()}.png`;
    a.click();
  };

  return (
    <MobileShell hideTopBar>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => (step === "upload" ? navigate({ to: "/perfil" }) : setStep(step === "result" ? "config" : "upload"))} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Smart Post Creator
          </div>
          <div className="text-[11px] text-muted-foreground">Núpublico · {step === "upload" ? "1/3 imagem" : step === "config" ? "2/3 estilo" : "3/3 resultado"}</div>
        </div>
      </header>

      {step === "upload" && (
        <div className="px-4 py-6">
          {search.template && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold text-primary">Inspiração aplicada.</span>{" "}
                <span className="text-muted-foreground">Carrega a foto do teu produto/serviço — o estilo já está pré-configurado.</span>
              </span>
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-center"
          >
            <Camera className="h-10 w-10 text-primary" />
            <div className="text-base font-semibold">Carrega a tua imagem</div>
            <div className="px-6 text-xs text-muted-foreground">Foto do produto, serviço ou trabalho. A IA trata de tudo o resto.</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />

          <div className="mt-6 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">A IA vai gerar:</div>
            <ul className="space-y-1">
              <li>✨ Post visual profissional (com título e CTA)</li>
              <li>📝 3 versões de legenda (curta, média, longa)</li>
              <li>🎯 Copy de venda + copy emocional</li>
              <li># Hashtags otimizadas</li>
              <li>📊 Score de chance de conversão</li>
            </ul>
          </div>
        </div>
      )}

      {step === "config" && preview && (
        <div className="space-y-4 px-4 py-4">
          <img src={preview} alt="" className="aspect-square w-full rounded-2xl object-cover" />

          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Modo</div>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                      active ? "border-primary bg-primary/10" : "border-border bg-card",
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5 text-sm font-semibold", active && "text-primary")}>
                      <Icon className="h-4 w-4" /> {m.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Formato</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat("square")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium",
                  format === "square" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                )}
              >
                <Square className="h-4 w-4" /> Quadrado
              </button>
              <button
                onClick={() => setFormat("vertical")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium",
                  format === "vertical" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                )}
              >
                <RectangleVertical className="h-4 w-4" /> Vertical / Story
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">O que estás a promover? (opcional)</div>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={2}
              placeholder="Ex: bolos personalizados para festas em Luanda"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? busyText || "A gerar…" : "Gerar Post com Núpublico"}
          </button>
        </div>
      )}

      {step === "result" && analysis && generatedUrl && (
        <div className="space-y-4 px-4 py-4 pb-8">
          <div className="relative overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <img src={generatedUrl} alt={analysis.title} className="w-full" />
            {!isPremiumActive && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
                <div className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Núpublico · Free
                </div>
              </div>
            )}
          </div>
          {!isPremiumActive && (
            <Link
              to="/planos"
              className="block rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary"
            >
              ✨ Faz upgrade para Premium e remove a marca de água
            </Link>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Score de conversão</span>
              <span className="text-2xl font-bold text-primary">{analysis.score}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: `${analysis.score}%`, background: "var(--gradient-primary)" }} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div><span className="block text-foreground font-medium">Público</span>{analysis.audience}</div>
              <div><span className="block text-foreground font-medium">Emoção</span>{analysis.emotion}</div>
              <div><span className="block text-foreground font-medium">Tipo</span>{analysis.service_type}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Legenda</span>
              <div className="flex gap-1 rounded-lg bg-secondary p-0.5 text-[10px] font-semibold">
                {(["short", "medium", "long"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveCaption(s)}
                    className={cn("rounded-md px-2 py-1", activeCaption === s ? "bg-background text-primary" : "text-muted-foreground")}
                  >
                    {s === "short" ? "Curta" : s === "long" ? "Longa" : "Média"}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-sm">{captionText}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] font-semibold uppercase text-primary">Venda direta</div>
                <p className="mt-1 text-xs">{analysis.copy_direct}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] font-semibold uppercase text-primary">Emocional</div>
                <p className="mt-1 text-xs">{analysis.copy_emotional}</p>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-border bg-card p-3">
              <div className="text-[10px] font-semibold uppercase text-primary">CTA</div>
              <p className="mt-1 text-sm font-medium">{analysis.cta}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {analysis.hashtags.map((h) => (
                <span key={h} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                  {h.startsWith("#") ? h : `#${h}`}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 py-3 text-xs font-semibold text-primary">
              <Wand2 className="h-3.5 w-3.5" /> Editar
            </button>
            <button onClick={copyCaption} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-3 text-xs font-semibold">
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar
            </button>
            <button onClick={downloadImage} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-3 text-xs font-semibold">
              <Download className="h-3.5 w-3.5" /> Baixar
            </button>
          </div>

          <button
            onClick={savePost}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar na minha Central
          </button>

          <Link to="/criar-post" onClick={() => { setStep("upload"); setFile(null); setAnalysis(null); setGeneratedUrl(null); }} className="block text-center text-xs text-muted-foreground underline">
            Criar outro post
          </Link>
        </div>
      )}

      {editing && analysis && (
        <PostEditor
          format={format}
          initial={{
            title: analysis.title,
            description: analysis.caption_short,
            cta: analysis.cta,
            bgImage: generatedUrl,
          }}
          identity={{
            fullName: profile?.full_name ?? "",
            username: profile?.username ?? "",
            avatarUrl: profile?.avatar_url ?? null,
            verified: !!profile?.verified,
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </MobileShell>
  );
}

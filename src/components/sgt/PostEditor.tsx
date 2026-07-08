import { useState, useRef, useEffect } from "react";
import { Download, Type, Palette, ImageIcon, BadgeCheck, X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PostEditorState {
  title: string;
  description: string;
  cta: string;
  bgImage: string | null;
  bgGradient: string;
  textColor: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  layout: "top" | "center" | "bottom";
  showIdentity: boolean;
  showVerifiedBadge: boolean;
}

export interface IdentityInfo {
  fullName: string;
  username: string;
  avatarUrl: string | null;
  verified: boolean;
}

interface PostEditorProps {
  initial: Partial<PostEditorState>;
  identity: IdentityInfo;
  format?: "square" | "vertical";
  onClose?: () => void;
}

const GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#30cfd0,#330867)",
  "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  "linear-gradient(135deg,#ff6a00,#ee0979)",
  "linear-gradient(135deg,#11998e,#38ef7d)",
];

const FONTS = [
  { id: "system-ui, sans-serif", label: "Sans" },
  { id: "Georgia, serif", label: "Serif" },
  { id: "'Courier New', monospace", label: "Mono" },
  { id: "Impact, sans-serif", label: "Bold" },
];

const TEXT_COLORS = ["#ffffff", "#000000", "#fbbf24", "#f43f5e", "#22d3ee", "#a3e635"];

export function PostEditor({ initial, identity, format = "square", onClose }: PostEditorProps) {
  const [state, setState] = useState<PostEditorState>({
    title: initial.title ?? "Título do post",
    description: initial.description ?? "Descrição rápida do teu serviço",
    cta: initial.cta ?? "Fala connosco agora",
    bgImage: initial.bgImage ?? null,
    bgGradient: initial.bgGradient ?? GRADIENTS[0],
    textColor: initial.textColor ?? "#ffffff",
    fontFamily: initial.fontFamily ?? "system-ui, sans-serif",
    textAlign: initial.textAlign ?? "left",
    layout: initial.layout ?? "bottom",
    showIdentity: initial.showIdentity ?? true,
    showVerifiedBadge: initial.showVerifiedBadge ?? identity.verified,
  });

  const [tab, setTab] = useState<"text" | "color" | "bg" | "ident">("text");
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof PostEditorState>(k: K, v: PostEditorState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const onPickImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("bgImage", reader.result as string);
    reader.readAsDataURL(file);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      // Use html2canvas-style via SVG foreignObject for fidelity
      const node = canvasRef.current;
      const rect = node.getBoundingClientRect();
      const w = Math.round(rect.width * 2);
      const h = Math.round(rect.height * 2);

      // Clone the node and inline computed styles
      const clone = node.cloneNode(true) as HTMLElement;
      // Strip handles etc
      clone.querySelectorAll("[data-no-export]").forEach((el) => el.remove());
      const html = new XMLSerializer().serializeToString(clone);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${rect.width}px;height:${rect.height}px;transform:scale(2);transform-origin:top left;">
            ${html}
          </div>
        </foreignObject>
      </svg>`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas");
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `nupublico-post-${Date.now()}.png`;
      a.click();
      toast.success("Post exportado!");
    } catch (e) {
      toast.error("Erro a exportar. Tenta uma captura de ecrã.");
    }
  };

  const aspect = format === "vertical" ? "9/16" : "1/1";
  const justify =
    state.layout === "top" ? "justify-start" : state.layout === "center" ? "justify-center" : "justify-end";
  const align =
    state.textAlign === "left" ? "items-start text-left" : state.textAlign === "right" ? "items-end text-right" : "items-center text-center";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold">Editor de Post</div>
        <button
          onClick={exportPNG}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>
      </div>

      {/* Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
        <div
          ref={canvasRef}
          className={cn("relative flex w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl", justify, align, "p-6")}
          style={{
            aspectRatio: aspect,
            background: state.bgImage ? `url(${state.bgImage}) center/cover` : state.bgGradient,
            fontFamily: state.fontFamily,
          }}
        >
          {/* Dark overlay for readability when bg image is set */}
          {state.bgImage && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          )}

          <div className={cn("relative z-10 flex w-full flex-col gap-2", align)} style={{ color: state.textColor }}>
            <h2 className="text-2xl font-extrabold leading-tight drop-shadow-lg">{state.title}</h2>
            <p className="text-sm opacity-95 drop-shadow">{state.description}</p>
            {state.cta && (
              <div
                className="mt-2 inline-block self-auto rounded-full px-4 py-2 text-xs font-bold"
                style={{ background: state.textColor, color: state.bgImage ? "#000" : "#111" }}
              >
                {state.cta}
              </div>
            )}
          </div>

          {/* Identity bottom-left (always visible if enabled) */}
          {state.showIdentity && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-black/55 px-2 py-1 backdrop-blur-md">
              {identity.avatarUrl ? (
                <img src={identity.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {(identity.fullName || identity.username || "U")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-white">
                  <span className="max-w-[100px] truncate">{identity.fullName || identity.username}</span>
                  {state.showVerifiedBadge && (
                    <BadgeCheck className="h-3.5 w-3.5 fill-blue-500 text-white" />
                  )}
                </div>
                {identity.username && (
                  <span className="text-[9px] text-white/70">@{identity.username}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-border bg-card">
        {[
          { id: "text", label: "Texto", icon: Type },
          { id: "color", label: "Cor", icon: Palette },
          { id: "bg", label: "Fundo", icon: ImageIcon },
          { id: "ident", label: "Identidade", icon: Crown },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="max-h-[40vh] overflow-y-auto border-t border-border bg-card px-4 py-3">
        {tab === "text" && (
          <div className="space-y-3">
            <Field label="Título">
              <input
                value={state.title}
                onChange={(e) => update("title", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Descrição">
              <textarea
                value={state.description}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="CTA">
              <input
                value={state.cta}
                onChange={(e) => update("cta", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Tipografia">
              <div className="grid grid-cols-4 gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => update("fontFamily", f.id)}
                    style={{ fontFamily: f.id }}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs",
                      state.fontFamily === f.id ? "border-primary bg-primary/10 text-primary" : "border-border",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Alinhamento">
              <div className="grid grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => update("textAlign", a)}
                    className={cn(
                      "rounded-lg border py-2 text-xs capitalize",
                      state.textAlign === a ? "border-primary bg-primary/10 text-primary" : "border-border",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Posição">
              <div className="grid grid-cols-3 gap-2">
                {(["top", "center", "bottom"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => update("layout", l)}
                    className={cn(
                      "rounded-lg border py-2 text-xs capitalize",
                      state.layout === l ? "border-primary bg-primary/10 text-primary" : "border-border",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {tab === "color" && (
          <Field label="Cor do texto">
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update("textColor", c)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2",
                    state.textColor === c ? "border-primary" : "border-border",
                  )}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={state.textColor}
                onChange={(e) => update("textColor", e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-full border-2 border-border"
              />
            </div>
          </Field>
        )}

        {tab === "bg" && (
          <div className="space-y-3">
            <Field label="Imagem de fundo">
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 rounded-lg border border-dashed border-border py-2 text-xs"
                >
                  {state.bgImage ? "Trocar imagem" : "Carregar imagem"}
                </button>
                {state.bgImage && (
                  <button
                    onClick={() => update("bgImage", null)}
                    className="rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    Remover
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
            </Field>
            <Field label="Gradiente de fundo">
              <div className="grid grid-cols-4 gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      update("bgGradient", g);
                      update("bgImage", null);
                    }}
                    className={cn(
                      "h-12 rounded-lg border-2",
                      state.bgGradient === g && !state.bgImage ? "border-primary" : "border-transparent",
                    )}
                    style={{ background: g }}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {tab === "ident" && (
          <div className="space-y-3">
            <Toggle
              label="Mostrar identidade"
              checked={state.showIdentity}
              onChange={(v) => update("showIdentity", v)}
            />
            <Toggle
              label="Selo verificado (azul)"
              checked={state.showVerifiedBadge}
              onChange={(v) => update("showVerifiedBadge", v)}
              disabled={!identity.verified}
              hint={!identity.verified ? "Completa o teu perfil para activar." : undefined}
            />
            <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
              Identidade aparece sempre no canto inferior esquerdo do post.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm",
          disabled && "opacity-50",
        )}
      >
        <span>{label}</span>
        <span
          className={cn(
            "h-5 w-9 rounded-full p-0.5 transition",
            checked ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "block h-4 w-4 rounded-full bg-white transition",
              checked && "translate-x-4",
            )}
          />
        </span>
      </button>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

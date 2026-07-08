import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { Image as ImageIcon, Loader2, Camera, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/publicar")({
  component: () => (
    <RequireAuth>
      <Publicar />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Publicar — Núpublico" }] }),
});

type Kind = "post" | "status";

function Publicar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>("post");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    try {
      const bucket = kind === "post" ? "posts" : "statuses";
      const url = await uploadToBucket(bucket, user.id, file);
      if (kind === "post") {
        const { error } = await supabase.from("posts").insert({ user_id: user.id, image_url: url, caption: caption || null });
        if (error) throw error;
        toast.success("Publicação criada");
      } else {
        const { error } = await supabase.from("statuses").insert({ user_id: user.id, image_url: url, caption: caption || null });
        if (error) throw error;
        toast.success("Status publicado por 24h");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold">Criar nova publicação</h1>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 text-xs font-semibold">
          <button
            onClick={() => setKind("post")}
            className={cn("rounded-lg py-2 transition", kind === "post" ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
          >
            <Camera className="mr-1 inline h-3.5 w-3.5" /> Post
          </button>
          <button
            onClick={() => setKind("status")}
            className={cn("rounded-lg py-2 transition", kind === "status" ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}
          >
            <Zap className="mr-1 inline h-3.5 w-3.5" /> Status 24h
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3 px-4 py-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary"
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm">Toca para escolher uma imagem</span>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          placeholder={kind === "post" ? "Descreve o trabalho..." : "Mensagem curta (opcional)"}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />

        <button
          type="submit"
          disabled={!file || busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {kind === "post" ? "Publicar no feed" : "Publicar status (24h)"}
        </button>
      </form>
    </MobileShell>
  );
}

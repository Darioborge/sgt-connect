import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Settings, BadgeCheck, Star, Camera, Loader2, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { uploadToBucket } from "@/lib/upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  component: () => (
    <RequireAuth>
      <Perfil />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Meu perfil — SGT Express" }] }),
});

function Perfil() {
  const { user, signOut } = useAuth();
  const { profile, setProfile } = useProfile(user?.id);
  const navigate = useNavigate();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  const upload = async (kind: "avatar" | "cover", file: File) => {
    if (!user) return;
    setUploading(kind);
    try {
      const bucket = kind === "avatar" ? "avatars" : "covers";
      const url = await uploadToBucket(bucket, user.id, file);
      const patch = kind === "avatar" ? { avatar_url: url } : { cover_url: url };
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      toast.success(kind === "avatar" ? "Foto de perfil atualizada" : "Capa atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setUploading(null);
    }
  };

  const toggleMode = async () => {
    if (!profile || !user) return;
    const next = profile.mode === "cliente" ? "prestador" : "cliente";
    const { error } = await supabase.from("profiles").update({ mode: next }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, mode: next });
  };

  return (
    <MobileShell>
      <div className="relative">
        <div
          className="h-32 w-full bg-muted"
          style={
            profile?.cover_url
              ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "var(--gradient-primary)" }
          }
        />
        <button
          onClick={() => coverRef.current?.click()}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1.5 text-xs font-medium backdrop-blur"
          disabled={uploading === "cover"}
        >
          {uploading === "cover" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          Capa
        </button>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])}
        />

        <div className="absolute -bottom-10 left-4">
          <div className="relative">
            <div className="rounded-full p-[3px]" style={{ background: "var(--gradient-primary)" }}>
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.full_name ?? "U"}`}
                alt="Avatar"
                className="h-20 w-20 rounded-full bg-background object-cover ring-2 ring-background"
              />
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              disabled={uploading === "avatar"}
            >
              {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload("avatar", e.target.files[0])}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 pt-3">
        <Link
          to="/configuracoes"
          className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <Settings className="h-3.5 w-3.5" />
          Editar
        </Link>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
          className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-1 text-base font-semibold">
          {profile?.full_name ?? "Sem nome"}
          {profile?.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {profile?.category ? `${profile.category} • ` : ""}
          {profile?.city ?? "Luanda"}
        </p>
        {profile?.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
        <div className="mt-1 flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="font-medium">{profile?.rating ?? 0}</span>
          <span className="text-muted-foreground">• {profile?.jobs_done ?? 0} serviços</span>
        </div>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 text-xs font-semibold">
        {(["cliente", "prestador"] as const).map((m) => (
          <button
            key={m}
            onClick={() => profile?.mode !== m && toggleMode()}
            className={cn(
              "rounded-lg py-2 capitalize transition",
              profile?.mode === m ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            Modo {m}
          </button>
        ))}
      </div>

      {profile?.mode === "prestador" ? (
        <div className="mt-4 space-y-3 px-4 pb-6">
          <Row label="Ganhos do mês" value="—" />
          <Row label="Serviços realizados" value={String(profile.jobs_done ?? 0)} />
          <Row label="Avaliação média" value={String(profile.rating ?? 0)} />
          <Row label="Disponibilidade" value={profile.available ? "Ativa" : "Inativa"} />
        </div>
      ) : (
        <div className="mt-4 space-y-3 px-4 pb-6">
          <Row label="Modo" value="Cliente" />
          <Row label="Cidade" value={profile?.city ?? "Luanda"} />
          <Row label="Membro desde" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-PT") : "—"} />
        </div>
      )}
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

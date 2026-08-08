import { Img } from "@/components/sgt/Img";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Settings, BadgeCheck, Camera, Loader2, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { uploadToBucket } from "@/lib/upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";

export const Route = createFileRoute("/perfil")({
  component: () => (
    <RequireAuth>
      <Perfil />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Meu perfil — BB Serviços Express" }] }),
});

interface SmartPostRow {
  id: string;
  generated_image_url: string | null;
  title: string | null;
  score: number;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  created_at: string;
}

type Tab = "photos" | "videos" | "saved";

function Perfil() {
  const { user } = useAuth();
  const { profile, setProfile } = useProfile(user?.id);
  const { isPremiumActive } = usePlan(user?.id);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [posts, setPosts] = useState<SmartPostRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("photos");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("smart_posts")
      .select("id, generated_image_url, title, score, views_count, clicks_count, conversions_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setPosts(data ?? []));
  }, [user]);

  const totals = (posts ?? []).reduce(
    (acc, p) => {
      acc.views += p.views_count;
      acc.clicks += p.clicks_count;
      acc.conv += p.conversions_count;
      return acc;
    },
    { views: 0, clicks: 0, conv: 0 },
  );

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

  const avgScore = posts && posts.length > 0 ? Math.round(posts.reduce((a, p) => a + p.score, 0) / posts.length) : 0;

  return (
    <MobileShell hideTopBar>
      {/* Cover image with gradient overlay */}
      <div className="relative">
        <div
          className="h-56 w-full bg-muted"
          style={
            profile?.cover_url
              ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, oklch(0.20 0.04 160), oklch(0.32 0.10 150))" }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />

        {/* Top bar over cover — só ícones, sem texto sobreposto */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-end gap-2 px-4 pt-4">
          <button
            onClick={() => coverRef.current?.click()}
            disabled={uploading === "cover"}
            aria-label="Mudar capa"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/40 text-foreground backdrop-blur-md"
          >
            {uploading === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <Link
            to="/configuracoes"
            aria-label="Definições"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/40 text-foreground backdrop-blur-md"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])}
        />
      </div>

      {/* Avatar */}
      <div className="-mt-14 flex justify-center">
        <div className="relative">
          <div className="rounded-full p-[3px]" style={{ background: "var(--gradient-primary)" }}>
            <Img
              src={profile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.full_name ?? "U"}`}
              alt="Avatar"
              className="h-24 w-24 rounded-full bg-background object-cover ring-4 ring-background"
            />
          </div>
          <button
            onClick={() => avatarRef.current?.click()}
            disabled={uploading === "avatar"}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"
            aria-label="Mudar avatar"
          >
            {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
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

      {/* Name + handle + verified (verde) + premium (azul) */}
      <div className="mt-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-lg font-semibold">
          <span>{profile?.full_name ?? "Sem nome"}</span>
          {profile?.verified && (
            <BadgeCheck
              className="h-5 w-5 fill-[oklch(0.55_0.18_150)] text-background"
              aria-label="Perfil verificado"
            />
          )}
          {isPremiumActive && (
            <BadgeCheck
              className="h-5 w-5 fill-[oklch(0.60_0.18_240)] text-background"
              aria-label="Premium"
            />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          @{profile?.username ?? (profile?.full_name?.toLowerCase().replace(/\s+/g, "_") ?? "user")}
        </div>

        {/* Bio + meta */}
        {profile?.bio && (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {profile?.category && (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">
              {profile.category}
            </span>
          )}
          {profile?.city && <span>📍 {profile.city}</span>}
          {profile?.phone && <span>📞 {profile.phone}</span>}
          {profile?.price_from_kz != null && profile.price_from_kz > 0 && (
            <span className="font-semibold text-foreground">
              desde {profile.price_from_kz.toLocaleString("pt-PT")} Kz
            </span>
          )}
        </div>

        {!profile?.verified && (
          <Link
            to="/configuracoes"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Completa o perfil para obter o selo verde
          </Link>
        )}
      </div>

      {/* Stats inline */}
      <div className="mt-5 flex items-center justify-center gap-10 px-4">
        <Stat value={formatK(totals.views || (profile?.jobs_done ?? 0) * 10)} label="Clientes" />
        <Stat value={String(posts?.length ?? 0)} label="Projetos" />
        <Stat value={String(profile?.jobs_done ?? 0)} label="Serviços" />
      </div>

      {/* Message */}
      <div className="mt-5 flex items-center justify-center px-6">
        <Link
          to="/chat"
          className="flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Mensagem
        </Link>
      </div>


      {/* Tabs */}
      <div className="mt-6 grid grid-cols-3 border-b border-border/40 px-4">
        {(["photos", "videos", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative pb-2.5 text-center text-sm font-medium capitalize transition",
              tab === t ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t === "photos" ? "Photos" : t === "videos" ? "Videos" : "Saved"}
            {tab === t && <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {posts && posts.length > 0 && (
        <div className="mx-4 mt-4 text-center text-[11px] text-muted-foreground">
          Score médio dos teus posts: <span className="font-semibold text-primary">{avgScore}%</span>
        </div>
      )}

      {/* Grid */}
      <div className="mx-4 mt-4 pb-6">
        {posts === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : tab !== "photos" ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Nada por aqui ainda.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Nada por aqui ainda.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-secondary">
                {p.generated_image_url && (
                  <Img src={p.generated_image_url} alt={p.title ?? "Post"} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[10px] font-bold text-white">
                  {p.score}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function formatK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

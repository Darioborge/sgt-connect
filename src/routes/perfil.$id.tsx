import { Img } from "@/components/sgt/Img";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { ArrowLeft, BadgeCheck, MessageCircle, Phone, Sparkles, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/perfil/$id")({
  component: PublicProfile,
  head: () => ({ meta: [{ title: "Perfil — BB Serviços Express" }] }),
});

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
interface PostRow {
  id: string;
  generated_image_url: string | null;
  title: string | null;
  score: number;
}

function PublicProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: p }, { data: ps }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("smart_posts")
          .select("id, generated_image_url, title, score")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      if (!mounted) return;
      setProfile(p);
      setPosts(ps ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isOwn = user?.id === id;

  // Redirect to own profile page if it's me
  useEffect(() => {
    if (isOwn) navigate({ to: "/perfil", replace: true });
  }, [isOwn, navigate]);

  const message = async () => {
    if (!user) return navigate({ to: "/auth" });
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: id });
    if (error) return toast.error(error.message);
    navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  const call = () => {
    if (!profile?.phone) return toast.error("Este utilizador não tem número público.");
    window.location.href = `tel:${profile.phone}`;
  };

  if (loading) {
    return (
      <MobileShell hideTopBar>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  if (!profile) {
    return (
      <MobileShell hideTopBar>
        <div className="p-6 text-center text-sm text-muted-foreground">Perfil não encontrado.</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell hideTopBar>
      <div className="relative">
        <div
          className="h-48 w-full bg-muted"
          style={
            profile.cover_url
              ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, oklch(0.20 0.04 160), oklch(0.32 0.10 150))" }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />
        <button
          onClick={() => history.back()}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/40 backdrop-blur-md"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="-mt-12 flex justify-center">
        <div className="rounded-full p-[3px]" style={{ background: "var(--gradient-primary)" }}>
          <Img
            src={profile.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${profile.full_name ?? "U"}`}
            alt={profile.full_name ?? ""}
            className="h-24 w-24 rounded-full bg-background object-cover ring-4 ring-background"
          />
        </div>
      </div>

      <div className="mt-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-lg font-semibold">
          <span>{profile.full_name ?? "Sem nome"}</span>
          {profile.verified && (
            <BadgeCheck className="h-5 w-5 fill-[oklch(0.55_0.18_150)] text-background" />
          )}
        </div>
        <div className="text-xs text-muted-foreground">@{profile.username ?? "user"}</div>

        {profile.bio && <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/80">{profile.bio}</p>}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {profile.category && (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">
              {profile.category}
            </span>
          )}
          {profile.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.city}
            </span>
          )}
          {profile.price_from_kz != null && profile.price_from_kz > 0 && (
            <span className="font-semibold text-foreground">
              desde {profile.price_from_kz.toLocaleString("pt-PT")} Kz
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 px-4">
        <button
          onClick={message}
          className="flex items-center justify-center gap-1 rounded-full py-2.5 text-xs font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Mensagem
        </button>
        <button
          onClick={call}
          className="flex items-center justify-center gap-1 rounded-full border border-primary/40 bg-card py-2.5 text-xs font-semibold text-primary"
        >
          <Phone className="h-3.5 w-3.5" /> Ligar
        </button>
      </div>

      <div className="mx-4 mt-6 pb-8">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Trabalhos</div>
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                {p.generated_image_url && (
                  <Img src={p.generated_image_url} alt={p.title ?? ""} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[10px] font-bold text-white">
                  {p.score}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Sem publicações ainda.
          </div>
        )}
      </div>
    </MobileShell>
  );
}

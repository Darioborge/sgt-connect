import { Img } from "@/components/sgt/Img";
import { Heart, BadgeCheck, Loader2, X, MoreVertical, MessageCircle, Download, Share2, User as UserIcon, Repeat2, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profile: { id: string; full_name: string | null; avatar_url: string | null; verified: boolean | null; category: string | null; price_from_kz: number | null } | null;
};
type Comment = Database["public"]["Tables"]["comments"]["Row"] & {
  profile?: { full_name: string | null; avatar_url: string | null } | null;
};

export function FeedCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const provider = post.profile;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", post.id),
      ]);
      if (!mounted) return;
      setLikeCount(lc ?? 0);
      setCommentCount(cc ?? 0);
      if (user) {
        const { data } = await supabase
          .from("likes")
          .select("user_id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (mounted) setLiked(!!data);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [post.id, user]);

  const toggleLike = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (liked) {
      setLiked(false);
      setLikeCount((n) => n - 1);
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((n) => n + 1);
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const contratar = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!provider) return;
    if (provider.id === user.id) return toast.info("Não podes contratar o teu próprio serviço");
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: provider.id });
    if (error) return toast.error(error.message);
    await supabase.from("messages").insert({
      conversation_id: data,
      sender_id: user.id,
      content: `Olá! Tenho interesse no teu serviço (${provider.category ?? "serviço"}).`,
    });
    await supabase.from("service_requests").insert({
      client_id: user.id,
      provider_id: provider.id,
      category: provider.category,
      description: post.caption,
      price_kz: provider.price_from_kz,
    });
    navigate({ to: "/chat/$id", params: { id: data } });
  };

  const goProfile = () => {
    if (!provider) return;
    if (user?.id === provider.id) navigate({ to: "/perfil" });
    else navigate({ to: "/perfil/$id", params: { id: provider.id } });
  };

  const downloadImage = async () => {
    try {
      const res = await fetch(post.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nupublico-${post.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Imagem guardada");
    } catch {
      toast.error("Não foi possível baixar");
    }
    setMenuOpen(false);
  };

  const sharePost = async () => {
    const shareUrl = `${window.location.origin}/perfil/${provider?.id ?? ""}`;
    const shareData = {
      title: provider?.full_name ?? "Núpublico",
      text: post.caption ?? "Vê este post no Núpublico",
      url: shareUrl,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copiado");
      }
    } catch {
      /* user cancelled */
    }
    setMenuOpen(false);
  };

  const republicar = async () => {
    if (!user) return navigate({ to: "/auth" });
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      image_url: post.image_url,
      caption: `↻ Republicado: ${post.caption ?? ""}`.trim(),
    });
    if (error) toast.error(error.message);
    else toast.success("Post republicado no teu perfil");
    setMenuOpen(false);
  };

  const promover = () => {
    setMenuOpen(false);
    navigate({ to: "/planos" });
    toast.info("Escolhe o post e o nível de promoção");
  };

  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-card shadow-sm">
      <header className="flex items-center justify-between px-4 py-4">
        <button onClick={goProfile} className="flex items-center gap-3 text-left">
          <img
            src={provider?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${provider?.full_name ?? "U"}`}
            alt={provider?.full_name ?? ""}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-sm font-medium text-white">
              {provider?.full_name ?? "Utilizador"}
              {provider?.verified && (
                <BadgeCheck className="h-4 w-4 fill-[oklch(0.55_0.18_150)] text-background" />
              )}
            </div>
            <div className="text-xs text-white/60">
              {new Date(post.created_at ?? "").toLocaleDateString("pt-PT")}
            </div>
          </div>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-white/60 hover:text-white"
            aria-label="Mais opções"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <MenuItem icon={<Download className="h-4 w-4" />} label="Baixar" onClick={downloadImage} />
                <MenuItem icon={<Share2 className="h-4 w-4" />} label="Partilhar" onClick={sharePost} />
                <MenuItem icon={<UserIcon className="h-4 w-4" />} label="Ver perfil" onClick={() => { goProfile(); setMenuOpen(false); }} />
                <MenuItem icon={<Repeat2 className="h-4 w-4" />} label="Republicar" onClick={republicar} />
                <MenuItem icon={<Rocket className="h-4 w-4 text-primary" />} label="Promover post" onClick={promover} highlight />
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative w-full overflow-hidden bg-muted">
        <Img src={post.image_url} alt={post.caption ?? ""} className="w-full object-cover" />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLike}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                liked ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white hover:bg-white/20",
              )}
              aria-label="Curtir"
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {likeCount}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              aria-label="Comentar"
            >
              <MessageCircle className="h-4 w-4" /> {commentCount}
            </button>
          </div>
          <button
            onClick={contratar}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Pedir orçamento
          </button>
        </div>
        {post.caption && (
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {post.caption}
          </p>
        )}
      </div>

      {open && <CommentsSheet postId={post.id} onClose={() => setOpen(false)} onCount={setCommentCount} />}
    </article>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-accent",
        highlight && "font-semibold text-primary",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CommentsSheet({
  postId,
  onClose,
  onCount,
}: {
  postId: string;
  onClose: () => void;
  onCount: (n: number) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, profile:profiles(full_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (mounted && data) {
        setItems(data as Comment[]);
        onCount(data.length);
      }
    };
    load();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [postId, onCount]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate({ to: "/auth" });
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex h-[70vh] w-full max-w-md flex-col rounded-t-2xl bg-background"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Comentários</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {items.length === 0 && <p className="text-center text-xs text-muted-foreground">Sê o primeiro a comentar</p>}
          {items.map((c) => (
            <div key={c.id} className="flex gap-2">
              <img
                src={c.profile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${c.profile?.full_name ?? "U"}`}
                className="h-8 w-8 rounded-full object-cover"
                alt=""
              />
              <div className="flex-1 rounded-2xl bg-secondary px-3 py-2">
                <div className="text-xs font-semibold">{c.profile?.full_name ?? "Utilizador"}</div>
                <div className="text-sm">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background px-3 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicionar um comentário…"
            className="flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}

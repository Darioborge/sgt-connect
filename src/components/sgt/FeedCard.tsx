import { Heart, MessageCircle, Send, BadgeCheck, Loader2, X } from "lucide-react";
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

  return (
    <article className="border-b border-border bg-background">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-[2px]" style={{ background: "var(--gradient-primary)" }}>
            <img
              src={provider?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${provider?.full_name ?? "U"}`}
              alt={provider?.full_name ?? ""}
              className="h-9 w-9 rounded-full bg-background object-cover ring-2 ring-background"
            />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-sm font-semibold">
              {provider?.full_name ?? "Utilizador"}
              {provider?.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            </div>
            {provider?.category && (
              <div className="text-[11px] text-muted-foreground">{provider.category}</div>
            )}
          </div>
        </div>
      </header>

      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <img src={post.image_url} alt={post.caption ?? ""} className="h-full w-full object-cover" />
      </div>

      <div className="flex items-center gap-3 px-3 py-2">
        <button onClick={toggleLike} aria-label="Curtir">
          <Heart className={cn("h-6 w-6 transition", liked ? "fill-primary text-primary" : "text-foreground")} />
        </button>
        <button onClick={() => setOpen(true)} aria-label="Comentar">
          <MessageCircle className="h-6 w-6" />
        </button>
        <button onClick={contratar} aria-label="Contactar">
          <Send className="h-6 w-6" />
        </button>
      </div>

      <div className="px-4 pb-1 text-sm font-semibold">{likeCount.toLocaleString("pt-PT")} curtidas</div>
      {post.caption && (
        <p className="px-4 pb-1 text-sm">
          <span className="font-semibold">{(provider?.full_name ?? "user").split(" ")[0].toLowerCase()}</span> {post.caption}
        </p>
      )}
      {commentCount > 0 && (
        <button onClick={() => setOpen(true)} className="px-4 pb-1 text-xs text-muted-foreground">
          Ver {commentCount} comentário{commentCount > 1 ? "s" : ""}
        </button>
      )}
      <p className="px-4 pb-3 text-[11px] text-muted-foreground">
        {new Date(post.created_at ?? "").toLocaleDateString("pt-PT")}
      </p>

      <div className="px-4 pb-4">
        <button
          onClick={contratar}
          className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          Contratar agora{provider?.price_from_kz ? ` • desde ${provider.price_from_kz.toLocaleString("pt-PT")} Kz` : ""}
        </button>
      </div>

      {open && <CommentsSheet postId={post.id} onClose={() => setOpen(false)} onCount={setCommentCount} />}
    </article>
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

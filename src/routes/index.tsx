import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { StoriesBar } from "@/components/sgt/StoriesBar";
import { FeedCard } from "@/components/sgt/FeedCard";
import { categories } from "@/components/sgt/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, FileText, Siren, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profile: { id: string; full_name: string | null; avatar_url: string | null; verified: boolean | null; category: string | null; price_from_kz: number | null } | null;
};

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Núpublico — Cria conteúdo publicitário com IA" },
      {
        name: "description",
        content:
          "Núpublico é a plataforma angolana para criar posts publicitários profissionais com IA, promover serviços e vender mais — tudo num só fluxo.",
      },
    ],
  }),
});

function Index() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, profile:profiles(id, full_name, avatar_url, verified, category, price_from_kz)")
        .order("created_at", { ascending: false })
        .limit(50);
      setPosts((data ?? []) as Post[]);
    };
    load();
    const ch = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <MobileShell>
      <StoriesBar />

      <Link
        to="/criar-post"
        className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-primary-foreground"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4" /> Smart Post Creator</div>
          <div className="text-[11px] opacity-90">Cria posts publicitários com IA em segundos</div>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">Criar</span>
      </Link>

      <div className="grid grid-cols-3 gap-2 border-b border-border px-3 py-3">
        <Link to="/agendamentos" className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-2 text-[11px] font-medium hover:border-primary hover:text-primary">
          <Calendar className="h-4 w-4 text-primary" /> Agendamentos
        </Link>
        <Link to="/faturas" className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-2 text-[11px] font-medium hover:border-primary hover:text-primary">
          <FileText className="h-4 w-4 text-primary" /> Faturas
        </Link>
        <Link to="/emergencia" className="flex flex-col items-center gap-1 rounded-xl border border-destructive/40 bg-destructive/5 px-2 py-2 text-[11px] font-semibold text-destructive">
          <Siren className="h-4 w-4" /> SOS
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:border-primary hover:text-primary"
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <h1 className="sr-only">Núpublico — Cria conteúdo publicitário com IA</h1>

      {posts === null ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          Ainda não há publicações. Toca em <span className="font-medium text-primary">Publicar</span> para criar a primeira!
        </div>
      ) : (
        posts.map((p) => <FeedCard key={p.id} post={p} />)
      )}
    </MobileShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { StoriesBar } from "@/components/sgt/StoriesBar";
import { FeedCard } from "@/components/sgt/FeedCard";
import { categories } from "@/components/sgt/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
<<<<<<< Updated upstream
import { Loader2, Calendar, Siren, Sparkles } from "lucide-react";
=======
import { Loader2, Search, Bell } from "lucide-react";
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    <MobileShell topTitle="Discover">
      <StoriesBar />

      {/* Quick actions */}
      <div className="mx-3 mt-2 grid grid-cols-3 gap-2">
        <Link to="/criar-post" className="flex flex-col items-center gap-1 rounded-2xl border border-primary/30 bg-primary/10 px-2 py-2.5 text-[11px] font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> Criar
        </Link>
        <Link to="/agendamentos" className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-card px-2 py-2.5 text-[11px] font-medium hover:text-primary">
          <Calendar className="h-4 w-4 text-primary" /> Agenda
        </Link>
        <Link to="/emergencia" className="flex flex-col items-center gap-1 rounded-2xl border border-destructive/30 bg-destructive/10 px-2 py-2.5 text-[11px] font-semibold text-destructive">
          <Siren className="h-4 w-4" /> SOS
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <h1 className="sr-only">Núpublico — Marketplace de serviços com IA</h1>

      {posts === null ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          Ainda não há publicações. Toca em <span className="font-semibold text-primary">+</span> para criar a primeira!
        </div>
      ) : (
        <div className="pb-2">{posts.map((p) => <FeedCard key={p.id} post={p} />)}</div>
      )}
=======
    <MobileShell hideTopBar={true}>
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <h1 className="text-2xl tracking-tight text-white">
          Discover <span className="font-semibold text-primary">Nuvenda</span>
        </h1>
        <div className="flex gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-card/60 text-white transition hover:bg-card">
            <Search className="h-5 w-5" />
          </button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card/60 text-white transition hover:bg-card">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      <StoriesBar />

      <div className="mt-4 flex flex-col gap-6 px-4">
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
      </div>
>>>>>>> Stashed changes
    </MobileShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { StoriesBar } from "@/components/sgt/StoriesBar";
import { FeedCard } from "@/components/sgt/FeedCard";
import { categories } from "@/components/sgt/data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  profile: { id: string; full_name: string | null; avatar_url: string | null; verified: boolean | null; category: string | null; price_from_kz: number | null } | null;
};

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SGT Express — Serviços rápidos em Angola" },
      {
        name: "description",
        content:
          "SGT Express liga clientes a prestadores de serviços de confiança em Angola: eletricistas, limpezas, beleza e mais, em minutos.",
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

      <h1 className="sr-only">SGT Express — Marketplace de serviços em Angola</h1>

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

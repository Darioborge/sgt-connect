import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { StoriesBar } from "@/components/sgt/StoriesBar";
import { FeedCard } from "@/components/sgt/FeedCard";
import { categories, feed } from "@/components/sgt/data";

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

      {feed.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </MobileShell>
  );
}

import { Heart, MessageCircle, Bookmark, Send, MoreHorizontal, BadgeCheck, MapPin } from "lucide-react";
import { type FeedPost, providers } from "./data";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FeedCard({ post }: { post: FeedPost }) {
  const provider = providers.find((p) => p.id === post.providerId)!;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="border-b border-border bg-background">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="rounded-full p-[2px]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <img src={provider.avatar} alt={provider.name} className="h-9 w-9 rounded-full bg-background object-cover ring-2 ring-background" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-sm font-semibold">
              {provider.name}
              {provider.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {provider.category} • {provider.distanceKm} km
            </div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground" aria-label="Mais opções">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <img src={post.image} alt={post.caption} className="h-full w-full object-cover" />
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setLiked(!liked)} aria-label="Curtir">
            <Heart className={cn("h-6 w-6 transition", liked ? "fill-primary text-primary" : "text-foreground")} />
          </button>
          <button aria-label="Comentar"><MessageCircle className="h-6 w-6" /></button>
          <button aria-label="Partilhar"><Send className="h-6 w-6" /></button>
        </div>
        <button onClick={() => setSaved(!saved)} aria-label="Guardar">
          <Bookmark className={cn("h-6 w-6 transition", saved && "fill-foreground")} />
        </button>
      </div>

      <div className="px-4 pb-2 text-sm font-semibold">
        {(post.likes + (liked ? 1 : 0)).toLocaleString("pt-PT")} curtidas
      </div>
      <p className="px-4 pb-1 text-sm">
        <span className="font-semibold">{provider.name.split(" ")[0].toLowerCase()}</span>{" "}
        {post.caption}
      </p>
      <p className="px-4 pb-3 text-xs text-muted-foreground">há {post.timeAgo}</p>

      <div className="px-4 pb-4">
        <button
          className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Contratar agora • desde {provider.priceFromKz.toLocaleString("pt-PT")} Kz
        </button>
      </div>
    </article>
  );
}

import { providers } from "./data";
import { Plus } from "lucide-react";

export function StoriesBar() {
  return (
    <div className="border-b border-border">
      <div className="flex gap-4 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <div className="relative h-16 w-16 rounded-full bg-muted ring-2 ring-border">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Plus className="h-6 w-6" />
            </div>
          </div>
          <span className="line-clamp-1 text-[11px] text-muted-foreground">Seu status</span>
        </button>

        {providers.map((p) => (
          <button key={p.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div
              className="rounded-full p-[2px]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <div className="rounded-full bg-background p-[2px]">
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              </div>
            </div>
            <span className="line-clamp-1 w-full text-center text-[11px] text-foreground">
              {p.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Img } from "@/components/sgt/Img";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Status {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string | null;
  expires_at: string;
}

interface GroupedStatus {
  userId: string;
  fullName: string;
  avatar: string | null;
  items: Status[];
}

export function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupedStatus[]>([]);
  const [viewer, setViewer] = useState<{ group: number; index: number } | null>(null);

  const load = useCallback(async () => {
    const { data: rows } = await supabase
      .from("statuses")
      .select("id, user_id, image_url, caption, created_at, expires_at")
      .order("created_at", { ascending: false });
    if (!rows) return;
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map(profs?.map((p) => [p.id, p]) ?? []);
    const map = new Map<string, GroupedStatus>();
    for (const s of rows) {
      const p = pmap.get(s.user_id);
      if (!map.has(s.user_id)) {
        map.set(s.user_id, {
          userId: s.user_id,
          fullName: p?.full_name ?? "Utilizador",
          avatar: p?.avatar_url ?? null,
          items: [],
        });
      }
      map.get(s.user_id)!.items.push(s);
    }
    setGroups(Array.from(map.values()));
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("statuses-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const close = () => setViewer(null);
  const next = useCallback(() => {
    setViewer((v) => {
      if (!v) return v;
      const g = groups[v.group];
      if (v.index + 1 < g.items.length) return { ...v, index: v.index + 1 };
      if (v.group + 1 < groups.length) return { group: v.group + 1, index: 0 };
      return null;
    });
  }, [groups]);
  const prev = () => {
    setViewer((v) => {
      if (!v) return v;
      if (v.index > 0) return { ...v, index: v.index - 1 };
      if (v.group > 0) return { group: v.group - 1, index: groups[v.group - 1].items.length - 1 };
      return v;
    });
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-6 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to="/publicar" className="flex w-16 shrink-0 flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-medium text-white/70">{user ? "You" : "Login"}</span>
        </Link>

        {groups.map((g, gi) => (
          <button
            key={g.userId}
            onClick={() => setViewer({ group: gi, index: 0 })}
            className="flex w-16 shrink-0 flex-col items-center gap-2"
          >
            <div className="rounded-full">
              <Img
                src={g.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${g.fullName}`}
                alt={g.fullName}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-background"
              />
            </div>
            <span className="w-full truncate text-center text-xs font-medium text-white/70">{g.fullName.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {viewer && (
        <StatusViewer
          status={groups[viewer.group].items[viewer.index]}
          name={groups[viewer.group].fullName}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </>
  );
}

function StatusViewer({
  status,
  name,
  onClose,
  onNext,
  onPrev,
}: {
  status: Status;
  name: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const timer = useRef<number | null>(null);
  useEffect(() => {
    timer.current = window.setTimeout(onNext, 5000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [status.id, onNext]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white">
        <X className="h-5 w-5" />
      </button>
      <button onClick={onPrev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={onNext} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="relative max-h-[90vh] w-full max-w-md">
        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
          {name}
        </div>
        <Img src={status.image_url} alt="status" className="max-h-[90vh] w-full object-contain" />
        {status.caption && (
          <p className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/40 p-3 text-center text-sm text-white">
            {status.caption}
          </p>
        )}
      </div>
    </div>
  );
}

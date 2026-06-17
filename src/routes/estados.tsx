import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { MobileShell } from "@/components/sgt/MobileShell";
import { Plus, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/estados")({
  component: EstadosPage,
  head: () => ({ meta: [{ title: "Estados — Núpublico" }] }),
});

interface Status {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string | null;
  expires_at: string;
}

interface Group {
  userId: string;
  fullName: string;
  avatar: string | null;
  items: Status[];
}

const IMAGE_DURATION_MS = 30_000;
const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

function EstadosPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [viewer, setViewer] = useState<{ group: number; index: number } | null>(null);

  const load = useCallback(async () => {
    const { data: rows } = await supabase
      .from("statuses")
      .select("id, user_id, image_url, caption, created_at, expires_at")
      .order("created_at", { ascending: true });
    if (!rows) return setGroups([]);
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map(profs?.map((p) => [p.id, p]) ?? []);
    const map = new Map<string, Group>();
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
    // own status first
    const arr = Array.from(map.values());
    if (user) {
      arr.sort((a, b) => (a.userId === user.id ? -1 : b.userId === user.id ? 1 : 0));
    }
    setGroups(arr);
  }, [user]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("estados-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const close = () => setViewer(null);
  const next = useCallback(() => {
    setViewer((v) => {
      if (!v || !groups) return null;
      const g = groups[v.group];
      if (v.index + 1 < g.items.length) return { ...v, index: v.index + 1 };
      if (v.group + 1 < groups.length) return { group: v.group + 1, index: 0 };
      return null;
    });
  }, [groups]);
  const prev = useCallback(() => {
    setViewer((v) => {
      if (!v || !groups) return v;
      if (v.index > 0) return { ...v, index: v.index - 1 };
      if (v.group > 0) return { group: v.group - 1, index: groups[v.group - 1].items.length - 1 };
      return v;
    });
  }, [groups]);

  const myGroup = groups?.find((g) => g.userId === user?.id) ?? null;
  const others = groups?.filter((g) => g.userId !== user?.id) ?? [];

  return (
    <MobileShell hideTopBar>
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight">Estados</h1>
      </div>

      {groups === null ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-2 pb-8">
          {/* My status */}
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            O meu estado
          </div>
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-accent/30">
            <div className="relative">
              <img
                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${user?.email ?? "Eu"}`}
                alt="Eu"
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/60"
              />
              <Link
                to="/publicar"
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-black ring-2 ring-background"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </Link>
            </div>
            <button
              onClick={() => {
                if (myGroup && groups) {
                  const idx = groups.findIndex((g) => g.userId === user?.id);
                  if (idx >= 0) setViewer({ group: idx, index: 0 });
                }
              }}
              className="flex-1 text-left"
            >
              <div className="text-sm font-semibold">O meu estado</div>
              <div className="text-xs text-muted-foreground">
                {myGroup ? `${myGroup.items.length} estado(s)` : "Toca em + para publicar"}
              </div>
            </button>
          </div>

          {others.length > 0 && (
            <>
              <div className="mt-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Atualizações recentes
              </div>
              <ul className="flex flex-col">
                {others.map((g, gi) => {
                  const realIdx = (groups ?? []).findIndex((x) => x.userId === g.userId);
                  const last = g.items[g.items.length - 1];
                  return (
                    <li key={g.userId}>
                      <button
                        onClick={() => setViewer({ group: realIdx, index: 0 })}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-accent/30"
                      >
                        <img
                          src={g.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${g.fullName}`}
                          alt={g.fullName}
                          className="h-14 w-14 rounded-full object-cover ring-2 ring-primary"
                        />
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate text-sm font-semibold">{g.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {last?.created_at
                              ? new Date(last.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
                              : ""}
                            {" · "}
                            {g.items.length} {g.items.length === 1 ? "estado" : "estados"}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {others.length === 0 && !myGroup && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Ainda não há estados. Sê o primeiro a publicar!
            </p>
          )}
        </div>
      )}

      {viewer && groups && (
        <StatusViewer
          group={groups[viewer.group]}
          index={viewer.index}
          onIndexChange={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </MobileShell>
  );
}

function StatusViewer({
  group,
  index,
  onClose,
  onNext,
  onPrev,
}: {
  group: Group;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const status = group.items[index];
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const video = isVideo(status.image_url);

  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();

    if (video) {
      // Progress driven by video timeupdate
      return;
    }

    const tick = (now: number) => {
      if (!paused) {
        const elapsed = elapsedRef.current + (now - startRef.current);
        const pct = Math.min(100, (elapsed / IMAGE_DURATION_MS) * 100);
        setProgress(pct);
        if (pct >= 100) {
          onNext();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.id, paused]);

  useEffect(() => {
    if (paused) {
      elapsedRef.current += performance.now() - startRef.current;
    } else {
      startRef.current = performance.now();
    }
  }, [paused]);

  const handleVideoTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) onPrev();
    else onNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Progress bars */}
      <div className="flex gap-1 px-2 pt-2">
        {group.items.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <img
            src={group.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${group.fullName}`}
            alt={group.fullName}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <div className="text-sm font-semibold text-white">{group.fullName}</div>
            <div className="text-[11px] text-white/70">
              {status.created_at
                ? new Date(status.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
                : ""}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Media + tap zones */}
      <div
        className="relative flex-1 select-none"
        onClick={handleTap}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {video ? (
            <video
              ref={videoRef}
              src={status.image_url}
              autoPlay
              playsInline
              onTimeUpdate={handleVideoTime}
              onEnded={onNext}
              className="max-h-full max-w-full"
            />
          ) : (
            <img src={status.image_url} alt="status" className="max-h-full max-w-full object-contain" />
          )}
        </div>

        {status.caption && (
          <p className="pointer-events-none absolute bottom-6 left-4 right-4 rounded-lg bg-black/50 p-3 text-center text-sm text-white backdrop-blur">
            {status.caption}
          </p>
        )}
      </div>
    </div>
  );
}

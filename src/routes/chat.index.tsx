import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Camera, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  component: () => (
    <RequireAuth>
      <ChatList />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Mensagens — Núpublico" }] }),
});

interface Item {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_text: string | null;
  last_at: string | null;
}

function ChatList() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user_a, user_b, last_message_at")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    if (!convs) return setItems([]);

    const otherIds = convs.map((c) => (c.user_a === user.id ? c.user_b : c.user_a));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const result: Item[] = [];
    for (const c of convs) {
      const other_id = c.user_a === user.id ? c.user_b : c.user_a;
      const p = pmap.get(other_id);
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, image_url, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      result.push({
        id: c.id,
        other_id,
        other_name: p?.full_name ?? "Utilizador",
        other_avatar: p?.avatar_url ?? null,
        last_text: lastMsg?.content ?? (lastMsg?.image_url ? "📷 Imagem" : null),
        last_at: lastMsg?.created_at ?? c.last_message_at,
      });
    }
    setItems(result);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = items?.filter((i) => i.other_name.toLowerCase().includes(filter.toLowerCase())) ?? null;

  return (
    <MobileShell>
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Procurar conversas"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {filtered === null ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          Ainda sem conversas. Vai a um post e toca em <span className="font-medium text-primary">Contratar</span>.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to="/chat/$id"
                params={{ id: c.id }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/40"
              >
                <img
                  src={c.other_avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${c.other_name}`}
                  alt={c.other_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold">{c.other_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {c.last_at ? new Date(c.last_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <span className="block truncate text-xs text-muted-foreground">{c.last_text ?? "Conversa iniciada"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}

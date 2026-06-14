import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Incoming {
  id: string;
  caller_id: string;
  conversation_id: string;
  kind: "audio" | "video";
  caller_name: string | null;
  caller_avatar: string | null;
}

export function IncomingCallProvider() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (payload) => {
          const c = payload.new as {
            id: string;
            caller_id: string;
            conversation_id: string;
            kind: "audio" | "video";
            status: string;
          };
          if (c.status !== "ringing") return;
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", c.caller_id)
            .maybeSingle();
          setIncoming({
            id: c.id,
            caller_id: c.caller_id,
            conversation_id: c.conversation_id,
            kind: c.kind,
            caller_name: p?.full_name ?? "Utilizador",
            caller_avatar: p?.avatar_url ?? null,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        (payload) => {
          const c = payload.new as { id: string; status: string };
          setIncoming((prev) => (prev && prev.id === c.id && c.status !== "ringing" ? null : prev));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  if (!incoming) return null;

  const accept = () => {
    const c = incoming;
    setIncoming(null);
    navigate({
      to: "/chamada/$id",
      params: { id: c.id },
      search: { role: "callee", kind: c.kind, other: c.caller_id },
    });
  };

  const reject = async () => {
    await supabase
      .from("calls")
      .update({ status: "rejected", ended_at: new Date().toISOString() })
      .eq("id", incoming.id);
    setIncoming(null);
  };

  return (
    <div className="fixed inset-x-0 top-3 z-[10000] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top">
      <div className="relative">
        {incoming.caller_avatar ? (
          <img src={incoming.caller_avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {incoming.caller_name?.[0]?.toUpperCase() ?? "U"}
          </div>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {incoming.kind === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{incoming.caller_name}</div>
        <div className="text-xs text-muted-foreground">
          Chamada {incoming.kind === "video" ? "de vídeo" : "de voz"} a tocar…
        </div>
      </div>
      <button
        onClick={reject}
        className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white")}
        aria-label="Rejeitar"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
      <button
        onClick={accept}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white"
        aria-label="Atender"
      >
        <Phone className="h-4 w-4" />
      </button>
    </div>
  );
}

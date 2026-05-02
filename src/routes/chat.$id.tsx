import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { ArrowLeft, ImageIcon, Send, Loader2, Zap, Phone, Video, Mic } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_QUICK_REPLIES = [
  "Estou a caminho 🚗",
  "Posso atender em 30 minutos",
  "Cheguei ao local",
  "Obrigado pela preferência!",
];

export const Route = createFileRoute("/chat/$id")({
  component: () => (
    <RequireAuth>
      <Conversation />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Conversa — Núpublico" }] }),
});

type Message = Database["public"]["Tables"]["messages"]["Row"];

function Conversation() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [other, setOther] = useState<{ id: string; full_name: string | null; avatar_url: string | null; phone: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quick_replies")
      .select("content")
      .eq("user_id", user.id)
      .order("position")
      .then(({ data }) => {
        if (data && data.length > 0) setQuickReplies(data.map((r) => r.content));
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("user_a, user_b")
        .eq("id", id)
        .maybeSingle();
      if (error || !conv) {
        toast.error("Conversa não encontrada");
        navigate({ to: "/chat" });
        return;
      }
      const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a;
      const { data: p } = await supabase.from("profiles").select("id, full_name, avatar_url, phone").eq("id", otherId).maybeSingle();
      if (mounted) setOther(p);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (mounted) setMessages(msgs ?? []);
    })();

    const ch = supabase
      .channel(`conv-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...(prev ?? []), payload.new as Message]);
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [id, user, navigate]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const value = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content: value,
    });
    if (error) {
      toast.error("Falha ao enviar — tenta de novo");
      setText(value);
    }
  };

  const sendImage = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const url = await uploadToBucket("chat", user.id, file);
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.id,
        image_url: url,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col border-x border-border bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/chat" })} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other && (
          <>
            <button
              onClick={() => navigate({ to: "/perfil/$id", params: { id: other.id } })}
              className="flex flex-1 items-center gap-3 overflow-hidden text-left"
            >
              <img
                src={other.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${other.full_name ?? "U"}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold">{other.full_name ?? "Utilizador"}</div>
                <div className="text-[10px] text-muted-foreground">online</div>
              </div>
            </button>
            <a
              href={other.phone ? `tel:${other.phone}` : undefined}
              onClick={(e) => {
                if (!other.phone) {
                  e.preventDefault();
                  toast.error("Sem número público");
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Chamada de voz"
            >
              <Phone className="h-4 w-4 text-primary" />
            </a>
            <button
              onClick={() => toast.info("Videochamada em breve")}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Videochamada"
            >
              <Video className="h-4 w-4 text-primary" />
            </button>
          </>
        )}
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">Diz olá 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-foreground",
                  )}
                >
                  {m.image_url && <img src={m.image_url} alt="" className="mb-1 max-w-full rounded-xl" />}
                  {m.content && <span className="whitespace-pre-wrap">{m.content}</span>}
                  <div className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(m.created_at ?? "").toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showQuick && (
        <div className="flex flex-wrap gap-1.5 border-t border-border bg-secondary/40 px-3 py-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setText(q);
                setShowQuick(false);
              }}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background px-3 py-3">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-full p-2 hover:bg-accent">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => setShowQuick((v) => !v)}
          className={cn("rounded-full p-2 hover:bg-accent", showQuick && "text-primary")}
          aria-label="Respostas rápidas"
        >
          <Zap className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem…"
          className="flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary"
        />
        {text.trim() ? (
          <button
            type="submit"
            className="rounded-full bg-primary p-2 text-primary-foreground"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.info("Mensagem de áudio em breve")}
            className="rounded-full bg-primary p-2 text-primary-foreground"
            aria-label="Gravar áudio"
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

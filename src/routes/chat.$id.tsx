import { Img } from "@/components/sgt/Img";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import {
  ArrowLeft,
  ImageIcon,
  Send,
  Loader2,
  Zap,
  Mic,
  FileText,
  Paperclip,
  Square,
  File as FileIcon,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { ContractDialog } from "@/components/sgt/ContractDialog";
import { ContractCard } from "@/components/sgt/ContractCard";

const DEFAULT_QUICK_REPLIES = [
  "Estou a caminho 🚗",
  "Posso atender em 30 minutos",
  "Cheguei ao local",
  "Obrigado pela preferência!",
];

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export const Route = createFileRoute("/chat/$id")({
  component: () => (
    <RequireAuth>
      <Conversation />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Conversa — BB Serviços Express" }] }),
});

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Reaction = Database["public"]["Tables"]["message_reactions"]["Row"];

function Conversation() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [other, setOther] = useState<{ id: string; full_name: string | null; avatar_url: string | null; phone: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [showQuick, setShowQuick] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [contractOpen, setContractOpen] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactingFor, setReactingFor] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Audio recording
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

      const ids = (msgs ?? []).map((m) => m.id);
      if (ids.length) {
        const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", ids);
        if (mounted) setReactions(rx ?? []);
      }
    })();

    const ch = supabase
      .channel(`conv-${id}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...(prev ?? []), payload.new as Message]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          setReactions((prev) => [...prev, payload.new as Reaction]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const old = payload.old as Reaction;
          setReactions((prev) => prev.filter((r) => r.id !== old.id));
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from && payload.from !== user.id) {
          setOtherTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();
    channelRef.current = ch;

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      channelRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [id, user, navigate]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const broadcastTyping = () => {
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { from: user?.id } });
  };

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

  const sendFile = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const url = await uploadToBucket("chat", user.id, file);
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.id,
        file_url: url,
        file_name: file.name,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar ficheiro");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const seconds = recSeconds;
        setRecording(false);
        setRecSeconds(0);
        if (blob.size < 500) return;
        const fileObj = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        setBusy(true);
        try {
          const url = await uploadToBucket("chat", user.id, fileObj);
          await supabase.from("messages").insert({
            conversation_id: id,
            sender_id: user.id,
            audio_url: url,
            duration_seconds: seconds,
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio");
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = (cancel?: boolean) => {
    if (recTimer.current) clearInterval(recTimer.current);
    recTimer.current = null;
    if (cancel) {
      chunksRef.current = [];
      try {
        recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* noop */
      }
      recorderRef.current = null;
      setRecording(false);
      setRecSeconds(0);
      return;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
  };




  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setReactingFor(null);
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
              <Img
                src={other.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${other.full_name ?? "U"}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold">{other.full_name ?? "Utilizador"}</div>
                <div className="text-[10px] text-muted-foreground">
                  {otherTyping ? <span className="text-primary">a escrever…</span> : "online"}
                </div>
              </div>
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
            if (m.contract_id) {
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <ContractCard contractId={m.contract_id} compact />
                </div>
              );
            }
            const msgRx = reactions.filter((r) => r.message_id === m.id);
            const grouped = msgRx.reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div key={m.id} className={cn("group relative flex", mine ? "justify-end" : "justify-start")}>
                <div className="relative max-w-[78%]">
                  <button
                    type="button"
                    onClick={() => setReactingFor(reactingFor === m.id ? null : m.id)}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-left text-sm transition",
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-secondary text-foreground",
                    )}
                  >
                    {m.image_url && <Img src={m.image_url} alt="" className="mb-1 max-w-full rounded-xl" />}
                    {m.audio_url && (
                      <audio
                        controls
                        src={m.audio_url}
                        className="my-1 w-56 max-w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {m.file_url && (
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                          mine ? "bg-primary-foreground/15" : "bg-background/60",
                        )}
                      >
                        <FileIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{m.file_name ?? "Ficheiro"}</span>
                      </a>
                    )}
                    {m.content && <span className="whitespace-pre-wrap">{m.content}</span>}
                    <div className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {new Date(m.created_at ?? "").toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>

                  {Object.keys(grouped).length > 0 && (
                    <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
                      {Object.entries(grouped).map(([e, n]) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e)}
                          className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs"
                        >
                          <span>{e}</span>
                          <span className="text-[10px] text-muted-foreground">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {reactingFor === m.id && (
                    <div
                      className={cn(
                        "absolute z-20 flex gap-1 rounded-full border border-border bg-card px-2 py-1.5 shadow-lg",
                        mine ? "right-0 -top-10" : "left-0 -top-10",
                      )}
                    >
                      {REACTION_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e)}
                          className="text-lg transition hover:scale-125"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!mine && (
                  <button
                    type="button"
                    onClick={() => setReactingFor(reactingFor === m.id ? null : m.id)}
                    className="ml-1 self-end opacity-0 transition group-hover:opacity-100"
                    aria-label="Reagir"
                  >
                    <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
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

      {recording ? (
        <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-red-500/10 px-4 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-500">A gravar… {fmtSec(recSeconds)}</span>
          </div>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="rounded-full border border-border px-3 py-2 text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="rounded-full bg-primary p-2 text-primary-foreground"
            aria-label="Enviar áudio"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background px-3 py-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttach((v) => !v)}
              disabled={busy}
              className={cn("rounded-full p-2 hover:bg-accent", showAttach && "text-primary")}
              aria-label="Anexar"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>
            {showAttach && (
              <div className="absolute bottom-12 left-0 z-10 w-44 rounded-xl border border-border bg-card p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttach(false);
                    imgRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent"
                >
                  <ImageIcon className="h-4 w-4 text-primary" /> Imagem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttach(false);
                    fileRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent"
                >
                  <FileIcon className="h-4 w-4 text-primary" /> Ficheiro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttach(false);
                    setContractOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent"
                >
                  <FileText className="h-4 w-4 text-primary" /> Criar Contrato
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowQuick((v) => !v)}
            className={cn("rounded-full p-2 hover:bg-accent", showQuick && "text-primary")}
            aria-label="Respostas rápidas"
          >
            <Zap className="h-5 w-5" />
          </button>
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])}
          />
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])}
          />
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              broadcastTyping();
            }}
            placeholder="Mensagem…"
            className="flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary"
          />
          {text.trim() ? (
            <button type="submit" className="rounded-full bg-primary p-2 text-primary-foreground" aria-label="Enviar">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="rounded-full bg-primary p-2 text-primary-foreground"
              aria-label="Gravar áudio"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </form>
      )}
      {other && (
        <ContractDialog
          open={contractOpen}
          onOpenChange={setContractOpen}
          conversationId={id}
          otherUserId={other.id}
        />
      )}
    </div>
  );
}

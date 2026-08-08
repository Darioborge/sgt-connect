import { Img } from "@/components/sgt/Img";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chamada/$id")({
  component: () => (
    <RequireAuth>
      <CallScreen />
    </RequireAuth>
  ),
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role as "caller" | "callee") ?? "caller",
    kind: (s.kind as "audio" | "video") ?? "video",
    other: (s.other as string) ?? "",
  }),
  head: () => ({ meta: [{ title: "Chamada — Núpublico" }] }),
});

// Public STUN servers — sufficient for most peer connections
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function CallScreen() {
  const { id: callId } = Route.useParams();
  const { role, kind, other: otherId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended">(
    role === "caller" ? "ringing" : "connecting",
  );
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteName, setRemoteName] = useState<string>("");
  const [remoteAvatar, setRemoteAvatar] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);

  // Fetch remote profile for header
  useEffect(() => {
    if (!otherId) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", otherId)
      .maybeSingle()
      .then(({ data }) => {
        setRemoteName(data?.full_name ?? "Utilizador");
        setRemoteAvatar(data?.avatar_url ?? null);
      });
  }, [otherId]);

  // Duration ticker
  useEffect(() => {
    if (status !== "connected") return;
    startedAt.current = Date.now();
    const t = setInterval(() => {
      if (startedAt.current) setDuration(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const cleanup = () => {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      pcRef.current = null;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };

    (async () => {
      // Get local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: kind === "video" ? { facingMode: "user" } : false,
        });
      } catch {
        toast.error("Permissão de câmara/microfone negada");
        navigate({ to: "/chat" });
        return;
      }
      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0];
        setStatus("connected");
      };

      // Realtime signaling channel
      const chan = supabase.channel(`call-${callId}`, { config: { broadcast: { self: false } } });
      channelRef.current = chan;

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          chan.send({ type: "broadcast", event: "ice", payload: { from: user.id, candidate: ev.candidate.toJSON() } });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("ended");
        }
      };

      chan.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (role !== "callee") return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
        pendingCandidates.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chan.send({ type: "broadcast", event: "answer", payload: { from: user.id, sdp: answer } });
        await supabase.from("calls").update({ status: "accepted" }).eq("id", callId);
      });

      chan.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (role !== "caller") return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      });

      chan.on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.from === user.id) return;
        try {
          if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate);
          else pendingCandidates.current.push(payload.candidate);
        } catch (e) {
          console.warn("ICE add failed", e);
        }
      });

      chan.on("broadcast", { event: "hangup" }, () => {
        setStatus("ended");
      });

      chan.subscribe(async (s) => {
        if (s !== "SUBSCRIBED") return;
        if (role === "caller") {
          // Wait for callee to be ready, then send offer
          chan.send({ type: "broadcast", event: "ping", payload: { from: user.id } });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          chan.send({ type: "broadcast", event: "offer", payload: { from: user.id, sdp: offer } });
        } else {
          // Callee — signal readiness
          chan.send({ type: "broadcast", event: "ready", payload: { from: user.id } });
        }
      });

      // If caller, listen for "ready" and resend offer (handles late subscriptions)
      chan.on("broadcast", { event: "ready" }, async () => {
        if (role !== "caller" || !pc.localDescription) return;
        chan.send({ type: "broadcast", event: "offer", payload: { from: user.id, sdp: pc.localDescription } });
      });
    })();

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, callId, kind, role]);

  // End call on status === "ended"
  useEffect(() => {
    if (status !== "ended") return;
    supabase
      .from("calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", callId);
    const t = setTimeout(() => navigate({ to: "/chat" }), 800);
    return () => clearTimeout(t);
  }, [status, callId, navigate]);

  const hangup = () => {
    channelRef.current?.send({ type: "broadcast", event: "hangup", payload: {} });
    setStatus("ended");
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOff(!track.enabled);
    }
  };

  const flip = async () => {
    const old = localStreamRef.current?.getVideoTracks()[0];
    if (!old) return;
    const facing = old.getSettings().facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(newTrack);
      old.stop();
      localStreamRef.current?.removeTrack(old);
      localStreamRef.current?.addTrack(newTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch {
      toast.error("Não foi possível alternar a câmara");
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {/* Remote stream */}
      {kind === "video" ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary/30 to-black">
          {remoteAvatar ? (
            <Img src={remoteAvatar} alt="" className="h-32 w-32 rounded-full border-4 border-white/20 object-cover" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-4xl font-bold">
              {remoteName[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="text-2xl font-semibold">{remoteName}</div>
        </div>
      )}

      {/* Local preview (video calls only) */}
      {kind === "video" && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute right-4 top-20 z-10 h-36 w-24 rounded-2xl border-2 border-white/30 object-cover shadow-2xl"
        />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent px-5 pt-6 pb-10">
        <div className="text-center">
          {kind === "video" && <div className="text-sm opacity-80">{remoteName}</div>}
          <div className="mt-1 text-xs opacity-70">
            {status === "ringing" && "A chamar…"}
            {status === "connecting" && "A ligar…"}
            {status === "connected" && fmt(duration)}
            {status === "ended" && "Chamada terminada"}
          </div>
        </div>
      </div>

      {(status === "ringing" || status === "connecting") && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-12">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={toggleMute}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border border-white/20 backdrop-blur",
              muted ? "bg-white text-black" : "bg-white/15",
            )}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          {kind === "video" && (
            <>
              <button
                onClick={toggleCam}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border border-white/20 backdrop-blur",
                  camOff ? "bg-white text-black" : "bg-white/15",
                )}
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                onClick={flip}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            onClick={hangup}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-2xl"
            aria-label="Terminar chamada"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

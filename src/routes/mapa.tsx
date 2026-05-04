import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2, BadgeCheck, MessageCircle, User, Sparkles, Filter, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mapa")({
  component: MapaPage,
  head: () => ({
    meta: [
      { title: "Perto de ti — Núpublico" },
      { name: "description", content: "Encontra prestadores de serviços perto de ti em tempo real." },
    ],
  }),
});

interface NearbyProvider {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  category: string | null;
  verified: boolean | null;
  rating: number | null;
  price_from_kz: number | null;
  latitude: number;
  longitude: number;
  distance?: number;
}

const CATEGORIES = ["Todos", "Beleza", "Eletricista", "Canalizador", "Limpeza", "Construção", "Aulas", "Outros"];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Custom pin icon as data URL
const pinIcon = (color = "#ff385c") =>
  L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 4px 10px rgba(0,0,0,0.4);border:3px solid white;display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;border-radius:50%;background:white;transform:rotate(45deg);"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 14, { duration: 1.2 });
  }, [pos, map]);
  return null;
}

function MapaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NearbyProvider | null>(null);
  const [category, setCategory] = useState("Todos");
  const [maxDistance, setMaxDistance] = useState(25);
  const [shareLocation, setShareLocation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Default to Luanda center while we don't have user pos
  const defaultPos: [number, number] = [-8.839, 13.289];

  const requestLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocalização não suportada.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(next);
        toast.success("Localização activa.");
        // If user has location_enabled, persist it
        if (user && shareLocation) {
          supabase
            .from("profiles")
            .update({
              latitude: next[0],
              longitude: next[1],
              location_enabled: true,
              location_updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      },
      () => toast.error("Não foi possível obter a tua localização."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Initial: try silently
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // Load existing share status
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("location_enabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setShareLocation(!!data?.location_enabled));
  }, [user]);

  // Load providers
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, category, verified, rating, price_from_kz, latitude, longitude")
        .eq("location_enabled", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(200);
      setProviders((data ?? []) as NearbyProvider[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("map-providers")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const origin = userPos ?? defaultPos;
    return providers
      .map((p) => ({ ...p, distance: haversineKm(origin[0], origin[1], p.latitude, p.longitude) }))
      .filter((p) => p.distance! <= maxDistance)
      .filter((p) => category === "Todos" || (p.category ?? "").toLowerCase().includes(category.toLowerCase()))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [providers, userPos, maxDistance, category]);

  const toggleShare = async (next: boolean) => {
    if (!user) return toast.error("Inicia sessão primeiro.");
    setShareLocation(next);
    if (next && !userPos) requestLocation();
    await supabase
      .from("profiles")
      .update({
        location_enabled: next,
        ...(userPos ? { latitude: userPos[0], longitude: userPos[1], location_updated_at: new Date().toISOString() } : {}),
      })
      .eq("id", user.id);
    toast.success(next ? "Apareces no mapa." : "Já não apareces no mapa.");
  };

  const contact = async (p: NearbyProvider) => {
    if (!user) return toast.error("Inicia sessão.");
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: p.id });
    if (error) return toast.error(error.message);
    navigate({ to: "/chat/$id", params: { id: data as string } });
  };

  return (
    <MobileShell hideTopBar>
      <div className="relative h-[calc(100vh-100px)]">
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-[1000] flex items-center gap-2 bg-gradient-to-b from-background to-transparent px-3 pt-3 pb-6">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-card/95 px-3 py-2 shadow-md backdrop-blur">
            <MapPin className="h-4 w-4 text-primary" />
            <div className="flex-1 text-xs">
              <div className="font-semibold">Perto de ti</div>
              <div className="text-[10px] text-muted-foreground">{filtered.length} prestadores · {maxDistance} km</div>
            </div>
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card/95 shadow-md backdrop-blur"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={requestLocation}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>

        {/* Filters drawer */}
        {showFilters && (
          <div className="absolute inset-x-3 top-16 z-[1000] rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Categoria</div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px]",
                    category === c ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold uppercase text-muted-foreground">Distância máx</span>
              <span className="font-semibold text-primary">{maxDistance} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <button
              onClick={() => toggleShare(!shareLocation)}
              className={cn(
                "mt-3 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-xs",
                shareLocation && "border-primary bg-primary/10 text-primary",
              )}
            >
              <span>Aparecer no mapa para outros</span>
              <span className={cn("h-4 w-7 rounded-full p-0.5", shareLocation ? "bg-primary" : "bg-muted")}>
                <span className={cn("block h-3 w-3 rounded-full bg-white transition", shareLocation && "translate-x-3")} />
              </span>
            </button>
          </div>
        )}

        {/* Map */}
        <MapContainer
          center={userPos ?? defaultPos}
          zoom={13}
          className="h-full w-full"
          style={{ background: "#1a1a1a" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FlyTo pos={userPos} />
          {userPos && (
            <Marker
              position={userPos}
              icon={userIcon}
              eventHandlers={{
                click: () => {
                  if (!user) return toast.error("Inicia sessão");
                  if (!shareLocation) toggleShare(true);
                  navigate({ to: "/perfil" });
                },
              }}
            />
          )}
          {filtered.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={pinIcon(p.verified ? "#22c55e" : "#ff385c")}
              eventHandlers={{
                click: () => navigate({ to: "/perfil/$id", params: { id: p.id } }),
              }}
            />
          ))}
        </MapContainer>

        {/* Loading */}
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Mini profile sheet */}
        {selected && (
          <div className="absolute inset-x-3 bottom-3 z-[1000] rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              {selected.avatar_url ? (
                <img src={selected.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {(selected.full_name || selected.username || "U")[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate font-semibold">{selected.full_name || selected.username}</span>
                  {selected.verified && <BadgeCheck className="h-4 w-4 fill-green-500 text-white" />}
                </div>
                <div className="text-xs text-muted-foreground">@{selected.username}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                  {selected.category && (
                    <span className="rounded-full bg-secondary px-2 py-0.5">{selected.category}</span>
                  )}
                  {typeof selected.distance === "number" && (
                    <span className="text-primary">{selected.distance.toFixed(1)} km</span>
                  )}
                  {selected.price_from_kz && (
                    <span className="text-muted-foreground">desde {selected.price_from_kz} Kz</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground">
                ✕
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={() => contact(selected)}
                className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Contactar
              </button>
              <button
                onClick={() => navigate({ to: "/perfil/$id", params: { id: selected.id } })}
                className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-semibold"
              >
                <User className="h-3.5 w-3.5" /> Perfil
              </button>
              <button
                onClick={() =>
                  navigate({
                    to: "/criar-post",
                    search: { hint: `Serviço de ${selected.category ?? selected.full_name}` },
                  })
                }
                className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" /> Post
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

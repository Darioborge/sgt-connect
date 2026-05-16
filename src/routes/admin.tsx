import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import {
  Loader2, Users, FileText, MessageSquare, DollarSign, MapPin, LogOut,
  ShieldCheck, TrendingUp, CheckCircle2, XCircle, Search, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin — Núpublico" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Tab = "overview" | "users" | "map" | "posts" | "payments" | "contracts";

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb55"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { toast.error("Acesso restrito"); navigate({ to: "/" }); return; }
      setIsAdmin(true);
    })();
  }, [user, loading, navigate]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">Núpublico Admin</div>
              <div className="text-[10px] text-muted-foreground">Painel de controlo</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent">App</Link>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {([
            ["overview", "Visão geral", TrendingUp],
            ["users", "Utilizadores", Users],
            ["map", "Mapa", MapPin],
            ["posts", "Posts", FileText],
            ["payments", "Pagamentos", DollarSign],
            ["contracts", "Contratos", MessageSquare],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "overview" && <Overview />}
        {tab === "users" && <UsersTab />}
        {tab === "map" && <MapTab />}
        {tab === "posts" && <PostsTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "contracts" && <ContractsTab />}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<{ users: number; providers: number; verified: number; posts: number; smart: number; convs: number; bookings: number; pendingPay: number; revenue: number; contracts: number } | null>(null);

  useEffect(() => {
    (async () => {
      const r = async (q: ReturnType<typeof supabase.from>) => {
        const { count } = await (q as { select: (s: string, o: object) => Promise<{ count: number | null }> }).select("*", { count: "exact", head: true });
        return count ?? 0;
      };
      const [users, providers, verified, posts, smart, convs, bookings, pendingPay, contracts] = await Promise.all([
        r(supabase.from("profiles")),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("mode", "prestador").then(({ count }) => count ?? 0),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verified", true).then(({ count }) => count ?? 0),
        r(supabase.from("posts")),
        r(supabase.from("smart_posts")),
        r(supabase.from("conversations")),
        r(supabase.from("bookings")),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pendente").then(({ count }) => count ?? 0),
        r(supabase.from("service_contracts")),
      ]);
      const { data: pays } = await supabase.from("payments").select("amount_kz").eq("status", "confirmado");
      const revenue = (pays ?? []).reduce((s, p) => s + (p.amount_kz ?? 0), 0);
      setStats({ users, providers, verified, posts, smart, convs, bookings, pendingPay, revenue, contracts });
    })();
  }, []);

  if (!stats) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Utilizadores" value={stats.users} />
        <StatCard icon={ShieldCheck} label="Prestadores" value={stats.providers} hint={`${stats.verified} verificados`} />
        <StatCard icon={FileText} label="Posts" value={stats.posts + stats.smart} hint={`${stats.smart} smart`} />
        <StatCard icon={MessageSquare} label="Conversas" value={stats.convs} />
        <StatCard icon={DollarSign} label="Receita confirmada" value={`${stats.revenue.toLocaleString()} Kz`} />
        <StatCard icon={DollarSign} label="Pagamentos pendentes" value={stats.pendingPay} />
        <StatCard icon={MessageSquare} label="Contratos" value={stats.contracts} />
        <StatCard icon={TrendingUp} label="Agendamentos" value={stats.bookings} />
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        Painel restrito. Todas as ações ficam registadas. Use o separador <b>Pagamentos</b> para confirmar manualmente pagamentos pendentes.
      </div>
    </div>
  );
}

type Prof = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; phone: string | null; city: string | null; category: string | null; mode: string; verified: boolean | null; created_at: string | null; latitude: number | null; longitude: number | null; location_enabled: boolean };

function UsersTab() {
  const [users, setUsers] = useState<Prof[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    setUsers((data ?? []) as Prof[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return users;
    return users.filter(u => [u.full_name, u.username, u.phone, u.city, u.category].some(v => v?.toLowerCase().includes(s)));
  }, [users, q]);

  const toggleVerified = async (u: Prof) => {
    const { error } = await supabase.from("profiles").update({ verified: !u.verified }).eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success("Atualizado"); load(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar nome, telefone, cidade…"
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} / {users.length}</div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Utilizador</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Cidade</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Verificado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></td></tr>}
            {!loading && filtered.map(u => (
              <tr key={u.id} className="border-b border-border/40 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                      {u.avatar_url && <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-medium">{u.full_name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">@{u.username ?? "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 capitalize">{u.mode}</td>
                <td className="px-3 py-2">{u.category ?? "—"}</td>
                <td className="px-3 py-2">{u.city ?? "—"}</td>
                <td className="px-3 py-2">{u.phone ?? "—"}</td>
                <td className="px-3 py-2">
                  {u.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => toggleVerified(u)} className="rounded-md border border-border px-2 py-1 text-[10px] hover:bg-accent">
                    {u.verified ? "Remover ✓" : "Verificar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MapTab() {
  const [pts, setPts] = useState<Prof[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("*")
        .not("latitude", "is", null).not("longitude", "is", null)
        .limit(1000);
      setPts((data ?? []) as Prof[]);
    })();
  }, []);

  const center: [number, number] = pts.length
    ? [pts[0].latitude as number, pts[0].longitude as number]
    : [-8.839, 13.289]; // Luanda

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Localização dos utilizadores ({pts.length})</h2>
        <div className="text-[10px] text-muted-foreground">Pontos azuis = perfis com localização ativa</div>
      </div>
      <div className="h-[70vh] overflow-hidden rounded-2xl border border-border">
        <MapContainer center={center} zoom={pts.length ? 11 : 6} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {pts.map(u => (
            <Marker key={u.id} position={[u.latitude as number, u.longitude as number]} icon={userIcon}>
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{u.full_name ?? "Utilizador"}</div>
                  <div className="text-muted-foreground">@{u.username} · {u.mode}</div>
                  {u.category && <div>{u.category}</div>}
                  {u.city && <div>📍 {u.city}</div>}
                  {u.phone && <div>📞 {u.phone}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState<Array<{ id: string; caption: string | null; image_url: string; created_at: string | null; user_id: string }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200);
      setPosts(data ?? []);
    })();
  }, []);
  const del = async (id: string) => {
    if (!confirm("Eliminar este post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); setPosts(p => p.filter(x => x.id !== id)); }
  };
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {posts.map(p => (
        <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
          <div className="p-2">
            <p className="line-clamp-2 text-[11px]">{p.caption ?? "—"}</p>
            <button onClick={() => del(p.id)} className="mt-1 flex items-center gap-1 text-[10px] text-destructive hover:underline">
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab() {
  const [items, setItems] = useState<Array<{ id: string; user_id: string; amount_kz: number; kind: string; method: string; status: string; reference: string | null; created_at: string }>>([]);
  const load = async () => {
    const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const confirm = async (id: string) => {
    const { error } = await supabase.rpc("confirm_payment", { _payment_id: id });
    if (error) toast.error(error.message); else { toast.success("Confirmado"); load(); }
  };
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Método</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Ref.</th>
            <th className="px-3 py-2">Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id} className="border-b border-border/40">
              <td className="px-3 py-2">{new Date(p.created_at).toLocaleString("pt-PT")}</td>
              <td className="px-3 py-2">{p.kind}</td>
              <td className="px-3 py-2">{p.method}</td>
              <td className="px-3 py-2">{p.amount_kz.toLocaleString()} Kz</td>
              <td className="px-3 py-2 font-mono text-[10px]">{p.reference ?? "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${p.status === "confirmado" ? "bg-emerald-500/15 text-emerald-500" : p.status === "pendente" ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"}`}>
                  {p.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {p.status === "pendente" && (
                  <button onClick={() => confirm(p.id)} className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">
                    Confirmar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContractsTab() {
  const [items, setItems] = useState<Array<{ id: string; number: string; service_title: string; amount_kz: number; status: string; created_at: string; provider_name: string | null; client_name: string | null }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("service_contracts").select("id,number,service_title,amount_kz,status,created_at,provider_name,client_name").order("created_at", { ascending: false }).limit(200);
      setItems(data ?? []);
    })();
  }, []);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2">Número</th>
            <th className="px-3 py-2">Serviço</th>
            <th className="px-3 py-2">Prestador → Cliente</th>
            <th className="px-3 py-2">Valor</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {items.map(c => (
            <tr key={c.id} className="border-b border-border/40">
              <td className="px-3 py-2 font-mono">{c.number}</td>
              <td className="px-3 py-2">{c.service_title}</td>
              <td className="px-3 py-2">{c.provider_name ?? "—"} → {c.client_name ?? "—"}</td>
              <td className="px-3 py-2">{c.amount_kz.toLocaleString()} Kz</td>
              <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{c.status}</span></td>
              <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString("pt-PT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

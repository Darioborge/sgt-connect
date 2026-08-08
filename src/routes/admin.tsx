import { Img } from "@/components/sgt/Img";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/sgt/AuthProvider";
import {
  Loader2, Users, FileText, MessageSquare, DollarSign, MapPin, LogOut,
  ShieldCheck, TrendingUp, CheckCircle2, XCircle, Search, Trash2, Plus,
  Upload, X, Mail, Phone, Calendar, Tag, Star, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin — BB Serviços Express" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Tab = "overview" | "users" | "map" | "posts" | "payments" | "contracts";

const blueIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb55"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const redIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 0 0 2px #dc262655"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
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
              <div className="text-sm font-bold">BB Serviços Express Admin</div>
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
        {tab === "posts" && <PostsTab adminId={user!.id} />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "contracts" && <ContractsTab />}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "primary" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string; tone?: "primary" | "emerald" | "amber" | "rose" }) {
  const tones = {
    primary: "from-primary/15 to-primary/5 text-primary",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-500",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-500",
  }[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${tones} p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function Overview() {
  const [stats, setStats] = useState<{ users: number; providers: number; verified: number; posts: number; smart: number; convs: number; bookings: number; pendingPay: number; revenue: number; contracts: number } | null>(null);
  const [growth, setGrowth] = useState<Array<{ day: string; users: number; posts: number }>>([]);
  const [byCategory, setByCategory] = useState<Array<{ name: string; value: number }>>([]);
  const [byCity, setByCity] = useState<Array<{ city: string; total: number }>>([]);
  const [revenueByDay, setRevenueByDay] = useState<Array<{ day: string; kz: number }>>([]);

  useEffect(() => {
    (async () => {
      const count = async (table: "profiles" | "posts" | "smart_posts" | "conversations" | "bookings" | "service_contracts") => {
        const { count: c } = await supabase.from(table).select("*", { count: "exact", head: true });
        return c ?? 0;
      };
      const [users, posts, smart, convs, bookings, contracts] = await Promise.all([
        count("profiles"), count("posts"), count("smart_posts"),
        count("conversations"), count("bookings"), count("service_contracts"),
      ]);
      const { count: providers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("mode", "prestador");
      const { count: verified } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verified", true);
      const { count: pendingPay } = await supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pendente");
      const { data: pays } = await supabase.from("payments").select("amount_kz, confirmed_at, status, created_at").eq("status", "confirmado");
      const revenue = (pays ?? []).reduce((s, p) => s + (p.amount_kz ?? 0), 0);
      setStats({ users, providers: providers ?? 0, verified: verified ?? 0, posts, smart, convs, bookings, pendingPay: pendingPay ?? 0, revenue, contracts });

      // last 14 days growth
      const days: Array<{ day: string; users: number; posts: number }> = [];
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const since = new Date(today); since.setDate(today.getDate() - 13);
      const [{ data: profs }, { data: postRows }] = await Promise.all([
        supabase.from("profiles").select("created_at, category, city").gte("created_at", since.toISOString()),
        supabase.from("posts").select("created_at").gte("created_at", since.toISOString()),
      ]);
      for (let i = 0; i < 14; i++) {
        const d = new Date(since); d.setDate(since.getDate() + i);
        const key = fmt(d);
        days.push({
          day: key.slice(5),
          users: (profs ?? []).filter(p => p.created_at?.slice(0, 10) === key).length,
          posts: (postRows ?? []).filter(p => p.created_at?.slice(0, 10) === key).length,
        });
      }
      setGrowth(days);

      // categories pie
      const { data: allProfs } = await supabase.from("profiles").select("category, city");
      const catMap: Record<string, number> = {};
      const cityMap: Record<string, number> = {};
      (allProfs ?? []).forEach(p => {
        const c = p.category ?? "Sem categoria";
        catMap[c] = (catMap[c] ?? 0) + 1;
        const city = p.city ?? "—";
        cityMap[city] = (cityMap[city] ?? 0) + 1;
      });
      setByCategory(Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })));
      setByCity(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([city, total]) => ({ city, total })));

      // revenue by day
      const revMap: Record<string, number> = {};
      (pays ?? []).forEach(p => {
        const d = (p.confirmed_at ?? p.created_at)?.slice(0, 10);
        if (d) revMap[d] = (revMap[d] ?? 0) + (p.amount_kz ?? 0);
      });
      const revDays: Array<{ day: string; kz: number }> = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(since); d.setDate(since.getDate() + i);
        const k = fmt(d);
        revDays.push({ day: k.slice(5), kz: revMap[k] ?? 0 });
      }
      setRevenueByDay(revDays);
    })();
  }, []);

  if (!stats) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Utilizadores" value={stats.users} tone="primary" />
        <StatCard icon={ShieldCheck} label="Prestadores" value={stats.providers} hint={`${stats.verified} verificados`} tone="emerald" />
        <StatCard icon={FileText} label="Posts" value={stats.posts + stats.smart} hint={`${stats.smart} smart`} tone="primary" />
        <StatCard icon={MessageSquare} label="Conversas" value={stats.convs} tone="primary" />
        <StatCard icon={DollarSign} label="Receita" value={`${stats.revenue.toLocaleString()} Kz`} tone="emerald" />
        <StatCard icon={DollarSign} label="Pagamentos pendentes" value={stats.pendingPay} tone="amber" />
        <StatCard icon={MessageSquare} label="Contratos" value={stats.contracts} tone="primary" />
        <StatCard icon={TrendingUp} label="Agendamentos" value={stats.bookings} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Crescimento (14 dias)</h3>
            <span className="text-[10px] text-muted-foreground">Utilizadores e Posts</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="gUsers" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPosts" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="users" name="Utilizadores" stroke="#2563eb" fill="url(#gUsers)" strokeWidth={2} />
                <Area type="monotone" dataKey="posts" name="Posts" stroke="#10b981" fill="url(#gPosts)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Receita diária (Kz)</h3>
            <span className="text-[10px] text-muted-foreground">Últimos 14 dias</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toLocaleString()} Kz`, "Receita"]} />
                <Bar dataKey="kz" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Top categorias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Utilizadores por cidade</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

type Prof = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; cover_url: string | null; bio: string | null; phone: string | null; city: string | null; category: string | null; mode: string; verified: boolean | null; available: boolean | null; rating: number | null; jobs_done: number | null; price_from_kz: number | null; created_at: string | null; latitude: number | null; longitude: number | null; location_enabled: boolean };

function UsersTab() {
  const [users, setUsers] = useState<Prof[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "prestador" | "cliente" | "verified" | "unverified">("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prof | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    setUsers((data ?? []) as Prof[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return users.filter(u => {
      if (filter === "prestador" && u.mode !== "prestador") return false;
      if (filter === "cliente" && u.mode !== "cliente") return false;
      if (filter === "verified" && !u.verified) return false;
      if (filter === "unverified" && u.verified) return false;
      if (!s) return true;
      return [u.full_name, u.username, u.phone, u.city, u.category].some(v => v?.toLowerCase().includes(s));
    });
  }, [users, q, filter]);

  const toggleVerified = async (u: Prof) => {
    const { error } = await supabase.from("profiles").update({ verified: !u.verified }).eq("id", u.id);
    if (error) toast.error(error.message); else { toast.success("Atualizado"); load(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar nome, telefone, cidade…"
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "prestador", "cliente", "verified", "unverified"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize transition ${filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent"}`}>
              {f === "all" ? "Todos" : f === "unverified" ? "Não verif." : f}
            </button>
          ))}
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
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Trabalhos</th>
              <th className="px-3 py-2">Localização</th>
              <th className="px-3 py-2">Verif.</th>
              <th className="px-3 py-2">Registo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={11} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></td></tr>}
            {!loading && filtered.map(u => (
              <tr key={u.id} className="cursor-pointer border-b border-border/40 hover:bg-muted/30" onClick={() => setSelected(u)}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                      {u.avatar_url && <Img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
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
                <td className="px-3 py-2">{u.rating != null ? `${Number(u.rating).toFixed(1)}★` : "—"}</td>
                <td className="px-3 py-2">{u.jobs_done ?? 0}</td>
                <td className="px-3 py-2">
                  {u.location_enabled ? <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-500">Ativa</span> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  {u.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                </td>
                <td className="px-3 py-2 text-[10px] text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("pt-PT") : "—"}</td>
                <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleVerified(u)} className="rounded-md border border-border px-2 py-1 text-[10px] hover:bg-accent">
                    {u.verified ? "Remover ✓" : "Verificar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <UserDetailsModal user={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}

function UserDetailsModal({ user, onClose, onUpdate }: { user: Prof; onClose: () => void; onUpdate: () => void }) {
  const [extra, setExtra] = useState<{ posts: number; smart: number; bookings: number; payments: number; revenue: number } | null>(null);
  useEffect(() => {
    (async () => {
      const [{ count: posts }, { count: smart }, { count: bookings }, { data: pays }] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("smart_posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("bookings").select("*", { count: "exact", head: true }).or(`client_id.eq.${user.id},provider_id.eq.${user.id}`),
        supabase.from("payments").select("amount_kz,status").eq("user_id", user.id),
      ]);
      const revenue = (pays ?? []).filter(p => p.status === "confirmado").reduce((s, p) => s + (p.amount_kz ?? 0), 0);
      setExtra({ posts: posts ?? 0, smart: smart ?? 0, bookings: bookings ?? 0, payments: pays?.length ?? 0, revenue });
    })();
  }, [user.id]);

  const toggle = async (field: "verified" | "available") => {
    const patch = field === "verified" ? { verified: !user.verified } : { available: !user.available };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Atualizado"); onUpdate(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card" onClick={e => e.stopPropagation()}>
        <div className="relative h-32 bg-gradient-to-br from-primary/30 to-primary/10">
          {user.cover_url && <Img src={user.cover_url} alt="" className="h-full w-full object-cover" />}
          <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 hover:bg-background"><X className="h-4 w-4" /></button>
        </div>
        <div className="-mt-10 px-5 pb-5">
          <div className="flex items-end gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-card bg-muted">
              {user.avatar_url && <Img src={user.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{user.full_name ?? "—"}</h2>
                {user.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              <div className="text-xs text-muted-foreground">@{user.username ?? "—"}</div>
            </div>
          </div>

          {user.bio && <p className="mt-3 text-sm text-muted-foreground">{user.bio}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
            <InfoRow icon={Tag} label="Modo" value={user.mode} />
            <InfoRow icon={Briefcase} label="Categoria" value={user.category ?? "—"} />
            <InfoRow icon={MapPin} label="Cidade" value={user.city ?? "—"} />
            <InfoRow icon={Phone} label="Telefone" value={user.phone ?? "—"} />
            <InfoRow icon={Star} label="Rating" value={user.rating != null ? `${Number(user.rating).toFixed(1)} ★` : "—"} />
            <InfoRow icon={Briefcase} label="Trabalhos" value={String(user.jobs_done ?? 0)} />
            <InfoRow icon={DollarSign} label="Preço base" value={user.price_from_kz ? `${user.price_from_kz.toLocaleString()} Kz` : "—"} />
            <InfoRow icon={Calendar} label="Registado" value={user.created_at ? new Date(user.created_at).toLocaleDateString("pt-PT") : "—"} />
            <InfoRow icon={MapPin} label="Coordenadas" value={user.latitude && user.longitude ? `${user.latitude.toFixed(3)}, ${user.longitude.toFixed(3)}` : "—"} />
            <InfoRow icon={Mail} label="ID" value={user.id.slice(0, 8) + "…"} />
          </div>

          {extra && (
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
              <MiniStat label="Posts" value={extra.posts} />
              <MiniStat label="Smart posts" value={extra.smart} />
              <MiniStat label="Agendamentos" value={extra.bookings} />
              <MiniStat label="Pagamentos" value={extra.payments} />
              <MiniStat label="Receita" value={`${extra.revenue.toLocaleString()} Kz`} />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => toggle("verified")} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
              {user.verified ? "Remover verificação" : "Verificar utilizador"}
            </button>
            <button onClick={() => toggle("available")} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent">
              {user.available ? "Marcar indisponível" : "Marcar disponível"}
            </button>
            <Link to="/perfil/$id" params={{ id: user.id }} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent">
              Ver perfil público
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
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
    : [-8.839, 13.289];

  const verifiedCount = pts.filter(p => p.verified).length;
  const unverifiedCount = pts.length - verifiedCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Localização dos utilizadores ({pts.length})</h2>
        <div className="flex gap-3 text-[11px]">
          <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#2563eb] ring-2 ring-[#2563eb]/30" /> Cadastrado/verificado ({verifiedCount})</div>
          <div className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#dc2626] ring-2 ring-[#dc2626]/30" /> Desqualificado ({unverifiedCount})</div>
        </div>
      </div>
      <div className="h-[70vh] overflow-hidden rounded-2xl border border-border">
        <MapContainer center={center} zoom={pts.length ? 11 : 6} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {pts.map(u => (
            <Marker key={u.id} position={[u.latitude as number, u.longitude as number]} icon={u.verified ? blueIcon : redIcon}>
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{u.full_name ?? "Utilizador"}</div>
                  <div className="text-muted-foreground">@{u.username} · {u.mode}</div>
                  {u.category && <div>{u.category}</div>}
                  {u.city && <div>📍 {u.city}</div>}
                  {u.phone && <div>📞 {u.phone}</div>}
                  <div className={u.verified ? "text-emerald-600" : "text-rose-600"}>
                    {u.verified ? "✓ Verificado" : "✗ Desqualificado"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function PostsTab({ adminId }: { adminId: string }) {
  const [posts, setPosts] = useState<Array<{ id: string; caption: string | null; image_url: string; created_at: string | null; user_id: string }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200);
    setPosts(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Eliminar este post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); setPosts(p => p.filter(x => x.id !== id)); }
  };

  const submit = async () => {
    if (!file) { toast.error("Escolhe uma imagem"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${adminId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);
      const { error } = await supabase.from("posts").insert({ user_id: adminId, image_url: pub.publicUrl, caption: caption || null });
      if (error) throw error;
      toast.success("Post publicado");
      setShowAdd(false); setCaption(""); setFile(null);
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Posts ({posts.length})</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> Adicionar post
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {posts.map(p => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <Img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
            <div className="p-2">
              <p className="line-clamp-2 text-[11px]">{p.caption ?? "—"}</p>
              <button onClick={() => del(p.id)} className="mt-1 flex items-center gap-1 text-[10px] text-destructive hover:underline">
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Novo post</h3>
              <button onClick={() => !busy && setShowAdd(false)}><X className="h-4 w-4" /></button>
            </div>
            <label className="flex h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border hover:bg-accent">
              {file ? (
                <Img src={URL.createObjectURL(file)} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  <Upload className="mx-auto h-6 w-6" />
                  <div className="mt-1">Carregar imagem</div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <textarea
              value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Legenda (opcional)" rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-2 text-sm outline-none focus:border-primary"
            />
            <button disabled={busy} onClick={submit} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Publicar"}
            </button>
          </div>
        </div>
      )}
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/sgt/MobileShell";
import { RequireAuth } from "@/components/sgt/RequireAuth";
import { useAuth } from "@/components/sgt/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/components/sgt/data";
import { useTheme } from "@/components/sgt/ThemeProvider";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Configurações — Núpublico" }] }),
});

function Settings() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Luanda");
  const [category, setCategory] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setPhone(profile.phone ?? "");
    setCity(profile.city ?? "Luanda");
    setCategory(profile.category ?? "");
    setPriceFrom(profile.price_from_kz ? String(profile.price_from_kz) : "");
    setAvailable(profile.available ?? true);
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username || null,
          bio: bio || null,
          phone: phone || null,
          city,
          category: category || null,
          price_from_kz: priceFrom ? Number(priceFrom) : null,
          available,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Perfil atualizado");
      navigate({ to: "/perfil" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell hideTopBar>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-3 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/perfil" })} className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Editar perfil</h1>
      </header>

      <form onSubmit={save} className="space-y-3 px-4 py-4 pb-8">
        <Field label="Nome completo">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Username">
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className={inputCls} />
        </Field>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="Telefone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+244 ..." />
        </Field>
        <Field label="Cidade">
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Categoria de serviço">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">— nenhuma —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.label}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preço a partir de (Kz)">
          <input
            inputMode="numeric"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value.replace(/[^0-9]/g, ""))}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm">Disponibilidade ativa</span>
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="h-5 w-9 appearance-none rounded-full bg-secondary transition checked:bg-primary"
          />
        </label>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Tema da aplicação</span>
            <span className="text-xs text-muted-foreground capitalize">{theme === "dark" ? "Escuro" : "Claro"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-4 w-4" /> Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-4 w-4" /> Escuro
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar alterações
        </button>
      </form>
    </MobileShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

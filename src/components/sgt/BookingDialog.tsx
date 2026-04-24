import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, X, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import { createBooking, previewCoupon } from "@/lib/booking";
import { useAuth } from "@/components/sgt/AuthProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  provider: {
    id: string;
    full_name: string | null;
    category: string | null;
    price_from_kz: number | null;
  };
}

const fmtKz = (n: number) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(n) + " Kz";

function defaultDateTime() {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingDialog({ open, onClose, provider }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [when, setWhen] = useState(defaultDateTime());
  const [duration, setDuration] = useState(60);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(provider.price_from_kz ?? 5000);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPrice(provider.price_from_kz ?? 5000);
      setDiscount(0);
      setCoupon("");
      setCouponMsg(null);
    }
  }, [open, provider.price_from_kz]);

  const total = useMemo(() => Math.max(price - discount, 0), [price, discount]);

  const validateCoupon = async () => {
    if (!coupon.trim()) return;
    const r = await previewCoupon(coupon, price);
    if (!r) return;
    setCouponMsg(r.message);
    setDiscount(r.coupon_id ? r.discount_kz : 0);
    if (r.coupon_id) toast.success(`Cupão aplicado: -${fmtKz(r.discount_kz)}`);
    else toast.error(r.message);
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const booking = await createBooking(user.id, {
        providerId: provider.id,
        category: provider.category,
        description: description || null,
        scheduledAt: new Date(when).toISOString(),
        durationMin: duration,
        address: address || null,
        priceKz: price,
        couponCode: discount > 0 ? coupon : null,
      });
      toast.success("Agendamento criado");
      onClose();
      if (booking) navigate({ to: "/agendamentos" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar agendamento");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Agendar serviço</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          com <strong>{provider.full_name ?? "Prestador"}</strong>
          {provider.category ? ` • ${provider.category}` : ""}
        </p>

        <div className="space-y-3">
          <Field label="Data e hora">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração (min)">
              <input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 60)}
                className={inputCls}
              />
            </Field>
            <Field label="Preço (Kz)">
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Endereço">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, bairro, referência…"
              className={inputCls}
            />
          </Field>
          <Field label="Descrição do serviço">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalhes do que precisas"
              className={inputCls}
            />
          </Field>

          <div className="rounded-xl border border-border bg-card p-3">
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> Cupão de desconto
            </label>
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Ex: BEMVINDO10"
                className={inputCls}
              />
              <button
                type="button"
                onClick={validateCoupon}
                className="rounded-xl border border-border bg-secondary px-3 text-xs font-semibold hover:bg-accent"
              >
                Aplicar
              </button>
            </div>
            {couponMsg && (
              <p className={`mt-1 text-[11px] ${discount > 0 ? "text-primary" : "text-destructive"}`}>{couponMsg}</p>
            )}
          </div>

          <div className="rounded-xl bg-secondary p-3 text-sm">
            <Row k="Subtotal" v={fmtKz(price)} />
            {discount > 0 && <Row k="Desconto" v={`- ${fmtKz(discount)}`} />}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="text-primary">{fmtKz(total)}</span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy || !when}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

export interface CouponResult {
  coupon_id: string | null;
  discount_kz: number;
  total_kz: number;
  message: string;
}

export async function previewCoupon(code: string, amount: number): Promise<CouponResult | null> {
  if (!code.trim()) return null;
  const { data, error } = await supabase.rpc("apply_coupon", {
    _code: code.trim().toUpperCase(),
    _amount: amount,
  });
  if (error) {
    console.error("apply_coupon", error);
    return { coupon_id: null, discount_kz: 0, total_kz: amount, message: "Erro ao validar" };
  }
  const row = Array.isArray(data) ? data[0] : (data as CouponResult | null);
  return row ?? null;
}

export interface CreateBookingInput {
  providerId: string;
  category?: string | null;
  description?: string | null;
  scheduledAt: string;
  durationMin?: number;
  address?: string | null;
  priceKz: number;
  couponCode?: string | null;
}

export async function createBooking(clientId: string, input: CreateBookingInput) {
  let discount = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const preview = await previewCoupon(input.couponCode, input.priceKz);
    if (preview && preview.coupon_id) {
      discount = preview.discount_kz;
      couponId = preview.coupon_id;
    }
  }
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      provider_id: input.providerId,
      category: input.category ?? null,
      description: input.description ?? null,
      scheduled_at: input.scheduledAt,
      duration_min: input.durationMin ?? 60,
      address: input.address ?? null,
      price_kz: input.priceKz,
      discount_kz: discount,
      coupon_code: couponId ? input.couponCode!.toUpperCase() : null,
    })
    .select()
    .single();
  if (error) throw error;
  if (couponId && data) {
    await supabase.from("coupon_redemptions").insert({
      coupon_id: couponId,
      user_id: clientId,
      booking_id: data.id,
    });
  }
  return data;
}

export async function setBookingStatus(
  bookingId: string,
  status: "confirmado" | "recusado" | "cancelado" | "em_curso",
) {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
  if (error) throw error;
}

export async function concludeBooking(bookingId: string): Promise<string> {
  const { data, error } = await supabase.rpc("conclude_booking", { _booking_id: bookingId });
  if (error) throw error;
  return data as string;
}

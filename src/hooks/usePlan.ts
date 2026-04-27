import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlanState {
  tier: "gratuito" | "premium";
  expiresAt: string | null;
  isPremiumActive: boolean;
  credits: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePlan(userId: string | null | undefined): PlanState {
  const [tier, setTier] = useState<"gratuito" | "premium">("gratuito");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [sub, cr] = await Promise.all([
      supabase.from("subscriptions").select("tier, expires_at").eq("user_id", userId).maybeSingle(),
      supabase.from("ai_credits").select("balance").eq("user_id", userId).maybeSingle(),
    ]);
    setTier((sub.data?.tier as "gratuito" | "premium") ?? "gratuito");
    setExpiresAt(sub.data?.expires_at ?? null);
    setCredits(cr.data?.balance ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isPremiumActive =
    tier === "premium" && (!expiresAt || new Date(expiresAt).getTime() > Date.now());

  return { tier, expiresAt, isPremiumActive, credits, loading, refresh: load };
}

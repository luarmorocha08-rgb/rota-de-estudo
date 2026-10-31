import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  name: string | null;
  trial_ends_at: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

const PAID = new Set(["active", "trialing", "past_due"]);

export function accessInfo(p: Profile | null) {
  if (!p) return { allowed: false, subscribed: false, trial: false, daysLeft: 0 };
  const subscribed = !!p.subscription_status && PAID.has(p.subscription_status);
  const msLeft = new Date(p.trial_ends_at).getTime() - Date.now();
  const trial = msLeft > 0;
  return { allowed: subscribed || trial, subscribed, trial, daysLeft: Math.max(0, Math.ceil(msLeft / 86_400_000)) };
}

/** Usuário logado + perfil. Retorna null se não houver sessão. */
export async function getUserAndProfile(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { user, profile: profile ?? null };
}

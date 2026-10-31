import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accessInfo, getUserAndProfile } from "@/lib/access";
import { AIError } from "@/lib/claude";
import { logError } from "@/lib/log";
import type { SupabaseClient } from "@supabase/supabase-js";

export const fail = (code: string, status: number) => NextResponse.json({ code }, { status });

/** Garante login + acesso (teste ou assinatura). Opcionalmente consome um crédito diário de IA. */
export async function requireAccess(opts: { consumeCredit?: boolean } = {}) {
  const supabase = await createClient();
  const ctx = await getUserAndProfile(supabase);
  if (!ctx) return { error: fail("unauthorized", 401) } as const;
  if (!accessInfo(ctx.profile).allowed) return { error: fail("no_access", 402) } as const;
  if (opts.consumeCredit) {
    const limit = Number(process.env.AI_DAILY_LIMIT || 40);
    const { data: ok, error } = await supabase.rpc("consume_ai_credit", { p_limit: limit });
    if (error) return { error: fail("upstream_error", 500) } as const;
    if (!ok) return { error: fail("limit", 429) } as const;
  }
  return { supabase, user: ctx.user, profile: ctx.profile } as const;
}

export async function aiErrorResponse(e: unknown, supabase: SupabaseClient, route: string) {
  await logError(supabase, route, e);
  if (e instanceof AIError) return fail(e.code, e.status);
  return fail("upstream_error", 500);
}

export const str = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

import type { SupabaseClient } from "@supabase/supabase-js";

/** Descreve um erro sem dados sensíveis (tipo, status HTTP e mensagem). */
export function describeError(e: unknown) {
  if (e instanceof Error) {
    const status = (e as { status?: number }).status;
    const cause = e.cause instanceof Error ? ` | causa: ${e.cause.message}` : "";
    return `${e.name}${status ? ` ${status}` : ""}: ${e.message}${cause}`.slice(0, 1500);
  }
  return String(e).slice(0, 1500);
}

/** Mostra o erro nos logs da Vercel e grava no banco (tabela app_errors) para diagnóstico. */
export async function logError(supabase: SupabaseClient | null, route: string, e: unknown) {
  const message = describeError(e);
  console.error(`[${route}]`, message);
  if (!supabase) return;
  try {
    await supabase.from("app_errors").insert({ route, message });
  } catch {
    // Registrar o erro nunca pode quebrar a resposta
  }
}

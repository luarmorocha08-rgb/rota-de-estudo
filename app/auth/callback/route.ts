import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link de confirmação de e-mail / recuperação de senha cai aqui
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${url.origin}${safeNext}`);
  }
  return NextResponse.redirect(`${url.origin}/login?erro=link`);
}

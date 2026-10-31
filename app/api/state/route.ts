import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 400_000;

async function save(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  const text = await request.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ code: "too_large" }, { status: 413 });
  let data: unknown;
  try { data = JSON.parse(text); } catch { return NextResponse.json({ code: "invalid_request" }, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  const { error } = await supabase.from("user_state").upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ code: "upstream_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const PUT = save;
// sendBeacon (ao fechar a aba) usa POST
export const POST = save;

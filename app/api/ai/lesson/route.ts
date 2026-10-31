import { NextResponse } from "next/server";
import { aiErrorResponse, fail, requireAccess, str } from "@/lib/api";
import { generateLesson } from "@/lib/claude";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = str(body?.key, 300);
  const r = body?.req ?? {};
  const req = { materia: str(r.materia, 200), topico: str(r.topico, 300), desc: str(r.desc, 400), contexto: str(r.contexto, 400), nivel: str(r.nivel, 80) };
  if (!key || !req.materia || !req.topico) return fail("invalid_request", 400);

  // Aula já gerada para esta pessoa: devolve sem gastar crédito
  const pre = await requireAccess();
  if ("error" in pre) return pre.error;
  const { data: cached } = await pre.supabase.from("lessons").select("content").eq("user_id", pre.user.id).eq("key", key).maybeSingle();
  if (cached) return NextResponse.json({ lesson: cached.content, cached: true });

  const ctx = await requireAccess({ consumeCredit: true });
  if ("error" in ctx) return ctx.error;
  try {
    const lesson = await generateLesson(req);
    await ctx.supabase.from("lessons").upsert({ user_id: ctx.user.id, key, req, content: lesson });
    return NextResponse.json({ lesson });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

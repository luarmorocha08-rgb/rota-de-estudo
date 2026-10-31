import { NextResponse } from "next/server";
import { aiErrorResponse, fail, requireAccess, str } from "@/lib/api";
import { chatAboutLesson, LessonSchema, type ChatTurn } from "@/lib/claude";

export const maxDuration = 120;

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const key = str(b?.key, 300);
  const raw: unknown[] = Array.isArray(b?.turns) ? b.turns.slice(-8) : [];
  const turns: ChatTurn[] = raw
    .map((t) => t as { role?: string; content?: unknown })
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .map((t) => ({ role: t.role as ChatTurn["role"], content: (t.content as string).slice(0, 2000) }));
  if (!key || !turns.length || turns[0].role !== "user" || turns[turns.length - 1].role !== "user") return fail("invalid_request", 400);

  const ctx = await requireAccess({ consumeCredit: true });
  if ("error" in ctx) return ctx.error;

  // Usa a aula salva no banco; a aula de exemplo (que não está no banco) vem do próprio app
  const { data: row } = await ctx.supabase.from("lessons").select("content").eq("user_id", ctx.user.id).eq("key", key).maybeSingle();
  const parsed = LessonSchema.safeParse(row?.content ?? b?.lesson);
  if (!parsed.success) return fail("invalid_request", 400);
  try {
    const text = await chatAboutLesson(parsed.data, turns);
    return NextResponse.json({ text });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

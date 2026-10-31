import { NextResponse } from "next/server";
import { aiErrorResponse, fail, requireAccess, str } from "@/lib/api";
import { generatePlan } from "@/lib/claude";

export const maxDuration = 300;

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  if (!b || !str(b.assunto)) return fail("invalid_request", 400);
  const ctx = await requireAccess({ consumeCredit: true });
  if ("error" in ctx) return ctx.error;
  try {
    const plan = await generatePlan({
      objetivo: str(b.objetivo, 120), assunto: str(b.assunto, 300), topicos: str(b.topicos, 1200),
      horas: str(b.horas, 10), dias: str(b.dias, 10), inicio: str(b.inicio, 10), prova: str(b.prova, 20),
      nivel: str(b.nivel, 80), dificuldades: str(b.dificuldades, 800), hoje: str(b.hoje, 20),
    });
    return NextResponse.json({ plan });
  } catch (e) {
    return aiErrorResponse(e);
  }
}

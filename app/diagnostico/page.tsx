import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "../components";

export const metadata: Metadata = { title: "Diagnóstico", robots: { index: false } };
export const dynamic = "force-dynamic";

// Mostra só se cada chave existe e tem o formato certo. Nunca mostra os valores.
const CHECKS: { key: string; label: string; ok: (v: string) => boolean; hint: string }[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Endereço do Supabase", ok: (v) => v.startsWith("https://") && v.includes("supabase.co"), hint: "https://qnzvembvucbbfvzmjzhk.supabase.co" },
  { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", label: "Chave pública do Supabase", ok: (v) => v.startsWith("sb_publishable_") || v.startsWith("eyJ"), hint: "começa com sb_publishable_" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Chave secreta do Supabase", ok: (v) => v.startsWith("sb_secret_") || v.startsWith("eyJ"), hint: "começa com sb_secret_ (ou eyJ, na chave antiga service_role)" },
  { key: "ANTHROPIC_API_KEY", label: "Chave da IA (Anthropic)", ok: (v) => v.startsWith("sk-ant-"), hint: "começa com sk-ant-" },
  { key: "STRIPE_SECRET_KEY", label: "Chave secreta do Stripe", ok: (v) => v.startsWith("sk_live_") || v.startsWith("sk_test_") || v.startsWith("rk_"), hint: "começa com sk_live_ ou sk_test_ (não use a pk_, que é a pública)" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Segredo do webhook do Stripe", ok: (v) => v.startsWith("whsec_"), hint: "começa com whsec_" },
];

export default async function Diagnostics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/diagnostico");

  const rows = CHECKS.map((c) => {
    const v = (process.env[c.key] || "").trim();
    const raw = process.env[c.key] || "";
    const state = !v ? "faltando" : !c.ok(v) ? "formato errado" : raw !== v ? "tem espaço sobrando" : "ok";
    return { ...c, state };
  });
  const stripeMode = (process.env.STRIPE_SECRET_KEY || "").includes("_live_") ? "real (cobra de verdade)" : (process.env.STRIPE_SECRET_KEY || "").includes("_test_") ? "teste" : "–";

  return (
    <>
      <header className="nav"><div className="w"><Brand href="/app" /></div></header>
      <main className="w page" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 36 }}>Diagnóstico da configuração</h1>
        <p className="muted">Mostra se cada chave está cadastrada na Vercel. Os valores nunca aparecem aqui.</p>
        <section className="panel" style={{ padding: 8 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px", padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
              <span className={`tag ${r.state === "ok" ? "ok" : "warn"}`} style={{ gridRow: "span 2", alignSelf: "start" }}>{r.state === "ok" ? "OK" : r.state}</span>
              <b>{r.label} <code style={{ fontSize: 12, color: "var(--muted)" }}>{r.key}</code></b>
              {r.state !== "ok" && <span className="muted">Esperado: {r.hint}</span>}
            </div>
          ))}
          <div style={{ padding: "12px 14px" }} className="muted">
            Modelo de IA: <b>{process.env.CLAUDE_MODEL || "claude-opus-5-5"}</b> · Modo do Stripe: <b>{stripeMode}</b> · Endereço do site: <b>{process.env.NEXT_PUBLIC_SITE_URL || "(automático)"}</b>
          </div>
        </section>
        <p className="muted">Depois de corrigir uma variável na Vercel, faça Redeploy para ela valer.</p>
      </main>
    </>
  );
}

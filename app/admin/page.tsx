import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { PRICE_CENTS } from "@/lib/stripe";
import type { Profile } from "@/lib/access";
import { Brand } from "../components";
import "./admin.css";
import { DayBars, HBars } from "./charts";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const dayKey = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
const fmtDate = (d: string | null | undefined) => (d ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "–");
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const PAID = new Set(["active", "trialing", "past_due"]);

type ProfileRow = Profile & { subscribed_at: string | null; canceled_at: string | null; created_at: string };

async function allUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  return out;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) notFound();

  const admin = createAdminClient();
  const since30 = new Date(Date.now() - 31 * 86_400_000).toISOString();
  const [users, profilesR, statesR, lessonsR, usageR, errorsR] = await Promise.all([
    allUsers(),
    admin.from("profiles").select("*"),
    admin.rpc("admin_user_activity"),
    admin.from("lessons").select("user_id, created_at, materia:req->>materia"),
    admin.from("ai_usage").select("user_id, day, count").gte("day", since30.slice(0, 10)),
    admin.from("app_errors").select("route, message, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const profiles = (profilesR.data ?? []) as ProfileRow[];
  const states = (statesR.data ?? []) as { user_id: string; updated_at: string; xp: number }[];
  const lessons = (lessonsR.data ?? []) as { user_id: string; created_at: string; materia: string | null }[];
  const usage = (usageR.data ?? []) as { user_id: string; day: string; count: number }[];
  const errors = (errorsR.data ?? []) as { route: string; message: string; created_at: string }[];

  const pById = new Map(profiles.map((p) => [p.id, p]));
  const sById = new Map(states.map((s) => [s.user_id, s]));
  const lessonsBy = new Map<string, number>();
  lessons.forEach((l) => lessonsBy.set(l.user_id, (lessonsBy.get(l.user_id) ?? 0) + 1));
  const now = Date.now();
  const today = dayKey(new Date());
  const days30 = lastDays(30);

  const status = (u: User) => {
    const p = pById.get(u.id);
    if (!u.email_confirmed_at) return { k: "pending", t: "E-mail não confirmado" };
    if (p?.subscription_status && PAID.has(p.subscription_status)) return { k: "paid", t: p.subscription_status === "past_due" ? "Assinante (pagamento pendente)" : "Assinante" };
    if (p?.subscription_status === "canceled") return { k: "canceled", t: "Cancelou" };
    const left = p ? Math.ceil((new Date(p.trial_ends_at).getTime() - now) / 86_400_000) : 0;
    if (left > 0) return { k: "trial", t: `Em teste · ${left} ${left === 1 ? "dia" : "dias"}` };
    return { k: "expired", t: "Teste acabou" };
  };

  const total = users.length;
  const new7 = users.filter((u) => now - new Date(u.created_at).getTime() < 7 * 86_400_000).length;
  const newToday = users.filter((u) => dayKey(u.created_at) === today).length;
  const paid = profiles.filter((p) => p.subscription_status && PAID.has(p.subscription_status));
  const inTrial = users.filter((u) => status(u).k === "trial").length;
  const expired = users.filter((u) => status(u).k === "expired").length;
  const canceled = profiles.filter((p) => p.subscription_status === "canceled").length;
  const decided = paid.length + expired + canceled; // contas cujo teste já acabou ou que assinaram
  const active7 = states.filter((s) => now - new Date(s.updated_at).getTime() < 7 * 86_400_000).length;
  const aiToday = usage.filter((u) => u.day === today).reduce((a, b) => a + b.count, 0);
  const confirmed = users.filter((u) => u.email_confirmed_at).length;
  const usedAI = new Set(usage.map((u) => u.user_id).concat(lessons.map((l) => l.user_id))).size;

  const signupsByDay = days30.map((d) => users.filter((u) => dayKey(u.created_at) === d).length);
  const subsByDay = days30.map((d) => profiles.filter((p) => p.subscribed_at && dayKey(p.subscribed_at) === d).length);
  const aiByDay = days30.map((d) => usage.filter((u) => u.day === d).reduce((a, b) => a + b.count, 0));

  const topics = new Map<string, number>();
  lessons.forEach((l) => l.materia && topics.set(l.materia, (topics.get(l.materia) ?? 0) + 1));
  const topTopics = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const recent = [...users].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 30);

  return (
    <>
      <header className="nav"><div className="w"><Brand href="/app" /><nav><Link className="link" href="/app">App</Link><Link className="link" href="/diagnostico">Diagnóstico</Link></nav></div></header>
      <main className="w adm">
        <div className="adm-head">
          <div style={{ display: "grid", gap: 6 }}>
            <span className="eyebrow">Painel do dono · dados ao vivo</span>
            <h1>Cadastros e assinaturas</h1>
          </div>
          <span className="muted">Atualizado em {fmtDate(new Date().toISOString())} (horário de Brasília). Recarregue a página para atualizar.</span>
        </div>

        <section className="kpis">
          <div className="panel kpi hero"><span>Receita mensal recorrente</span><b>{brl(paid.length * PRICE_CENTS)}</b><small>{paid.length} {paid.length === 1 ? "assinante" : "assinantes"} × {brl(PRICE_CENTS)}</small></div>
          <div className="panel kpi"><span>Cadastros</span><b>{total}</b><small>+{newToday} hoje · +{new7} em 7 dias</small></div>
          <div className="panel kpi"><span>Em teste grátis agora</span><b>{inTrial}</b><small>{expired} com teste acabado sem assinar</small></div>
          <div className="panel kpi"><span>Conversão teste → assinatura</span><b>{pct(paid.length, decided)}</b><small>{paid.length} de {decided} que já passaram do teste</small></div>
          <div className="panel kpi"><span>Assinantes ativos</span><b>{paid.length}</b><small>{canceled} {canceled === 1 ? "cancelou" : "cancelaram"}</small></div>
          <div className="panel kpi"><span>Estudaram nos últimos 7 dias</span><b>{active7}</b><small>{pct(active7, total)} das contas</small></div>
          <div className="panel kpi"><span>Aulas geradas</span><b>{lessons.length}</b><small>por {lessonsBy.size} {lessonsBy.size === 1 ? "pessoa" : "pessoas"}</small></div>
          <div className="panel kpi"><span>Pedidos à IA hoje</span><b>{aiToday}</b><small>{aiByDay.reduce((a, b) => a + b, 0)} nos últimos 30 dias</small></div>
        </section>

        <section className="grid2">
          <div className="panel card"><h2>Cadastros por dia</h2><p className="sub">Últimos 30 dias. Passe o mouse nas barras para ver o número.</p><DayBars days={days30} values={signupsByDay} color="var(--accent)" unit="cadastros" /></div>
          <div className="panel card"><h2>Novas assinaturas por dia</h2><p className="sub">Últimos 30 dias, pela data de início da assinatura.</p><DayBars days={days30} values={subsByDay} color="var(--ok)" unit="assinaturas" /></div>
        </section>

        <section className="grid2">
          <div className="panel card">
            <h2>Funil</h2>
            <p className="sub">Quantas contas chegaram em cada etapa.</p>
            <HBars rows={[["Criaram conta", total], ["Confirmaram o e-mail", confirmed], ["Usaram a IA", usedAI], ["Assinaram", paid.length + canceled]]} />
          </div>
          <div className="panel card">
            <h2>Assuntos mais estudados</h2>
            <p className="sub">Pelas aulas geradas com IA.</p>
            <HBars rows={topTopics} />
          </div>
        </section>

        <section className="panel card">
          <h2>Uso da IA por dia</h2>
          <p className="sub">Aulas, planos e perguntas ao professor. Ajuda a prever o custo com a Anthropic.</p>
          <DayBars days={days30} values={aiByDay} color="var(--accent)" unit="pedidos" />
        </section>

        <section className="panel card">
          <h2>Últimos cadastros</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Cadastro</th><th>Situação</th><th className="num">XP</th><th className="num">Aulas</th><th>Última atividade</th></tr></thead>
              <tbody>
                {recent.map((u) => {
                  const p = pById.get(u.id), s = sById.get(u.id), st = status(u);
                  return (
                    <tr key={u.id}>
                      <td>{p?.name || "–"}</td>
                      <td>{u.email}</td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td><span className={`chip ${st.k}`}>{st.t}</span></td>
                      <td className="num">{s?.xp ?? 0}</td>
                      <td className="num">{lessonsBy.get(u.id) ?? 0}</td>
                      <td>{fmtDate(s?.updated_at ?? u.last_sign_in_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > recent.length && <p className="sub">Mostrando os 30 mais recentes de {total}.</p>}
        </section>

        <section className="panel card">
          <h2>Erros recentes no servidor</h2>
          {errors.length ? (
            <div className="errs">{errors.map((e, i) => <div className="err" key={i}><b>{e.route} · {fmtDate(e.created_at)}</b><span>{e.message.slice(0, 300)}</span></div>)}</div>
          ) : <p className="empty">Nenhum erro registrado.</p>}
        </section>
      </main>
    </>
  );
}

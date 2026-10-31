import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { accessInfo, getUserAndProfile } from "@/lib/access";
import { updatePassword } from "../actions";
import { AuthForm } from "../auth-form";
import { Brand } from "../components";

export const metadata: Metadata = { title: "Minha conta" };

const STATUS: Record<string, string> = {
  active: "Ativa", trialing: "Em teste", past_due: "Pagamento pendente", canceled: "Cancelada",
  unpaid: "Não paga", incomplete: "Incompleta", incomplete_expired: "Expirada", paused: "Pausada",
};
const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("pt-BR") : "–");

export default async function AccountPage() {
  const ctx = await getUserAndProfile(await createClient());
  const p = ctx?.profile ?? null;
  const a = accessInfo(p);
  return (
    <>
      <header className="nav"><div className="w"><Brand href="/app" /><nav><Link className="link" href="/app">Voltar ao app</Link></nav></div></header>
      <main className="w page" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 40 }}>Minha conta</h1>
        <section className="panel" style={{ padding: 24, display: "grid", gap: 16 }}>
          <h2 style={{ fontSize: 20 }}>Dados</h2>
          <dl className="kv">
            <dt>Nome</dt><dd>{p?.name || "–"}</dd>
            <dt>E-mail</dt><dd>{ctx?.user.email}</dd>
          </dl>
        </section>
        <section className="panel" style={{ padding: 24, display: "grid", gap: 16 }}>
          <h2 style={{ fontSize: 20 }}>Assinatura</h2>
          <dl className="kv">
            <dt>Situação</dt>
            <dd>{a.subscribed ? <span className="tag ok">{STATUS[p!.subscription_status!] ?? p!.subscription_status}</span> : a.trial ? <span className="tag warn">Teste grátis</span> : <span className="tag">Sem assinatura</span>}</dd>
            {!a.subscribed && <><dt>Teste termina em</dt><dd>{fmt(p?.trial_ends_at)}</dd></>}
            {a.subscribed && <><dt>Próxima cobrança</dt><dd>{fmt(p?.current_period_end)}</dd></>}
          </dl>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {p?.stripe_customer_id && (
              <form action="/api/stripe/portal" method="post"><button className="btn btn-ghost" type="submit">Gerenciar pagamento ou cancelar</button></form>
            )}
            {!a.subscribed && <Link className="btn btn-primary" href="/assinar">Assinar agora</Link>}
          </div>
        </section>
        <section className="panel" style={{ padding: 24, display: "grid", gap: 16 }}>
          <h2 style={{ fontSize: 20 }}>Trocar senha</h2>
          <AuthForm action={updatePassword} submit="Salvar nova senha" fields={[{ name: "password", label: "Nova senha", type: "password", autoComplete: "new-password", minLength: 8 }]} />
        </section>
        <form action="/auth/signout" method="post"><button className="btn btn-ghost" type="submit">Sair da conta</button></form>
      </main>
    </>
  );
}

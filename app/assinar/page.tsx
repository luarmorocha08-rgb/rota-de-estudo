import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { accessInfo, getUserAndProfile } from "@/lib/access";
import { Brand } from "../components";

export const metadata: Metadata = { title: "Assinar" };

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const ctx = await getUserAndProfile(await createClient());
  const a = accessInfo(ctx?.profile ?? null);
  return (
    <>
      <header className="nav"><div className="w"><Brand href="/app" /><nav>{a.allowed && <Link className="link" href="/app">Voltar ao app</Link>}<Link className="link" href="/conta">Minha conta</Link></nav></div></header>
      <main className="w page">
        <div style={{ display: "grid", gap: 10 }}>
          <span className="eyebrow">{a.subscribed ? "Assinatura ativa" : a.trial ? `Teste grátis: ${a.daysLeft} ${a.daysLeft === 1 ? "dia" : "dias"} restantes` : "Seu teste grátis terminou"}</span>
          <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>{a.subscribed ? "Você já é Pro. Bons estudos!" : "Continue sua rota sem perder nada"}</h1>
          <p className="lead">Seu XP, sua sequência, suas aulas e seus planos ficam salvos. Assine para continuar estudando com a IA.</p>
        </div>
        {erro === "pagamento" && (
          <p className="alert err" role="alert" style={{ maxWidth: 520 }}>Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos. Se continuar, fale com o suporte.</p>
        )}
        <section className="panel plan-card">
          <span className="tag ok">Rota de Estudo Pro</span>
          <div className="price">R$ 29,90 <small>/mês</small></div>
          <ul className="checks">
            <li>Planejador de estudos com IA para qualquer objetivo</li>
            <li>Aulas completas geradas na hora para qualquer assunto</li>
            <li>Professor com IA para tirar dúvidas em cada aula</li>
            <li>75 trilhas, XP, níveis, conquistas e modo foco</li>
            <li>Cancele quando quiser, direto na sua conta</li>
          </ul>
          {a.subscribed ? (
            <form action="/api/stripe/portal" method="post"><button className="btn btn-ghost btn-block" type="submit">Gerenciar assinatura</button></form>
          ) : (
            <form action="/api/stripe/checkout" method="post"><button className="btn btn-primary btn-block" type="submit">Assinar por R$ 29,90/mês</button></form>
          )}
          <p className="muted">Pagamento seguro pelo Stripe. Cartão de crédito.</p>
        </section>
      </main>
    </>
  );
}

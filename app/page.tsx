import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "./components";
import "./landing.css";

const CATS: [string, string, string][] = [
  ["Concursos públicos", "#E7ECFF", "#2440C8"],
  ["ENEM e vestibulares", "#FFE9DC", "#B4470A"],
  ["Faculdade", "#EFE8FF", "#5B2FC2"],
  ["OAB e certificações", "#FDE6EA", "#B4243A"],
  ["Idiomas e Libras", "#D8F4F2", "#0A6E6A"],
  ["Programação e dados", "#DDF5E8", "#0E6B42"],
  ["Marketing e negócios", "#FCE4F1", "#A1286A"],
  ["Habilidades", "#FFF2CC", "#8A5A00"],
];

const icon = (d: string) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

const FEATS = [
  ["M4 5h16v15H4zM4 10h16M9 3v4M15 3v4", "Planejador com IA", "Diga o que quer estudar e quanto tempo tem. A IA monta a rotina da semana, hora a hora, até a data da prova."],
  ["M2 9l10-5 10 5-10 5-10-5zM6 11v5c3 2 9 2 12 0v-5", "Aulas completas", "Cada bloco da rotina vira uma aula com explicação, exemplos, pontos-chave, flashcards e exercícios."],
  ["M4 5h11v8H9l-4 3v-3H4zM15 9h5v7h-1v3l-3-3h-5v-3", "Professor 24 horas", "Travou em algum ponto? Pergunte dentro da aula e receba uma explicação simples na hora."],
  ["M13 2L4 14h7l-1 8 9-12h-7z", "Motivação de verdade", "XP, níveis, sequência de dias, meta diária e conquistas para você não largar no meio do caminho."],
];

const FAQ = [
  ["Preciso de cartão para testar?", "Não. Você cria a conta e usa tudo por 7 dias. Só pede cartão se decidir assinar."],
  ["Serve para qualquer assunto?", "Sim. Além das 75 trilhas prontas, o planejador e as aulas funcionam para qualquer tema que você descrever: de Direito Previdenciário a Google Ads, de Cálculo a inglês para entrevistas."],
  ["As aulas substituem o edital ou o material oficial?", "Não. As aulas ajudam a entender e praticar, mas leis, editais e valores mudam. Sempre confira a fonte oficial."],
  ["Posso cancelar quando quiser?", "Pode. O cancelamento é feito na sua conta, em poucos cliques, sem multa."],
  ["Meu progresso fica salvo?", "Sim. XP, sequência, aulas, planos e conquistas ficam salvos na sua conta e aparecem em qualquer aparelho."],
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cta = user ? { href: "/app", label: "Ir para meus estudos" } : { href: "/cadastro", label: "Começar 7 dias grátis" };

  return (
    <>
      <header className="nav">
        <div className="w">
          <Brand />
          <nav>
            <a className="link hide-sm" href="#como-funciona">Como funciona</a>
            <a className="link hide-sm" href="#precos">Preços</a>
            {!user && <Link className="link" href="/login">Entrar</Link>}
            <Link className="btn btn-primary" href={cta.href} style={{ padding: "9px 16px" }}>{user ? "Abrir app" : "Teste grátis"}</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="w hero">
          <div className="copy">
            <span className="eyebrow">Concursos · ENEM · Faculdade · Idiomas · Tecnologia · Negócios</span>
            <h1>Estude <span className="accent">qualquer coisa</span> com plano, aula e prática no <span className="hl">mesmo lugar</span>.</h1>
            <p className="lead">A IA monta sua rotina de estudos, cada bloco vira uma aula completa e um professor tira suas dúvidas na hora. Você ganha XP, sobe de nível e não perde o ritmo.</p>
            <div className="ctas">
              <Link className="btn btn-primary" href={cta.href}>{cta.label}</Link>
              <a className="btn btn-ghost" href="#como-funciona">Ver como funciona</a>
            </div>
            <p className="note">Sem cartão para testar. Depois, R$ 29,90 por mês. Cancele quando quiser.</p>
          </div>
          <div className="panel mock" aria-hidden="true">
            <div className="mock-top">
              <b style={{ fontFamily: "var(--f-display)", fontSize: 18 }}>Sua terça-feira</b>
              <div style={{ display: "flex", gap: 6 }}><span className="pill fire">12 dias seguidos</span><span className="pill xp">Nível 4</span></div>
            </div>
            <div className="mock-day">
              <div className="blk t"><time>19:00–19:50</time><b>Estrutura de campanhas</b><span>Abrir aula →</span></div>
              <div className="blk q"><time>20:00–20:30</time><b>Exercícios de métricas</b><span>Abrir aula →</span></div>
              <div className="blk r"><time>20:30–21:00</time><b>Revisão da semana</b><span>Concluída ✓</span></div>
            </div>
            <div className="mock-q">
              <p>Uma campanha gastou R$ 200 e gerou 8 vendas. Qual é o CPA?</p>
              <div className="opt"><i>A</i>R$ 8</div>
              <div className="opt right"><i>B</i>R$ 25</div>
              <div className="opt"><i>C</i>R$ 40</div>
            </div>
            <div className="toastm"><b>+10 XP</b> Resposta certa</div>
          </div>
        </section>

        <div className="w strip">
          {CATS.map(([n, bg, fg]) => <span key={n} style={{ ["--c-bg" as string]: bg, ["--c-fg" as string]: fg }}>{n}</span>)}
        </div>

        <section className="w sec">
          <div className="sec-head">
            <span className="eyebrow">Tudo o que você precisa</span>
            <h2>Do “por onde eu começo?” ao dia da prova</h2>
          </div>
          <div className="feats">
            {FEATS.map(([d, t, p]) => (
              <article className="panel feat" key={t}><span className="ico">{icon(d)}</span><h3>{t}</h3><p>{p}</p></article>
            ))}
          </div>
        </section>

        <section className="w sec" id="como-funciona">
          <div className="sec-head">
            <span className="eyebrow">Como funciona</span>
            <h2>Três passos e você já está estudando</h2>
          </div>
          <div className="steps">
            <div className="panel step"><b>Passo 1</b><h3>Escolha o objetivo</h3><p>Uma das 75 trilhas prontas ou qualquer assunto que você descrever.</p></div>
            <div className="panel step"><b>Passo 2</b><h3>Receba sua rotina</h3><p>A IA monta a semana com teoria, exercícios, revisões e simulados no seu horário.</p></div>
            <div className="panel step"><b>Passo 3</b><h3>Entre na aula</h3><p>Clique no bloco do dia, estude, responda os exercícios e tire dúvidas com o professor.</p></div>
          </div>
        </section>

        <section className="w sec">
          <div className="game">
            <div style={{ display: "grid", gap: 14 }}>
              <span className="eyebrow" style={{ color: "var(--mark)" }}>Feito para você voltar amanhã</span>
              <h2>Estudar vira hábito quando você vê o próprio progresso</h2>
              <p>Cada aula, acerto e ciclo de foco rende XP. Mantenha a chama da sequência acesa, bata a meta do dia e desbloqueie conquistas.</p>
            </div>
            <ul>
              <li><b>+50 XP</b> Aula concluída</li>
              <li><b>+10 XP</b> Cada exercício certo</li>
              <li><b>+25 XP</b> Ciclo de foco de 25 minutos</li>
              <li><b>12</b> conquistas e 8 níveis, de Calouro a Lenda</li>
            </ul>
          </div>
        </section>

        <section className="w sec" id="precos">
          <div className="sec-head">
            <span className="eyebrow">Preços</span>
            <h2>Comece grátis. Continue se fizer sentido.</h2>
          </div>
          <div className="pricing">
            <div className="panel pcard">
              <span className="tag">Primeiros 7 dias</span>
              <div className="price">Grátis</div>
              <ul className="checks"><li>Acesso completo a tudo</li><li>Sem cartão de crédito</li><li>Seu progresso continua se você assinar</li></ul>
              <Link className="btn btn-ghost btn-block" href={cta.href}>{cta.label}</Link>
            </div>
            <div className="panel pcard pro">
              <span className="ribbon">Pro</span>
              <span className="tag ok">Depois do teste</span>
              <div className="price">R$ 29,90 <small>/mês</small></div>
              <ul className="checks"><li>Planejador e aulas com IA para qualquer assunto</li><li>Professor com IA em todas as aulas</li><li>75 trilhas, XP, conquistas e modo foco</li><li>Cancele quando quiser</li></ul>
              <Link className="btn btn-primary btn-block" href={cta.href}>{cta.label}</Link>
            </div>
          </div>
        </section>

        <section className="w sec">
          <div className="sec-head"><span className="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => <details className="panel" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="w final">
          <h2>Sua aprovação começa com <span className="hl">uma aula</span>.</h2>
          <p className="lead">Crie sua conta em 30 segundos e monte seu primeiro plano agora.</p>
          <Link className="btn btn-primary" href={cta.href}>{cta.label}</Link>
        </section>
      </main>

      <footer className="foot"><div className="w"><span>© {new Date().getFullYear()} Rota de Estudo</span><span>Aulas geradas por IA podem conter erros. Confira sempre editais e fontes oficiais.</span></div></footer>
    </>
  );
}

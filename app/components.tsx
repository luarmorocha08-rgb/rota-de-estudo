import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Rota de Estudo">
      <span className="bubbles" aria-hidden="true"><i /><i className="on" /><i /><i /></span>
      Rota de Estudo
    </Link>
  );
}

export function AuthSide({ title }: { title: string }) {
  return (
    <aside className="auth-side">
      <Brand />
      <h2>{title}</h2>
      <ul>
        <li>Plano de estudos montado pela IA para o seu tempo e o seu objetivo</li>
        <li>75 trilhas: concursos, ENEM, faculdade, idiomas, tecnologia e negócios</li>
        <li>Aulas completas com exercícios, flashcards e professor para dúvidas</li>
        <li>XP, níveis e sequência de dias para manter o ritmo</li>
      </ul>
    </aside>
  );
}

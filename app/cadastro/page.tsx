import Link from "next/link";
import type { Metadata } from "next";
import { signup } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthSide } from "../components";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <main className="auth">
      <AuthSide title="7 dias grátis para estudar do jeito certo. Sem cartão." />
      <section className="auth-main">
        <div className="auth-card">
          <h1>Criar conta</h1>
          <p className="muted">Teste tudo por 7 dias. Depois, R$ 29,90 por mês se quiser continuar.</p>
          <AuthForm
            action={signup}
            submit="Começar meus 7 dias grátis"
            fields={[
              { name: "name", label: "Seu nome", autoComplete: "name" },
              { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
              { name: "password", label: "Senha (mínimo 8 caracteres)", type: "password", autoComplete: "new-password", minLength: 8 },
            ]}
          />
          <p className="muted center">Já tem conta? <Link href="/login">Entrar</Link></p>
        </div>
      </section>
    </main>
  );
}

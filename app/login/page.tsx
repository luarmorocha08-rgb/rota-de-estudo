import Link from "next/link";
import type { Metadata } from "next";
import { login, resetPassword } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthSide } from "../components";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string; senha?: string }> }) {
  const sp = await searchParams;
  const forgot = sp.senha === "1";
  return (
    <main className="auth">
      <AuthSide title="Bom te ver de volta. Sua sequência está esperando." />
      <section className="auth-main">
        <div className="auth-card">
          {forgot ? (
            <>
              <h1>Recuperar senha</h1>
              <p className="muted">Enviamos um link para você entrar e cadastrar uma senha nova.</p>
              <AuthForm action={resetPassword} submit="Enviar link" fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]} />
              <p className="muted center"><Link href="/login">Voltar para o login</Link></p>
            </>
          ) : (
            <>
              <h1>Entrar</h1>
              {sp.erro === "link" && <p className="alert err">O link expirou ou já foi usado. Entre com e-mail e senha ou peça um novo.</p>}
              <AuthForm
                action={login}
                submit="Entrar"
                hidden={{ next: sp.next ?? "/app" }}
                fields={[
                  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
                  { name: "password", label: "Senha", type: "password", autoComplete: "current-password" },
                ]}
              />
              <p className="muted center"><Link href="/login?senha=1">Esqueci minha senha</Link></p>
              <p className="muted center">Ainda não tem conta? <Link href="/cadastro">Comece 7 dias grátis</Link></p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

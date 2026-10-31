"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
};

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || ""),
  });
  if (error) {
    return { error: error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada." : "E-mail ou senha incorretos." };
  }
  redirect(safeNext(form.get("next")));
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${await origin()}/auth/callback?next=/app` },
  });
  if (error) return { error: error.code === "user_already_exists" ? "Já existe uma conta com esse e-mail. Faça login." : "Não foi possível criar a conta. Confira os dados e tente de novo." };
  if (data.session) redirect("/app");
  return { message: `Enviamos um link de confirmação para ${email}. Abra o e-mail e clique no link para começar seus 7 dias grátis.` };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(form.get("email") || "").trim(), {
    redirectTo: `${await origin()}/auth/callback?next=/conta`,
  });
  return { message: "Se existir uma conta com esse e-mail, você vai receber um link para entrar e trocar a senha." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") || "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: "Não foi possível trocar a senha. Tente de novo." } : { message: "Senha atualizada." };
}

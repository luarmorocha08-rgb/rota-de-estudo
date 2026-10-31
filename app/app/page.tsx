import type { Metadata } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessInfo, getUserAndProfile } from "@/lib/access";
import { MARKUP } from "./markup";

export const metadata: Metadata = { title: "Estudar" };
export const dynamic = "force-dynamic";

const APP_VERSION = "2";

export default async function StudyApp() {
  const supabase = await createClient();
  const ctx = await getUserAndProfile(supabase);
  if (!ctx) redirect("/login?next=/app");
  const access = accessInfo(ctx.profile);
  if (!access.allowed) redirect("/assinar");

  const { data: row } = await supabase.from("user_state").select("data").eq("user_id", ctx.user.id).maybeSingle();
  const initial = {
    state: row?.data ?? {},
    account: { name: ctx.profile?.name ?? "", trial: access.trial, subscribed: access.subscribed, daysLeft: access.daysLeft },
  };
  // Escapa "<" para o JSON não fechar a tag <script> antes da hora
  const json = JSON.stringify(initial).replace(/</g, "\\u003c");

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <script id="initial-data" type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
      <Script src={`/app/app.js?v=${APP_VERSION}`} strategy="afterInteractive" />
    </>
  );
}

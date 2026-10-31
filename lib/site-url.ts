/**
 * Endereço público do site para links de e-mail e redirecionamentos do Stripe.
 * Usa NEXT_PUBLIC_SITE_URL quando ela aponta para um endereço real; senão, o endereço
 * pelo qual a pessoa acessou o site (assim um "localhost" esquecido não quebra os links).
 */
export function resolveSiteUrl(host: string | null, proto: string | null) {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const fromRequest = host ? `${proto || "https"}://${host}` : "";
  const isLocal = (u: string) => /localhost|127\.0\.0\.1/.test(u);
  if (env && !(isLocal(env) && fromRequest && !isLocal(fromRequest))) return env;
  return fromRequest || env || "http://localhost:3000";
}

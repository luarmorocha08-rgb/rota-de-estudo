/** E-mails com acesso ao painel /admin (variável ADMIN_EMAILS, separados por vírgula). */
export function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "luarmorocha08@gmail.com").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

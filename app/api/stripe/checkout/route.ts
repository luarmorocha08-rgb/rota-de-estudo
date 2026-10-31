import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndProfile } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PRICE_CENTS, siteUrl } from "@/lib/stripe";
import { logError } from "@/lib/log";

export async function POST(request: Request) {
  const supabase = await createClient();
  const ctx = await getUserAndProfile(supabase);
  const base = siteUrl(request);
  if (!ctx) return NextResponse.redirect(`${base}/login?next=/assinar`, 303);
  try {
    return NextResponse.redirect(await createCheckout(ctx, base), 303);
  } catch (e) {
    await logError(supabase, "stripe/checkout", e);
    return NextResponse.redirect(`${base}/assinar?erro=pagamento`, 303);
  }
}

type Ctx = NonNullable<Awaited<ReturnType<typeof getUserAndProfile>>>;

async function createCheckout(ctx: Ctx, base: string) {
  const stripe = getStripe();
  let customerId = ctx.profile?.stripe_customer_id ?? null;
  if (!customerId) {
    // Reaproveita um cliente já criado para esta pessoa (evita duplicados no Stripe)
    const existing = ctx.user.email ? await stripe.customers.list({ email: ctx.user.email, limit: 10 }) : null;
    const found = existing?.data.find((c) => c.metadata?.user_id === ctx.user.id);
    const customer = found ?? (await stripe.customers.create({
      email: ctx.user.email,
      name: ctx.profile?.name ?? undefined,
      metadata: { user_id: ctx.user.id },
    }));
    customerId = customer.id;
    const { error } = await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", ctx.user.id);
    if (error) throw new Error(`Não foi possível salvar o cliente do Stripe no perfil (confira SUPABASE_SERVICE_ROLE_KEY): ${error.message}`);
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    allowed_payment_method_types: ["card"],
    client_reference_id: ctx.user.id,
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: PRICE_CENTS,
              recurring: { interval: "month" },
              product_data: { name: "Rota de Estudo Pro" },
            },
          },
    ],
    allow_promotion_codes: true,
    locale: "pt-BR",
    subscription_data: { metadata: { user_id: ctx.user.id } },
    success_url: `${base}/app?assinatura=ok`,
    cancel_url: `${base}/assinar`,
  });
  if (!session.url) throw new Error("Stripe não devolveu o link do checkout");
  return session.url;
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndProfile } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PRICE_CENTS, siteUrl } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const ctx = await getUserAndProfile(supabase);
  const base = siteUrl(request);
  if (!ctx) return NextResponse.redirect(`${base}/login?next=/assinar`, 303);

  const stripe = getStripe();
  let customerId = ctx.profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email,
      name: ctx.profile?.name ?? undefined,
      metadata: { user_id: ctx.user.id },
    });
    customerId = customer.id;
    await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", ctx.user.id);
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
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
  return NextResponse.redirect(session.url!, 303);
}

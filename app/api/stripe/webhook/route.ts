import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const end = sub.items?.data?.[0]?.current_period_end;
  const update: Record<string, string | null> = {
    subscription_status: sub.status,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
  };
  if (sub.status === "canceled") update.canceled_at = new Date((sub.canceled_at ?? sub.ended_at ?? Date.now() / 1000) * 1000).toISOString();
  const admin = createAdminClient();
  // Marca a data da primeira assinatura ativa (sem sobrescrever)
  if (sub.status === "active" || sub.status === "trialing") {
    const started = new Date((sub.start_date ?? Date.now() / 1000) * 1000).toISOString();
    await admin.from("profiles").update({ subscribed_at: started }).eq("stripe_customer_id", customerId).is("subscribed_at", null);
  }
  const { data, error } = await admin.from("profiles").update(update).eq("stripe_customer_id", customerId).select("id");
  if (error) throw new Error(`Falha ao atualizar o perfil: ${error.message}`);
  // Se o cliente ainda não estava ligado ao perfil, liga pelo user_id salvo na assinatura
  const userId = sub.metadata?.user_id;
  if ((!data || data.length === 0) && userId) {
    const { error: e2 } = await admin.from("profiles").update({ ...update, stripe_customer_id: customerId }).eq("id", userId);
    if (e2) throw new Error(`Falha ao atualizar o perfil: ${e2.message}`);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await handle(stripe, event);
  } catch (e) {
    console.error("[stripe/webhook]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handle(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && s.subscription) {
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(subId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
  }
}

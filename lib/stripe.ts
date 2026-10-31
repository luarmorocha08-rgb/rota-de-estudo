import Stripe from "stripe";
import { resolveSiteUrl } from "@/lib/site-url";

let stripe: Stripe | null = null;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurada");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export const PRICE_CENTS = 2990; // R$ 29,90 por mês

export function siteUrl(request: Request) {
  const url = new URL(request.url);
  return resolveSiteUrl(request.headers.get("x-forwarded-host") ?? url.host, request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""));
}

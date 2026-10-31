import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAndProfile } from "@/lib/access";
import { getStripe, siteUrl } from "@/lib/stripe";
import { logError } from "@/lib/log";

export async function POST(request: Request) {
  const supabase = await createClient();
  const ctx = await getUserAndProfile(supabase);
  const base = siteUrl(request);
  if (!ctx) return NextResponse.redirect(`${base}/login`, 303);
  if (!ctx.profile?.stripe_customer_id) return NextResponse.redirect(`${base}/assinar`, 303);
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: ctx.profile.stripe_customer_id,
      return_url: `${base}/conta`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (e) {
    await logError(supabase, "stripe/portal", e);
    return NextResponse.redirect(`${base}/conta?erro=portal`, 303);
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/billing-portal?cid=cus_xxx
   Creates a Stripe Billing Portal session for the member and redirects them.
   Called from the dashboard "Manage Billing" and "Manage Subscription" links.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const baseUrl    = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const stripeKey  = process.env.STRIPE_SECRET_KEY?.trim();
  const customerId = req.nextUrl.searchParams.get("cid") ?? "";

  if (!stripeKey) {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  if (!customerId) {
    /* No customer ID in cookie — redirect to login */
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const stripe  = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("[billing-portal] Error:", err);
    /* Fallback to Stripe's generic portal if session creation fails */
    return NextResponse.redirect("https://billing.stripe.com");
  }
}

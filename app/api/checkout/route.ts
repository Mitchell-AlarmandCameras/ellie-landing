import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/checkout
   Body (JSON): { plan?: "monthly" | "annual", promoCode?: string }

   Creates a Stripe Checkout Session and returns { url }.
   - plan: "annual" uses STRIPE_ANNUAL_PRICE_ID ($180/yr = 2 months free)
   - promoCode: a Stripe promotion code string (from referral links)
     When a promo code is supplied, allow_promotion_codes is disabled so
     the discount applies automatically without a second entry box.

   Required env vars:
     STRIPE_SECRET_KEY       — your Stripe secret key
     STRIPE_PRICE_ID         — monthly price ID (price_xxx)
     STRIPE_ANNUAL_PRICE_ID  — annual price ID (price_xxx) [optional]
     NEXT_PUBLIC_BASE_URL    — your live site URL
═══════════════════════════════════════════════════════════════════════════ */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_PRICE_ID?.trim()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel → Environment Variables → Production, then redeploy." },
        { status: 503 }
      );
    }

    const body      = await req.json().catch(() => ({})) as { plan?: string; promoCode?: string };
    const plan      = body.plan ?? "monthly";
    const promoCode = (body.promoCode ?? "").trim();
    const baseUrl   = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

    /* Choose price ID */
    let priceId = process.env.STRIPE_PRICE_ID!;
    if (plan === "annual" && process.env.STRIPE_ANNUAL_PRICE_ID?.trim()) {
      priceId = process.env.STRIPE_ANNUAL_PRICE_ID;
    }

    /* Resolve referral promo code to a Stripe promotion code ID */
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    let allowPromoCodes = true;

    if (promoCode) {
      try {
        const codes = await stripe.promotionCodes.list({ code: promoCode, limit: 1, active: true });
        if (codes.data[0]) {
          discounts      = [{ promotion_code: codes.data[0].id }];
          allowPromoCodes = false; // can't combine discounts[] with allow_promotion_codes
        }
      } catch {
        /* Invalid code — proceed without discount, keep allow_promotion_codes */
        console.warn("[checkout] promo code lookup failed for:", promoCode);
      }
    }

    /* Monthly plan gets a 7-day free trial — annual plan starts immediately */
    const trialDays = (plan === "monthly" && !promoCode) ? 7 : 0;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode:                 "subscription",
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${baseUrl}/api/verify-session?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${baseUrl}/`,
      billing_address_collection: "required",
      automatic_tax:        { enabled: true },
      subscription_data:    {
        metadata:            { product: "ellie_style_refresh", plan },
        ...(trialDays > 0 && { trial_period_days: trialDays }),
      },
      custom_text:          {
        submit: {
          message: plan === "annual"
            ? "Your annual membership begins immediately. You save $48 versus monthly billing."
            : trialDays > 0
              ? "Your card will not be charged until after your 7-day free trial. Cancel anytime during the trial at no cost."
              : "Your Style Refresh membership begins immediately after payment.",
        },
      },
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = allowPromoCodes;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("[checkout] Session error:", err);
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/referral/generate
   Body: { customerId: string }

   Generates (or retrieves) a unique Stripe promotion code for a member.
   The member shares the returned referralUrl with friends.
   When the friend uses it at checkout, they get 50% off their first month.

   Required env vars:
     STRIPE_SECRET_KEY          — Stripe secret key
     STRIPE_REFERRAL_COUPON_ID  — ID of a Stripe coupon (50% off first month)
                                  Create once in Stripe → Coupons:
                                  Name: "Friend Referral", 50% off, first 1 month
     NEXT_PUBLIC_BASE_URL       — site URL

   How to create the coupon in Stripe (one-time setup):
     1. Stripe Dashboard → Products → Coupons → + New
     2. Name: "Friend Referral"
     3. Percentage: 50%, Duration: Repeating, Months: 1
     4. Copy the coupon ID → add to Vercel env vars as STRIPE_REFERRAL_COUPON_ID
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  try {
    const { customerId } = (await req.json()) as { customerId?: string };

    if (!customerId?.startsWith("cus_")) {
      return NextResponse.json({ error: "Valid Stripe customer ID required." }, { status: 400 });
    }

    const couponId = process.env.STRIPE_REFERRAL_COUPON_ID?.trim();
    const baseUrl  = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

    if (!couponId) {
      /* Referral system ready but coupon not yet created — return referral URL without discount.
         Visitors still land on the site via the referral; discount applies once coupon is set up. */
      const code = `ELLIE-${customerId.slice(-6).toUpperCase()}`;
      return NextResponse.json({
        referralUrl: `${baseUrl}/?ref=${code}`,
        promoCode:   null,
        note:        "Add STRIPE_REFERRAL_COUPON_ID to Vercel env vars to activate the 50% first-month discount.",
      });
    }

    /* Code format: ELLIE-XXXXXX (last 6 chars of customer ID) */
    const code = `ELLIE-${customerId.slice(-6).toUpperCase()}`;

    /* Check if this code already exists in Stripe */
    const existing = await stripe.promotionCodes.list({ code, limit: 1 });
    let promoCodeId: string;

    if (existing.data[0]) {
      promoCodeId = existing.data[0].id;
    } else {
      const created = await stripe.promotionCodes.create({
        coupon:          couponId,
        code,
        metadata:        { referrerCustomerId: customerId },
        restrictions:    { first_time_transaction: true },
      });
      promoCodeId = created.id;
    }

    return NextResponse.json({
      referralUrl: `${baseUrl}/?ref=${code}`,
      promoCode:   code,
      promoCodeId,
    });

  } catch (err) {
    console.error("[referral/generate]", err);
    return NextResponse.json({ error: "Could not generate referral link." }, { status: 500 });
  }
}

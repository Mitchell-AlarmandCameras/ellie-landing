import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_PRICE_ID?.trim()) {
      console.error("checkout: missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID");
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel → Environment Variables → Production, then redeploy.",
        },
        { status: 503 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      // After payment, Stripe sends the user to verify-session which
      // validates the purchase, sets the access cookie, sends the
      // welcome email, and finally redirects to /dashboard.
      success_url: `${baseUrl}/api/verify-session?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      billing_address_collection: "required",
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { product: "ellie_inner_circle" },
      },
      custom_text: {
        submit: {
          message: "Your Inner Circle membership begins immediately after payment.",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}

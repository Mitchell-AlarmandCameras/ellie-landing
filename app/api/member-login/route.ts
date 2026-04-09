import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createHmac } from "crypto";

/* ═══════════════════════════════════════════════════════════════════════════
   POST /api/member-login
   Body: { email: string }

   1. Checks if email has an active Stripe subscription
   2. If yes, generates a signed magic link (valid 30 minutes)
   3. Sends the link to their email
   4. Member clicks link → /api/verify-login → sets cookie → /dashboard
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

function signToken(email: string, expiry: number, secret: string): string {
  const payload = `${email}:${expiry}`;
  const sig     = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({})) as { email?: string };

  if (!email?.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() ?? "ellie@stylebyellie.com";
  const secret    = process.env.CRON_SECRET?.trim() ?? process.env.CURATOR_APPROVE_SECRET?.trim() ?? "fallback";
  const baseUrl   = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

  if (!stripeKey) {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }

  /* ── Check for active Stripe subscription ──────────────────── */
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  let customerId: string | null = null;

  try {
    const customers = await stripe.customers.list({ email, limit: 5 });

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status:   "active",
        limit:    1,
      });
      if (subs.data.length > 0) {
        customerId = customer.id;
        break;
      }
    }
  } catch (err) {
    console.error("[member-login] Stripe error:", err);
    return NextResponse.json({ error: "Service error. Please try again." }, { status: 500 });
  }

  if (!customerId) {
    /* Don't reveal whether email exists — generic message */
    return NextResponse.json({
      message: `If ${email} is linked to an active membership, a login link is on its way. Check your inbox (and spam).`,
    });
  }

  /* ── Generate signed token (30 min expiry) ──────────────────── */
  const expiry = Date.now() + 30 * 60 * 1000;
  const token  = signToken(email, expiry, secret);
  const link   = `${baseUrl}/api/verify-login?token=${token}&cid=${customerId}`;

  /* ── Send magic link email ──────────────────────────────────── */
  if (resendKey) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `ELLIE <${fromEmail}>`,
      to:      email,
      subject: "Your Style Refresh login link — expires in 30 minutes",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:520px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:2px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.32em;
               text-transform:uppercase;font-family:Arial,sans-serif;">The Style Refresh</p>
    <h1 style="margin:6px 0 0;color:#2C2C2C;font-size:24px;font-weight:400;font-family:Georgia,serif;">
      Your VIP Room is one click away.
    </h1>
  </td></tr>
  <tr><td style="padding:28px 36px;">
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:15px;line-height:1.8;font-family:Georgia,serif;">
      Click the button below to enter your member dashboard. This link expires in 30 minutes
      and can only be used once.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="background:#2C2C2C;">
          <a href="${link}"
             style="display:inline-block;padding:14px 40px;color:#FDFAF5;font-weight:500;
                    font-size:11px;letter-spacing:0.2em;text-transform:uppercase;
                    text-decoration:none;font-family:Arial,sans-serif;">
            Enter the VIP Room &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#8A8580;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
      If you didn&rsquo;t request this, ignore this email. Your account is safe.
    </p>
  </td></tr>
  <tr><td style="padding:16px 36px 24px;text-align:center;background:#F5EFE4;">
    <p style="margin:0;color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;">
      &copy; ${new Date().getFullYear()} The Style Refresh &middot;
      ${process.env.BUSINESS_MAILING_ADDRESS ?? "New York, NY"}
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
    });
  }

  return NextResponse.json({
    message: `Login link sent to ${email}. Check your inbox — it expires in 30 minutes.`,
  });
}

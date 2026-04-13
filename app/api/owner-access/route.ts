import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/owner-access?secret=xxx

   Owner-only bypass that grants full member access without Stripe.
   Use this to:
     • Log in as a member on any device without paying
     • Experience the exact customer journey (welcome email + dashboard)
     • Test new features the way a real subscriber sees them

   How to use:
     1. Add OWNER_BYPASS_SECRET to Vercel env vars (make it long and random)
     2. Visit: https://stylebyellie.com/api/owner-access?secret=YOUR_SECRET
     3. You'll receive the member welcome email and land on /success

   The cookie lasts 1 year. After that, just visit the URL again.
   NEVER share this URL — it grants full subscriber access instantly.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const secret  = req.nextUrl.searchParams.get("secret") ?? "";
  const bypass  = process.env.OWNER_BYPASS_SECRET?.trim() ?? "";

  if (!bypass || !secret || secret !== bypass) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  /* ── Optional: send yourself the welcome email so you see it exactly
     as a customer does. Skip if Resend isn't configured yet.          */
  const resendKey   = process.env.RESEND_API_KEY;
  const fromEmail   = process.env.RESEND_FROM_EMAIL;
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL;
  const sendWelcome = req.nextUrl.searchParams.get("email") === "yes";

  if (sendWelcome && resendKey && fromEmail && notifyEmail) {
    const resend = new Resend(resendKey);
    const siteUrl = baseUrl.replace(/\/$/, "");

    const welcomeHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Welcome to The Style Refresh</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
        <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
        <tr><td style="background:#2C2C2C;padding:12px 40px;text-align:center;">
          <p style="margin:0;color:#C4956A;font-size:11px;letter-spacing:0.22em;
                     text-transform:uppercase;font-family:'Arial',sans-serif;">
            OWNER PREVIEW — This is exactly what your customers receive
          </p>
        </td></tr>
        <tr><td style="background:#EDE5D8;padding:40px 40px 32px;text-align:center;">
          <p style="margin:0 0 8px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
                     text-transform:uppercase;font-family:'Arial',sans-serif;">
            Private Membership · The Style Refresh
          </p>
          <h1 style="margin:0 0 10px;color:#2C2C2C;font-size:32px;font-weight:400;">
            You&rsquo;re in.
          </h1>
          <p style="margin:0;color:#6B6560;font-size:14px;font-style:italic;line-height:1.7;">
            Your first brief lands Monday morning. Here&rsquo;s everything you need to know.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="margin:0 0 24px;background:#F5EFE4;border:1px solid #DDD4C5;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;color:#C4956A;font-size:10px;letter-spacing:0.28em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                Step 1 — Set up your VIP Room login
              </p>
              <p style="margin:0 0 14px;color:#4A4A4A;font-size:14px;line-height:1.75;">
                Go to <a href="${siteUrl}/login" style="color:#C4956A;text-decoration:none;">${siteUrl}/login</a>,
                enter this email address and choose a password.
              </p>
              <a href="${siteUrl}/login"
                 style="display:inline-block;padding:12px 28px;background:#2C2C2C;
                         color:#FDFAF5;font-size:10px;letter-spacing:0.2em;
                         text-transform:uppercase;text-decoration:none;font-family:'Arial',sans-serif;">
                Set Up Login &rarr;
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 28px;color:#4A4A4A;font-size:15px;line-height:1.8;">
            See you Monday morning.
          </p>
          <p style="margin:0;color:#6B6560;font-size:14px;font-style:italic;">Warmly,</p>
          <p style="margin:4px 0 0;color:#2C2C2C;font-size:22px;font-weight:400;
                      letter-spacing:0.06em;font-family:'Georgia',serif;">Ellie</p>
        </td></tr>
        <tr><td style="height:28px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    resend.emails.send({
      from:    `ELLIE <${fromEmail}>`,
      to:      notifyEmail,
      subject: "[OWNER PREVIEW] Welcome to The Style Refresh — this is your customer welcome email",
      html:    welcomeHtml,
    }).catch(err => console.error("[owner-access] Preview email failed:", err));
  }

  /* ── Set 1-year owner access cookies ─────────────────────────────────── */
  const response = NextResponse.redirect(new URL("/success", baseUrl));

  response.cookies.set("ellie_access", "true", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365,
    path:     "/",
  });

  response.cookies.set("ellie_owner", "true", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365,
    path:     "/",
  });

  return response;
}

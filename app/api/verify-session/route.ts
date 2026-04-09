import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

function siteHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "stylebyellie.com";
  }
}

/* ─── Welcome email HTML — Warm Minimalism / Hamptons ────────── */
function buildWelcomeEmail(name: string, _email: string): string {
  const firstName = name?.split(" ")[0] || "there";
  const siteUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const siteLabel = siteHostname(siteUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Welcome to The Style Refresh</title>
</head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">

          <!-- Blush top bar -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td>
          </tr>

          <!-- Warm cream header -->
          <tr>
            <td style="background:#EDE5D8;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#C4956A;font-size:10px;
                         letter-spacing:0.32em;text-transform:uppercase;
                         font-family:'Arial',sans-serif;">
                The Style Refresh
              </p>
              <h1 style="margin:8px 0 0;color:#2C2C2C;font-size:30px;
                          font-weight:400;letter-spacing:0.02em;font-family:'Georgia',serif;">
                You&rsquo;re in the VIP Room.
              </h1>
            </td>
          </tr>

          <!-- Sand divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;margin:28px 0 0;
                           background:linear-gradient(90deg,transparent,#C9B99A,transparent);">
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Dear ${firstName},
              </p>
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Your membership is confirmed. Every Monday morning you&rsquo;ll receive
                three complete looks &mdash; fully sourced with direct buy links to
                every single item.
              </p>
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                No algorithms. No feeds. Just the edit that matters.
              </p>

              <!-- What to expect block -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:24px 0;background:#F5EFE4;border-left:2px solid #C4956A;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 12px;color:#C4956A;font-size:10px;
                               letter-spacing:0.25em;text-transform:uppercase;
                               font-family:'Arial',sans-serif;">
                      What arrives every Monday
                    </p>
                    ${[
                      "The Executive &mdash; boardroom authority, fully sourced",
                      "The Weekender &mdash; effortless refinement, direct buy links",
                      "The Wildcard &mdash; one deliberate departure, precisely executed",
                      "Ellie&rsquo;s Note &mdash; sourcing insight on every item",
                    ].map(item => `
                    <p style="margin:0 0 8px;color:#4A4A4A;font-size:14px;line-height:1.65;">
                      <span style="color:#C4956A;margin-right:8px;">&rarr;</span>
                      ${item}
                    </p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:10px 0 28px;">
                <tr>
                  <td style="background:#2C2C2C;border:1px solid #2C2C2C;">
                    <a href="${siteUrl}/dashboard"
                       style="display:inline-block;padding:14px 36px;
                              color:#FDFAF5;font-weight:500;font-size:11px;
                              letter-spacing:0.18em;text-transform:uppercase;
                              text-decoration:none;font-family:'Arial',sans-serif;">
                      Enter the VIP Room &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Your first brief is waiting. I look forward to showing you what
                considered style actually looks like.
              </p>
              <p style="margin:0;color:#6B6560;font-size:15px;font-style:italic;">Warmly,</p>
              <p style="margin:4px 0 0;color:#2C2C2C;font-size:20px;
                          font-weight:400;letter-spacing:0.06em;font-family:'Georgia',serif;">
                Ellie
              </p>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);margin:0 40px;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px;text-align:center;background:#F5EFE4;">
              <p style="margin:0;color:#8A8580;font-size:10px;
                         letter-spacing:0.18em;text-transform:uppercase;
                         font-family:'Arial',sans-serif;">
                ELLIE &middot; The Style Refresh &middot; Private Membership
              </p>
              <p style="margin:8px 0 0;color:#B5A99A;font-size:10px;font-family:'Arial',sans-serif;">
                You&rsquo;re receiving this because you subscribed at
                <a href="${siteUrl}" style="color:#C4956A;text-decoration:none;">${siteLabel}</a>.
                &nbsp;&middot;&nbsp;
                <a href="https://billing.stripe.com/p/login"
                   style="color:#C4956A;text-decoration:none;">Manage or cancel subscription</a>
              </p>
              <p style="margin:6px 0 0;color:#B5A99A;font-size:10px;font-family:'Arial',sans-serif;">
                ${process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh &middot; [ADD MAILING ADDRESS] &middot; New York, NY"}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Route handler ───────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const sessionId = req.nextUrl.searchParams.get("session_id");

  // No session ID → back to home
  if (!sessionId) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  try {
    // Retrieve and verify the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Reject incomplete or unpaid sessions
    if (session.status !== "complete" && session.payment_status !== "paid") {
      console.warn("Stripe session not complete:", session.status);
      return NextResponse.redirect(new URL("/", baseUrl));
    }

    const customerEmail = session.customer_details?.email ?? "";
    const customerName  = session.customer_details?.name  ?? "";

    // ── Send welcome email ──────────────────────────────────────
    const resendKey   = process.env.RESEND_API_KEY;
    const fromEmail   = process.env.RESEND_FROM_EMAIL;
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL;

    if (resendKey && fromEmail) {
      const resend = new Resend(resendKey);

      // Welcome email → the new member
      resend.emails.send({
        from:    `ELLIE <${fromEmail}>`,
        to:      customerEmail,
        subject: "Welcome to The Style Refresh — Your First Brief Arrives Monday",
        html:    buildWelcomeEmail(customerName, customerEmail),
      }).catch(err => console.error("Welcome email failed:", err));

      // Internal notification → your business inbox
      if (notifyEmail) {
        resend.emails.send({
          from:    `ELLIE <${fromEmail}>`,
          to:      notifyEmail,
          reply_to: customerEmail,
          subject: `New Style Refresh Member — ${customerName || customerEmail}`,
          html: `<p style="font-family:sans-serif;color:#111;">
            <strong>New paid subscriber:</strong><br/>
            Name: ${customerName}<br/>
            Email: ${customerEmail}<br/>
            Session: ${sessionId}<br/>
            Time: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}
          </p>`,
        }).catch(err => console.error("Notify email failed:", err));
      }

      // Add new member to Resend Audience (for future broadcast capability)
      const audienceId = process.env.RESEND_AUDIENCE_ID?.trim();
      if (audienceId && customerEmail) {
        resend.contacts.create({
          audienceId,
          email:     customerEmail,
          firstName: customerName.split(" ")[0] ?? "",
          lastName:  customerName.split(" ").slice(1).join(" ") ?? "",
          unsubscribed: false,
        }).catch(err => console.error("Resend audience add failed:", err));
      }
    } else {
      console.warn("[verify-session] Resend env vars not set — emails skipped.");
    }

    // ── Set 30-day access cookie and redirect to dashboard ──────
    const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

    response.cookies.set("ellie_access", "true", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 30,
      path:     "/",
    });

    /* Store customer ID so the dashboard can generate referral links */
    if (session.customer) {
      response.cookies.set("ellie_customer", String(session.customer), {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   60 * 60 * 24 * 30,
        path:     "/",
      });
    }

    return response;
  } catch (err) {
    console.error("Session verification error:", err);
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}

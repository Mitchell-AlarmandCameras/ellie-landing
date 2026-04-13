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
function buildWelcomeEmail(name: string, _email: string, hasTrial = false): string {
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

          <!-- Gold top bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td>
          </tr>

          ${hasTrial ? `
          <!-- Trial notice bar -->
          <tr>
            <td style="background:#2C2C2C;padding:12px 40px;text-align:center;">
              <p style="margin:0;color:#C4956A;font-size:11px;
                         letter-spacing:0.22em;text-transform:uppercase;
                         font-family:'Arial',sans-serif;">
                Your 7-day free trial is active &mdash; no charge until day 8
              </p>
            </td>
          </tr>` : ""}

          <!-- Header -->
          <tr>
            <td style="background:#EDE5D8;padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;color:#C4956A;font-size:10px;
                         letter-spacing:0.38em;text-transform:uppercase;
                         font-family:'Arial',sans-serif;">
                Private Membership · The Style Refresh
              </p>
              <h1 style="margin:0 0 10px;color:#2C2C2C;font-size:32px;
                          font-weight:400;letter-spacing:0.02em;font-family:'Georgia',serif;">
                ${hasTrial ? `Your trial starts now, ${firstName}.` : `You&rsquo;re in, ${firstName}.`}
              </h1>
              <p style="margin:0;color:#6B6560;font-size:14px;font-style:italic;line-height:1.7;">
                ${hasTrial
                  ? `You have 7 days completely free. Your first brief lands Monday morning &mdash; here&rsquo;s what to expect.`
                  : `Your first brief lands Monday morning. Until then &mdash; here&rsquo;s everything you need to know.`}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 0;">

              <!-- Step 1: Set up login -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:0 0 24px;background:#F5EFE4;border:1px solid #DDD4C5;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;
                               letter-spacing:0.28em;text-transform:uppercase;
                               font-family:'Arial',sans-serif;">
                      Step 1 — Set up your VIP Room login
                    </p>
                    <p style="margin:0 0 14px;color:#4A4A4A;font-size:14px;line-height:1.75;">
                      Go to <a href="${siteUrl}/login" style="color:#C4956A;text-decoration:none;">${siteLabel}/login</a>,
                      enter this email address and choose a password. That&rsquo;s it &mdash;
                      your VIP Room is waiting on the other side.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2C2C2C;">
                          <a href="${siteUrl}/login"
                             style="display:inline-block;padding:12px 28px;
                                    color:#FDFAF5;font-size:10px;
                                    letter-spacing:0.2em;text-transform:uppercase;
                                    text-decoration:none;font-family:'Arial',sans-serif;">
                            Set Up Login &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 2: What arrives Monday -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:0 0 24px;background:#F5EFE4;border:1px solid #DDD4C5;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#C4956A;font-size:10px;
                               letter-spacing:0.28em;text-transform:uppercase;
                               font-family:'Arial',sans-serif;">
                      Step 2 — What arrives every Monday
                    </p>
                    ${[
                      ["The Executive", "Complete professional look &mdash; boardroom authority, fully sourced"],
                      ["The Weekender", "Effortless weekend look &mdash; polished, casual, every item by brand and price"],
                      ["The Wildcard", "One deliberate departure &mdash; the piece they&rsquo;ll ask you about"],
                      ["Ellie&rsquo;s Note", "Sourcing insight on every item &mdash; why it works, who makes it best"],
                    ].map(([title, desc]) => `
                    <p style="margin:0 0 10px;color:#4A4A4A;font-size:14px;line-height:1.65;">
                      <span style="color:#C4956A;font-weight:600;font-family:'Arial',sans-serif;">${title}</span>
                      &nbsp;&mdash;&nbsp;${desc}
                    </p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- Step 3: Refer a friend -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:0 0 28px;background:#2C2C2C;border:1px solid #2C2C2C;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;
                               letter-spacing:0.28em;text-transform:uppercase;
                               font-family:'Arial',sans-serif;">
                      Step 3 — Earn free months
                    </p>
                    <p style="margin:0 0 14px;color:rgba(253,250,245,0.8);font-size:14px;line-height:1.75;">
                      Every friend you refer gets 50% off their first month &mdash;
                      and you get one month free when they join. Find your referral link
                      in your VIP Room dashboard.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#C4956A;">
                          <a href="${siteUrl}/dashboard"
                             style="display:inline-block;padding:12px 28px;
                                    color:#FDFAF5;font-size:10px;
                                    letter-spacing:0.2em;text-transform:uppercase;
                                    text-decoration:none;font-family:'Arial',sans-serif;">
                            Get My Referral Link &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Personal sign-off -->
              <p style="margin:0 0 6px;color:#4A4A4A;font-size:15px;line-height:1.8;">
                I&rsquo;ve been doing this for twenty years, and the brief I put out every Monday
                is the same standard I held for my private clients. You deserve that level of curation.
                That&rsquo;s exactly what you&rsquo;re getting.
              </p>
              <p style="margin:0 0 28px;color:#4A4A4A;font-size:15px;line-height:1.8;">
                See you Monday morning.
              </p>
              <p style="margin:0;color:#6B6560;font-size:14px;font-style:italic;">Warmly,</p>
              <p style="margin:4px 0 0;color:#2C2C2C;font-size:22px;
                          font-weight:400;letter-spacing:0.06em;font-family:'Georgia',serif;">
                Ellie
              </p>
            </td>
          </tr>

          <tr><td style="height:36px;"></td></tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;background:#F5EFE4;">
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
                ${process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh &middot; 3811 Ditmars Blvd #2278 &middot; Astoria, NY 11105"}
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

    // Reject sessions that are neither complete nor on a free trial
    const isTrial = session.payment_status === "no_payment_required";
    if (session.status !== "complete" && !isTrial) {
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
        subject: isTrial
          ? "Your 7-day free trial has started — first brief arrives Monday"
          : "Welcome to The Style Refresh — Your First Brief Arrives Monday",
        html:    buildWelcomeEmail(customerName, customerEmail, isTrial),
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

    // ── Set 30-day access cookie and redirect through /success (fires Google Ads conversion) ──
    const response = NextResponse.redirect(new URL("/success", baseUrl));

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

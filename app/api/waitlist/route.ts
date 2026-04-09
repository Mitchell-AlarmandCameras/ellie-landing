import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { Resend } from "resend";

/* ─── Zod schema (mirrors client-side) ───────────────────────── */
const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name is too long.")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please provide a valid email address."),
  /** Optional for backwards compatibility; defaults to full membership (all three looks). */
  styleInterest: z.enum(["executive", "weekender", "wildcard", "all"]).optional(),
});

const STYLE_LABELS: Record<string, string> = {
  executive: "The Executive",
  weekender: "The Weekender",
  wildcard: "The Wildcard",
  all: "All Three",
};

/* ─── HTML email builders ─────────────────────────────────────── */

/** Notification sent to your business inbox on every new application. */
const MAILING_ADDRESS = process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · [ADD MAILING ADDRESS] · New York, NY";

function buildAdminEmail(
  name: string,
  email: string,
  styleLabel: string,
  timestamp: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>New Waitlist Application — Ellie</title>
</head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">

          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td>
          </tr>

          <tr>
            <td style="background:#EDE5D8;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.32em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                Ellie · The Style Refresh
              </p>
              <h1 style="margin:8px 0 0;color:#2C2C2C;font-size:22px;font-weight:400;
                          letter-spacing:0.02em;font-family:'Georgia',serif;">
                New Waitlist Application
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;margin:28px 0 0;
                           background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 20px;color:#6B6560;font-size:13px;line-height:1.6;
                         font-family:'Arial',sans-serif;">
                Someone just joined the waitlist. Here are their details:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${[
                  ["Full Name",       name],
                  ["Email",           email],
                  ["Style Direction", styleLabel],
                  ["Applied At",      timestamp],
                ].map(([label, value]) => `
                <tr>
                  <td style="padding:11px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                              font-size:10px;color:#C4956A;letter-spacing:0.18em;
                              text-transform:uppercase;font-family:'Arial',sans-serif;
                              width:38%;vertical-align:top;">
                    ${label}
                  </td>
                  <td style="padding:11px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                              font-size:14px;color:#2C2C2C;font-family:'Georgia',serif;
                              vertical-align:top;">
                    ${value}
                  </td>
                </tr>`).join("")}
              </table>

              <p style="margin:24px 0 0;color:#B5A99A;font-size:12px;font-family:'Arial',sans-serif;line-height:1.6;">
                Reply to this email to reach the applicant directly.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 40px;text-align:center;background:#F5EFE4;">
              <p style="margin:0;color:#8A8580;font-size:10px;letter-spacing:0.18em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                ELLIE · The Style Refresh · Private Membership
              </p>
              <p style="margin:6px 0 0;color:#B5A99A;font-size:10px;font-family:'Arial',sans-serif;">
                ${MAILING_ADDRESS}
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

/** Confirmation sent to the applicant after they submit. */
function buildApplicantEmail(name: string, styleLabel: string): string {
  const firstName = name.split(" ")[0] ?? name;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>You&rsquo;re on the List — Ellie</title>
</head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">

          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td>
          </tr>

          <tr>
            <td style="background:#EDE5D8;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.32em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                The Style Refresh
              </p>
              <h1 style="margin:8px 0 0;color:#2C2C2C;font-size:28px;font-weight:400;
                          letter-spacing:0.02em;font-family:'Georgia',serif;">
                You&rsquo;re on the list.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;margin:28px 0 0;
                           background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Dear ${firstName},
              </p>
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Your application has been received. I review every name personally
                &mdash; you&rsquo;ll hear from me directly when the next spot opens.
              </p>
              <p style="margin:0 0 18px;color:#4A4A4A;font-size:16px;line-height:1.8;">
                Keep an eye on your inbox. The Style Refresh may be waiting.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:24px 0;background:#F5EFE4;border-left:2px solid #C4956A;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.25em;
                               text-transform:uppercase;font-family:'Arial',sans-serif;">
                      Your selected direction
                    </p>
                    <p style="margin:0;color:#2C2C2C;font-size:17px;font-family:'Georgia',serif;">
                      ${styleLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;color:#6B6560;font-size:15px;font-style:italic;">Warmly,</p>
              <p style="margin:0;color:#2C2C2C;font-size:20px;font-weight:400;
                          letter-spacing:0.06em;font-family:'Georgia',serif;">
                Ellie
              </p>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>

          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></td>
          </tr>

          <tr>
            <td style="padding:18px 40px;text-align:center;background:#F5EFE4;">
              <p style="margin:0;color:#8A8580;font-size:10px;letter-spacing:0.18em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                ELLIE &middot; The Style Refresh &middot; Private Membership
              </p>
              <p style="margin:6px 0 0;color:#B5A99A;font-size:10px;font-family:'Arial',sans-serif;">
                You received this because you requested to join our waitlist.
                This is a one-time confirmation — we will not email you again until a spot opens.
              </p>
              <p style="margin:6px 0 0;color:#B5A99A;font-size:10px;font-family:'Arial',sans-serif;">
                ${MAILING_ADDRESS}
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

/* ─── GET: quick check that Production has Resend env (no secrets returned) ─── */
export async function GET() {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasFrom = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const hasNotify = Boolean(process.env.RESEND_NOTIFY_EMAIL?.trim());
  const emailConfigured = hasKey && hasFrom && hasNotify;

  return NextResponse.json({
    emailConfigured,
    checks: {
      RESEND_API_KEY: hasKey,
      RESEND_FROM_EMAIL: hasFrom,
      RESEND_NOTIFY_EMAIL: hasNotify,
    },
    nextSteps: emailConfigured
      ? "Env looks complete for this deployment. Submit a test waitlist on the live site; check both inboxes and spam."
      : "In Vercel → Settings → Environment Variables → Production, set every missing item above, then Redeploy.",
  });
}

/* ─── Route handler ───────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? "Invalid submission.";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { name, email, styleInterest } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName    = name.trim();
    const interestKey    = styleInterest ?? "all";
    const styleLabel     = STYLE_LABELS[interestKey] ?? interestKey;
    const timestamp      = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/New_York",
    });

    /* ── 1. Always write to the local log (zero-config backup) ──
          /tmp is the only writable path on Vercel's serverless runtime.
          Locally this also works; the file appears at /tmp/waitlist.txt.   */
    try {
      const waitlistPath = path.join("/tmp", "waitlist.txt");
      fs.appendFileSync(
        waitlistPath,
        [new Date().toISOString(), normalizedEmail, trimmedName, styleLabel].join(" | ") + "\n",
        "utf8"
      );
    } catch (fsErr) {
      // Non-fatal — email delivery is the source of truth.
      console.warn("Waitlist file write failed (non-fatal):", fsErr);
    }

    /* ── 2. Send emails via Resend (skipped if env incomplete) ──
          Resend returns { data, error } — it does NOT throw on API errors,
          so we must check .error on each result.                          */
    const resendKey   = process.env.RESEND_API_KEY?.trim();
    const fromEmail   = process.env.RESEND_FROM_EMAIL?.trim();
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();

    let confirmationEmailSent = false;
    let adminNotificationSent = false;

    if (resendKey && fromEmail && notifyEmail) {
      const resend = new Resend(resendKey);

      const [adminOut, applicantOut] = await Promise.all([
        resend.emails.send({
          from: `Ellie <${fromEmail}>`,
          to: notifyEmail,
          replyTo: normalizedEmail,
          subject: `New Waitlist Application — ${trimmedName}`,
          html: buildAdminEmail(trimmedName, normalizedEmail, styleLabel, timestamp),
        }),
        resend.emails.send({
          from: `Ellie <${fromEmail}>`,
          to: normalizedEmail,
          subject: "You're on the Waitlist — The Style Refresh",
          html: buildApplicantEmail(trimmedName, styleLabel),
        }),
      ]);

      if (adminOut.error) {
        console.error("[waitlist] Admin notify failed (Resend):", adminOut.error);
      } else {
        adminNotificationSent = true;
      }

      if (applicantOut.error) {
        console.error("[waitlist] Applicant confirmation failed (Resend):", applicantOut.error);
      } else {
        confirmationEmailSent = true;
      }

      if (!adminNotificationSent && !confirmationEmailSent) {
        return NextResponse.json(
          {
            error:
              "We couldn't send email right now. Please try again in a few minutes or email us directly.",
          },
          { status: 500 }
        );
      }
    } else {
      const msg =
        "[waitlist] CRITICAL: Resend env incomplete — no emails sent (submitter sees success but you get nothing). " +
        "Set RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_NOTIFY_EMAIL in Vercel → Production → Environment Variables, then redeploy.";
      console.error(msg);
    }

    return NextResponse.json({
      success: true,
      /** False when Resend env missing, or confirmation email failed (friend may not get inbox mail). */
      confirmationEmailSent,
    });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

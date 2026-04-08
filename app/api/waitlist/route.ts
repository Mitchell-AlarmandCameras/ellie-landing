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
  styleInterest: z.enum(["executive", "weekender", "wildcard", "all"]),
});

const STYLE_LABELS: Record<string, string> = {
  executive: "The Executive",
  weekender: "The Weekender",
  wildcard: "The Wildcard",
  all: "All Three",
};

/* ─── HTML email builders ─────────────────────────────────────── */

/** Notification sent to your business inbox on every new application. */
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
<title>New Inner Circle Application</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

          <!-- Gold top border -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#D4AF37,#f5e9b8,#D4AF37);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:#000080;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#D4AF37;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;font-family:'Arial',sans-serif;">
                The Inner Circle
              </p>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:400;letter-spacing:0.05em;">
                New Application Received
              </h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px 32px;">
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;font-family:'Arial',sans-serif;">
                Someone just applied for the Inner Circle. Here are their details:
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${[
                  ["Full Name",       name],
                  ["Email",           email],
                  ["Style Direction", styleLabel],
                  ["Applied At",      timestamp],
                ].map(([label, value]) => `
                <tr>
                  <td style="padding:12px 16px;background:#f8f7f4;border-bottom:1px solid #eee;
                              font-size:11px;color:#000080;letter-spacing:0.18em;
                              text-transform:uppercase;font-family:'Arial',sans-serif;
                              width:38%;vertical-align:top;">
                    ${label}
                  </td>
                  <td style="padding:12px 16px;background:#f8f7f4;border-bottom:1px solid #eee;
                              font-size:14px;color:#111827;font-family:'Georgia',serif;
                              vertical-align:top;">
                    ${value}
                  </td>
                </tr>`).join("")}
              </table>

              <p style="margin:28px 0 0;color:#9ca3af;font-size:12px;font-family:'Arial',sans-serif;line-height:1.6;">
                You can reply directly to this email to reach the applicant.
              </p>
            </td>
          </tr>

          <!-- Gold bottom border -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);margin:0 40px;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;letter-spacing:0.15em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                Ellie · The Inner Circle
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
<title>Your Application — The Inner Circle</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

          <!-- Gold top border -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#D4AF37,#f5e9b8,#D4AF37);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:#000080;padding:36px 40px;text-align:center;">
              <p style="margin:0;color:#D4AF37;font-size:11px;letter-spacing:0.35em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                Private Membership
              </p>
              <h1 style="margin:14px 0 0;color:#ffffff;font-size:26px;font-weight:400;
                          letter-spacing:0.04em;line-height:1.3;">
                Welcome to the Elite Edit.
              </h1>
            </td>
          </tr>

          <!-- Divider line -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;">
                Dear ${firstName},
              </p>
              <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;">
                Your application for the Inner Circle has been received. I review
                every name on this list personally — you&rsquo;ll hear from me
                directly when the next spot opens.
              </p>
              <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.75;">
                In the meantime, keep an eye on your inbox. Those already inside
                the circle will tell you — the Monday brief alone is worth the wait.
              </p>

              <!-- Style callout -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="margin:28px 0;border-left:2px solid #D4AF37;background:#f8f7f4;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;color:#000080;font-size:11px;letter-spacing:0.22em;
                               text-transform:uppercase;font-family:'Arial',sans-serif;">
                      Your selected direction
                    </p>
                    <p style="margin:0;color:#000080;font-size:18px;font-weight:600;">
                      ${styleLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#374151;font-size:16px;line-height:1.75;">
                Warmly,
              </p>
              <p style="margin:0;color:#000080;font-size:17px;font-weight:600;
                          letter-spacing:0.04em;">
                Ellie
              </p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:32px;"></td></tr>

          <!-- Gold bottom border -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#d1d5db;font-size:11px;letter-spacing:0.15em;
                         text-transform:uppercase;font-family:'Arial',sans-serif;">
                Ellie &middot; Style Intelligence &middot; Private Membership
              </p>
              <p style="margin:6px 0 0;color:#e5e7eb;font-size:10px;font-family:'Arial',sans-serif;">
                You received this because you applied for the Inner Circle.
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
    const styleLabel     = STYLE_LABELS[styleInterest] ?? styleInterest;
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

    /* ── 2. Send emails via Resend (skipped if key not set) ───── */
    const resendKey    = process.env.RESEND_API_KEY;
    const fromEmail    = process.env.RESEND_FROM_EMAIL;   // e.g. notifications@yourdomain.com
    const notifyEmail  = process.env.RESEND_NOTIFY_EMAIL; // your business inbox

    if (resendKey && fromEmail && notifyEmail) {
      const resend = new Resend(resendKey);

      const [adminResult, applicantResult] = await Promise.allSettled([
        /* Admin notification → your business inbox */
        resend.emails.send({
          from: `Ellie <${fromEmail}>`,
          to:   notifyEmail,
          replyTo: normalizedEmail,
          subject: `New Inner Circle Application — ${trimmedName}`,
          html: buildAdminEmail(trimmedName, normalizedEmail, styleLabel, timestamp),
        }),

        /* Confirmation → the applicant */
        resend.emails.send({
          from: `Ellie <${fromEmail}>`,
          to:   normalizedEmail,
          subject: "Welcome to the Elite Edit — Your Application is In",
          html: buildApplicantEmail(trimmedName, styleLabel),
        }),
      ]);

      // Log any Resend errors server-side but don't fail the request —
      // the waitlist.txt entry already captured the lead.
      if (adminResult.status === "rejected") {
        console.error("Resend admin email failed:", adminResult.reason);
      }
      if (applicantResult.status === "rejected") {
        console.error("Resend applicant email failed:", applicantResult.reason);
      }

      // If BOTH emails failed (e.g. invalid API key), surface the error to the user.
      if (
        adminResult.status === "rejected" &&
        applicantResult.status === "rejected"
      ) {
        return NextResponse.json(
          { error: "We couldn't send your confirmation email. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Warn in dev if Resend env vars are missing, but still succeed.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[waitlist] Resend env vars not set — emails skipped. " +
          "Set RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_NOTIFY_EMAIL in .env.local"
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

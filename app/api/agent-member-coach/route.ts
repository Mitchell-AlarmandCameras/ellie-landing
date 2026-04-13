import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-member-coach
   THE MEMBER COACH — Ellie's retention and relationship specialist.

   Runs daily at 10 AM ET (14:00 UTC).

   What it does:
     Finds every paying member who is exactly 3, 7, or 14 days into their
     membership and sends them a personal email from Ellie.

     Day 3  — Onboarding check-in: makes sure they know how to use the brief,
               what to expect, how to shop the looks. Builds habit.
     Day 7  — One-week milestone: value reinforcement, what's coming next week,
               invite to reply with any questions. Reduces trial cancellations.
     Day 14 — Two-week mark: referral ask. Member is past the "trial" mindset
               and experiencing real value. Perfect moment for word-of-mouth.

   Tracks sent emails in Blob (ellie-coaching/sent.json) to guarantee no
   member receives the same email twice, even if the cron runs multiple times.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

function siteUrl(): string { return process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com"; }

/* ─── Email builders ───────────────────────────────────────────────────── */

function buildDay3Email(firstName: string): string {
  const base = siteUrl();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:36px 40px 28px;text-align:center;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Private Membership · The Style Refresh
    </p>
    <h1 style="margin:0;color:#2C2C2C;font-size:26px;font-weight:400;font-family:Georgia,serif;">
      How is it landing, ${firstName}?
    </h1>
  </td></tr>
  <tr><td style="padding:32px 40px 0;">
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      You're three days in. I wanted to check in personally and make sure you're getting
      everything out of The Style Refresh.
    </p>
    <p style="margin:0 0 16px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      A few things worth knowing:
    </p>

    <!-- Tips list -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid #E8DDD0;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          <strong style="color:#C4956A;">The brief arrives every Monday morning.</strong>
          Three complete looks with every piece sourced and linked. Open it over coffee.
        </p>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #E8DDD0;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          <strong style="color:#C4956A;">Every item is named by brand and price — no guessing, no searching blind.</strong>
          Search the brand directly and you'll find it immediately.
        </p>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #E8DDD0;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          <strong style="color:#C4956A;">The archive is yours.</strong>
          Log into your account at any time to browse every brief since you joined.
        </p>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          <strong style="color:#C4956A;">Questions are welcome.</strong>
          Just reply to this email and I personally respond within 24 hours.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      If anything about the brief is not landing for your style, tell me. This membership
      is meant to feel like it was built specifically for you.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr><td style="background:#2C2C2C;padding:14px 36px;text-align:center;">
        <a href="${base}/dashboard"
           style="color:#FDFAF5;font-family:Arial,sans-serif;font-size:11px;
                   letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;">
          View My Brief
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Georgia,serif;
               font-style:italic;line-height:1.7;">
      Warmly,<br/>Ellie<br/>
      <span style="font-size:11px;color:#B5A99A;">The Style Refresh</span>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildDay7Email(firstName: string): string {
  const base = siteUrl();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:36px 40px 28px;text-align:center;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      One week in · The Style Refresh
    </p>
    <h1 style="margin:0;color:#2C2C2C;font-size:26px;font-weight:400;font-family:Georgia,serif;">
      One week, ${firstName}. Here's what's next.
    </h1>
  </td></tr>
  <tr><td style="padding:32px 40px 0;">
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      You've now had a full week inside The Style Refresh. I hope Monday's brief gave you
      at least one thing you can actually wear — that's always the goal.
    </p>
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      What's coming this Sunday night:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #E8DDD0;margin-bottom:24px;">
      <tr><td style="background:#F5EFE4;padding:12px 20px;">
        <p style="margin:0;color:#C4956A;font-size:9px;letter-spacing:0.24em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">This week's brief</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
          Every Sunday night I curate three new complete looks — an executive, a weekender, and a wildcard.
          Each piece is named by brand and price. Your brief lands in your inbox before you wake up Monday.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      The membership is most valuable over time — the more weeks you receive, the more you
      understand your own style and the less time you spend deciding what to wear or buy.
      That's the real product.
    </p>
    <p style="margin:0 0 28px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      As always — reply any time. I read every message.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr><td style="background:#C4956A;padding:14px 36px;text-align:center;">
        <a href="${base}/dashboard"
           style="color:#FDFAF5;font-family:Arial,sans-serif;font-size:11px;
                   letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;">
          View My Account
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Georgia,serif;
               font-style:italic;line-height:1.7;">
      Warmly,<br/>Ellie<br/>
      <span style="font-size:11px;color:#B5A99A;">The Style Refresh</span>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildDay14Email(firstName: string, referralUrl: string): string {
  const base = siteUrl();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:36px 40px 28px;text-align:center;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Two weeks in · The Style Refresh
    </p>
    <h1 style="margin:0;color:#2C2C2C;font-size:26px;font-weight:400;font-family:Georgia,serif;">
      Know someone who'd love this, ${firstName}?
    </h1>
  </td></tr>
  <tr><td style="padding:32px 40px 0;">
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      Two weeks. You know what this is now — and whether it's working for you.
      I hope it is.
    </p>
    <p style="margin:0 0 20px;color:#4A4A4A;font-size:14px;font-family:Georgia,serif;line-height:1.8;">
      If you have a friend, colleague, or anyone in your life who would appreciate
      exactly this kind of thing — considered styling, no noise, sourced and ready
      every Monday — I'd love for you to pass it along.
    </p>

    <!-- Referral box -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #C4956A;background:#FDFAF5;margin-bottom:24px;">
      <tr><td style="background:#C4956A;padding:10px 20px;">
        <p style="margin:0;color:#FDFAF5;font-size:9px;letter-spacing:0.24em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">Your personal referral link</p>
      </td></tr>
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;color:#4A4A4A;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          Share this link and your friend gets their first month free. No pressure needed —
          just forward this email with a note.
        </p>
        <p style="margin:0;background:#F5EFE4;padding:10px 14px;word-break:break-all;">
          <a href="${referralUrl}" style="color:#C4956A;font-family:Arial,sans-serif;font-size:13px;">
            ${referralUrl}
          </a>
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;color:#4A4A4A;font-size:13px;font-family:Georgia,serif;
               line-height:1.8;font-style:italic;color:#6B6560;">
      No obligation. Only share it if you genuinely think they'd value it —
      that's the only kind of referral worth making.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
      <tr><td style="background:#2C2C2C;padding:14px 36px;text-align:center;">
        <a href="${base}/dashboard"
           style="color:#FDFAF5;font-family:Arial,sans-serif;font-size:11px;
                   letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;">
          View My Brief
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Georgia,serif;
               font-style:italic;line-height:1.7;">
      Thank you for being here,<br/>Ellie<br/>
      <span style="font-size:11px;color:#B5A99A;">The Style Refresh</span>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Load and save sent-tracking state from Blob ──────────────────────── */
type SentRecord = Record<string, string[]>;  /* customerId → ["day3", "day7", "day14"] */

async function loadSentRecord(): Promise<SentRecord> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-coaching/" });
    const file = blobs.find(b => b.pathname === "ellie-coaching/sent.json");
    if (!file) return {};
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json() as SentRecord;
  } catch {
    return {};
  }
}

async function saveSentRecord(record: SentRecord): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    await put("ellie-coaching/sent.json", JSON.stringify(record), {
      access:          "public",
      contentType:     "application/json",
      addRandomSuffix: false,
    });
  } catch (e) {
    console.error("[member-coach] Failed to save sent record:", e);
  }
}

/* ─── Handler ──────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ skipped: true, reason: "Stripe not configured" });
  }

  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
  const baseUrl     = siteUrl();

  if (!resendKey) {
    return NextResponse.json({ skipped: true, reason: "Resend not configured" });
  }

  const resend = new Resend(resendKey);

  /* ── Load sent-email tracking ──────────────────────────────────── */
  const sentRecord  = await loadSentRecord();
  let   sentUpdated = false;

  /* ── Fetch active Stripe subscriptions ────────────────────────── */
  const now       = Date.now();
  const MS_PER_DAY = 86_400_000;

  /* We look back 15 days to catch all day-3/7/14 windows */
  const cutoffTs   = Math.floor((now - 15 * MS_PER_DAY) / 1000);

  const subscriptions = await stripe.subscriptions.list({
    status:        "active",
    created:       { gte: cutoffTs },
    expand:        ["data.customer"],
    limit:         100,
  });

  const emailsSent: Array<{ email: string; day: string }> = [];

  for (const sub of subscriptions.data) {
    const customer = sub.customer as Stripe.Customer;
    if (!customer || typeof customer === "string") continue;
    if (!customer.email) continue;

    const customerId = customer.id;
    const firstName  = (customer.name?.split(" ")[0]) || "there";
    const createdMs  = sub.created * 1000;
    const daysIn     = Math.floor((now - createdMs) / MS_PER_DAY);

    const alreadySent = sentRecord[customerId] ?? [];

    /* Check each coaching milestone */
    type CoachingDay = "day3" | "day7" | "day14";
    const milestones: Array<{ key: CoachingDay; target: number }> = [
      { key: "day3",  target: 3  },
      { key: "day7",  target: 7  },
      { key: "day14", target: 14 },
    ];

    for (const { key, target } of milestones) {
      /* Send if daysIn is within 1 day of target and not already sent */
      if (daysIn >= target && daysIn < target + 2 && !alreadySent.includes(key)) {
        let html    = "";
        let subject = "";
        let refUrl  = `${baseUrl}/?ref=${customerId.slice(-8)}`;

        if (key === "day3") {
          html    = buildDay3Email(firstName);
          subject = `Three days in — a few things worth knowing, ${firstName}`;
        } else if (key === "day7") {
          html    = buildDay7Email(firstName);
          subject = `One week, ${firstName}. Here's what's next.`;
        } else {
          html    = buildDay14Email(firstName, refUrl);
          subject = `Two weeks in, ${firstName} — know anyone who'd love this?`;
        }

        try {
          await resend.emails.send({
            from:    `Ellie <${fromEmail}>`,
            to:      customer.email,
            subject,
            html,
          });

          sentRecord[customerId] = [...alreadySent, key];
          sentUpdated = true;
          emailsSent.push({ email: customer.email, day: key });
          console.log(`[member-coach] Sent ${key} email to ${customer.email} (day ${daysIn})`);
        } catch (e) {
          console.error(`[member-coach] Failed to send ${key} to ${customer.email}:`, e);
        }
      }
    }
  }

  /* ── Save updated tracking state ─────────────────────────────── */
  if (sentUpdated && process.env.BLOB_READ_WRITE_TOKEN) {
    await saveSentRecord(sentRecord);
  }

  console.log(`[member-coach] Done — ${emailsSent.length} coaching email(s) sent`);
  return NextResponse.json({
    ok:         true,
    emailsSent: emailsSent.length,
    details:    emailsSent,
  });
}

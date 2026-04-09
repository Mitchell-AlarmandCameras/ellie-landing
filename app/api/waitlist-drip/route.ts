import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/waitlist-drip
   Vercel Cron runs this every day at 9:00 AM ET (13:00 UTC).
   Reads all contacts in the Resend audience, checks how many days since
   they joined, and sends the right drip email:
     Day 3  → "Still thinking about it?" — soft reminder + tease
     Day 7  → "Here's what you missed" — this week's looks teaser + strong CTA
     Day 12 → "Last note from Ellie" — personal final nudge

   How it avoids duplicates: each person only enters the 3-day, 7-day,
   or 12-day window ONCE (the cron runs daily, so the window is exactly
   1 day wide). If the cron misses a run, that drip simply doesn't send —
   better than a double-send.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime    = "nodejs";
export const maxDuration = 60;

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
const JOIN_URL = `${SITE_URL}/#join`;

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

/* ─── Email 1 — Day 3: "Still thinking about it?" ────────────────────── */
function drip1Html(firstName: string): string {
  const name = firstName?.trim() || "there";
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY").trim();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Still thinking, ${name}?</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0;color:#C4956A;font-size:10px;letter-spacing:0.34em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · The Style Refresh
    </p>
  </td></tr>
  <tr><td style="padding:32px 36px 8px;">
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Hi ${name},
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      You signed up for the waitlist a few days ago, and I wanted to check in.
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Every Monday morning, members wake up to three complete looks in their inbox — 
      sourced from the best retailers right now, with direct buy links to every single item. 
      No browsing, no guessing, no wasted hours. Just open, click, and dress.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#6B6560;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
      This week I'm watching how the season is shifting — the pieces moving fastest 
      right now are the ones that crossover from desk to dinner. Those are exactly the 
      kinds of looks I build the brief around.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 32px;text-align:center;">
    <a href="${JOIN_URL}"
       style="display:inline-block;background:#2C2C2C;color:#FDFAF5;padding:14px 40px;
               font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;
               text-transform:uppercase;text-decoration:none;">
      Join for $19/month
    </a>
    <p style="margin:14px 0 0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;">
      Cancel anytime. Secure checkout via Stripe.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:18px 36px 24px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      You're receiving this because you joined The Style Refresh waitlist.<br/>
      <a href="${SITE_URL}/unsubscribe?email={{email}}" style="color:#C4956A;">Remove me from the waitlist</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Email 2 — Day 7: "Here's what members got this week" ───────────── */
function drip2Html(firstName: string, preview: Record<string, unknown> | null): string {
  const name = firstName?.trim() || "there";
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY").trim();

  type PreviewLook = { label: string; tagline: string; teaser?: string[] };
  const looks = (preview?.looks as PreviewLook[]) ?? [];
  const looksSnippet = looks.length
    ? looks.map(l => `
      <tr>
        <td style="padding:12px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;">
          <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.26em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">
            ${l.label ?? ""}
          </p>
          <p style="margin:0 0 4px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;font-style:italic;">
            &ldquo;${l.tagline ?? ""}&rdquo;
          </p>
          ${(l.teaser ?? []).slice(0, 3).map(t => `
          <p style="margin:2px 0;font-size:11px;color:#6B6560;font-family:Arial,sans-serif;">· ${t}</p>`).join("")}
        </td>
      </tr>`).join("")
    : `<tr><td style="padding:14px;font-size:13px;color:#6B6560;font-family:Georgia,serif;font-style:italic;">
         This week's edit is live for members — join now to see it in full.
       </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>This week's edit, ${name}</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0 0 2px;color:#C4956A;font-size:10px;letter-spacing:0.34em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · The Style Refresh
    </p>
    <p style="margin:4px 0 0;color:#2C2C2C;font-size:13px;font-family:Georgia,serif;font-style:italic;">
      ${preview?.weekOf ? `Week of ${preview.weekOf}` : "This week's edit"}
    </p>
  </td></tr>
  <tr><td style="padding:28px 36px 16px;">
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Hi ${name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Members opened their inbox this Monday to three complete looks — brand, price, 
      and a direct link to every single item. Here's a preview of what they received:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      ${looksSnippet}
    </table>
    <p style="margin:0 0 10px;font-size:13px;color:#4A4A4A;font-family:Georgia,serif;line-height:1.7;
               background:#F0E8D8;padding:14px 16px;border-left:3px solid #C4956A;">
      Members see the full look — every item, every price, every direct buy link. 
      The waitlist only sees this teaser.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 32px;text-align:center;">
    <a href="${JOIN_URL}"
       style="display:inline-block;background:#C4956A;color:#FDFAF5;padding:15px 42px;
               font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;
               text-transform:uppercase;text-decoration:none;">
      Get Full Access — $19/month
    </a>
    <p style="margin:12px 0 0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;">
      Cancel anytime · Secure checkout via Stripe
    </p>
  </td></tr>
  <tr><td style="padding:0 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:18px 36px 24px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      You're receiving this because you joined The Style Refresh waitlist.<br/>
      <a href="${SITE_URL}/unsubscribe?email={{email}}" style="color:#C4956A;">Remove me from the waitlist</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Email 3 — Day 12: "Last note from Ellie" ───────────────────────── */
function drip3Html(firstName: string): string {
  const name = firstName?.trim() || "there";
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY").trim();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>A last note, ${name}</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:560px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0;color:#C4956A;font-size:10px;letter-spacing:0.34em;text-transform:uppercase;font-family:Arial,sans-serif;">
      A note from Ellie
    </p>
  </td></tr>
  <tr><td style="padding:32px 36px 10px;">
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      Hi ${name},
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      I don't like to be persistent — so this is the last time I'll mention it.
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      I've spent 20 years in fashion consulting. What I built here is simple: 
      every Monday, you get exactly three looks — the kind I would actually put on a real client. 
      Sourced from real brands. Priced for the real world. With a direct link to buy every single piece.
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;line-height:1.75;">
      It's $19 a month. You can cancel the same day if it's not right. I don't make it complicated 
      because the point is to make your life <em>less</em> complicated.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#6B6560;font-family:Georgia,serif;line-height:1.7;font-style:italic;">
      If the timing isn't right, your spot on the waitlist is permanent. I'll be here 
      when you're ready.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;">
      — Ellie
    </p>
  </td></tr>
  <tr><td style="padding:8px 36px 32px;text-align:center;">
    <a href="${JOIN_URL}"
       style="display:inline-block;background:#2C2C2C;color:#FDFAF5;padding:14px 40px;
               font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;
               text-transform:uppercase;text-decoration:none;">
      Join for $19/month — Start This Monday
    </a>
    <p style="margin:12px 0 0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;">
      No commitment. Cancel anytime.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:18px 36px 24px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      You're receiving this because you joined The Style Refresh waitlist.<br/>
      <a href="${SITE_URL}/unsubscribe?email={{email}}" style="color:#C4956A;">Remove me from the waitlist</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Cron handler ────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  /* Authenticate the cron request */
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const apiKey     = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return NextResponse.json({
      ok: false,
      message: "RESEND_API_KEY or RESEND_AUDIENCE_ID not set — drip skipped",
    });
  }

  const resend = new Resend(apiKey);

  /* Fetch current week preview to use in day-7 email */
  let preview: Record<string, unknown> | null = null;
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "ellie-preview/current" });
      if (blobs[0]) {
        const r = await fetch(blobs[0].url);
        if (r.ok) preview = await r.json();
      }
    }
  } catch {
    /* preview stays null — drip2 will show a generic teaser */
  }

  /* List all audience contacts */
  let contacts: Array<{
    id: string;
    email: string;
    first_name?: string;
    created_at: string;
    unsubscribed: boolean;
  }> = [];

  try {
    const { data, error } = await resend.contacts.list({ audienceId });
    if (error) throw new Error(String(error));
    contacts = (data as { data: typeof contacts })?.data ?? [];
  } catch (err) {
    console.error("[drip] Failed to fetch audience contacts:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }

  const results: string[] = [];

  for (const contact of contacts) {
    if (contact.unsubscribed) continue;

    const days = daysSince(contact.created_at);
    const firstName = contact.first_name ?? "";
    const to        = contact.email;

    /* Day 3 — soft reminder */
    if (days === 3) {
      const { error } = await resend.emails.send({
        from:    `Ellie <${process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com"}>`,
        to,
        subject: `Still thinking about The Style Refresh, ${firstName?.trim() || "there"}?`,
        html:    drip1Html(firstName),
        headers: { "List-Unsubscribe": `<${SITE_URL}/unsubscribe>` },
      });
      results.push(error ? `drip1 FAIL ${to}` : `drip1 OK ${to}`);
      console.log(`[drip] day3 → ${to}`, error ?? "sent");
    }

    /* Day 7 — show this week's looks preview */
    if (days === 7) {
      const { error } = await resend.emails.send({
        from:    `Ellie <${process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com"}>`,
        to,
        subject: `This is what members received this Monday`,
        html:    drip2Html(firstName, preview),
        headers: { "List-Unsubscribe": `<${SITE_URL}/unsubscribe>` },
      });
      results.push(error ? `drip2 FAIL ${to}` : `drip2 OK ${to}`);
      console.log(`[drip] day7 → ${to}`, error ?? "sent");
    }

    /* Day 12 — final personal note */
    if (days === 12) {
      const { error } = await resend.emails.send({
        from:    `Ellie <${process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com"}>`,
        to,
        subject: `A quick note before I stop`,
        html:    drip3Html(firstName),
        headers: { "List-Unsubscribe": `<${SITE_URL}/unsubscribe>` },
      });
      results.push(error ? `drip3 FAIL ${to}` : `drip3 OK ${to}`);
      console.log(`[drip] day12 → ${to}`, error ?? "sent");
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { put, get } from "@vercel/blob";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-retention
   THE RETENTION MANAGER — Ellie's CRM retention specialist.

   Equivalent role at: Sephora (CRM/Retention Team), Net-a-Porter (Customer
   Loyalty), Vogue (Subscriber Retention). Every major subscription brand
   has dedicated retention workflows to prevent churn before it happens.

   Runs daily at 3 PM ET (19:00 UTC).

   What it does:
     1. Queries Stripe for all active subscribers
     2. Identifies at-risk members: subscribed 21–60 days ago (honeymoon over,
        not yet committed long-term — highest churn window industry-wide)
     3. Generates a personalized win-back email via Claude for each at-risk member
     4. Sends win-back emails to members not yet contacted this cycle
     5. Tracks sent state in Blob to never double-contact
     6. Emails owner daily retention summary (who was contacted, total at-risk count)
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
const BLOB_KEY = "ellie-retention/contacted.json";

interface ContactedRecord { email: string; contactedAt: string }

async function getContacted(): Promise<ContactedRecord[]> {
  try {
    const blob = await get(BLOB_KEY);
    if (!blob) return [];
    const res = await fetch(blob.url);
    return await res.json() as ContactedRecord[];
  } catch { return []; }
}

async function saveContacted(records: ContactedRecord[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(records), { access: "public", addRandomSuffix: false });
}

async function generateRetentionEmail(
  memberName: string,
  daysSinceJoined: number,
  anthropicKey: string,
): Promise<string> {
  const prompt = `You are Ellie — the founder of Style by Ellie, a personal styling membership.

Write a short, personal retention email to ${memberName || "a member"} who has been a member for ${daysSinceJoined} days. 
They're in the critical 21–60 day window where members either get value and stay, or quietly cancel.

The email should:
- Feel like it's from a real person, not automated
- Reference something specific about this time of year (Spring 2026) and what's in the current edit
- Remind them of something they might have missed in the VIP Room
- Include a soft CTA to log in and see this week's looks
- Be 3–4 short paragraphs, conversational, no fluff
- Sign as "Ellie"

Return ONLY the plain email body text, no subject line, no HTML.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return "";
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content[0]?.text?.trim() ?? "";
}

function buildEmailHtml(memberName: string, bodyText: string): string {
  const paragraphs = bodyText.split("\n\n").filter(Boolean);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;padding:48px 24px;">
  <p style="margin:0 0 8px;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie</p>
  ${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:15px;color:#2C2C2C;line-height:1.75;font-family:Georgia,serif;">${p}</p>`).join("")}
  <div style="margin:32px 0;">
    <a href="${SITE_URL}/dashboard"
       style="display:inline-block;background:#3D2B1F;color:#fff;padding:12px 28px;
              border-radius:4px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
      See This Week's Edit →
    </a>
  </div>
  <p style="margin:40px 0 0;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">Style by Ellie · Members Only</p>
</div>
</body></html>`;
}

function buildOwnerSummary(contacted: string[], atRiskCount: number, totalActive: number): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie · Retention Manager</p>
  <h2 style="margin:8px 0 4px;font-size:20px;color:#2C1A0E;font-weight:400;">Daily Retention Report</h2>
  <p style="margin:0 0 24px;font-size:12px;color:#7A5C3A;">${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #E8DDD0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#2C1A0E;font-family:Georgia,serif;">${totalActive}</div>
      <div style="font-size:10px;color:#9A7B5A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Active Members</div>
    </div>
    <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #E8DDD0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:${atRiskCount > 0 ? "#D4A017" : "#2D6A4F"};font-family:Georgia,serif;">${atRiskCount}</div>
      <div style="font-size:10px;color:#9A7B5A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">At-Risk (21–60d)</div>
    </div>
    <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #E8DDD0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#2D6A4F;font-family:Georgia,serif;">${contacted.length}</div>
      <div style="font-size:10px;color:#9A7B5A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Contacted Today</div>
    </div>
  </div>
  ${contacted.length > 0 ? `<p style="font-size:12px;color:#555;margin-bottom:8px;">Win-back emails sent to:</p>${contacted.map(e => `<p style="font-size:12px;color:#333;margin:3px 0;">· ${e}</p>`).join("")}` : `<p style="font-size:12px;color:#2D6A4F;">No new at-risk members to contact today.</p>`}
  <p style="margin:32px 0 0;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">Style by Ellie · Retention Manager</p>
</div>
</body></html>`;
}

export async function GET() {
  const stripeKey    = process.env.STRIPE_SECRET_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const resend       = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail   = process.env.OWNER_EMAIL ?? "owner@stylebyellie.com";

  if (!stripeKey) {
    return NextResponse.json({ ok: false, error: "STRIPE_SECRET_KEY not set" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  try {
    /* ── Fetch active subscribers from Stripe ── */
    const subs = await stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.customer"] });

    const now = Date.now();
    const MS_21 = 21 * 24 * 60 * 60 * 1000;
    const MS_60 = 60 * 24 * 60 * 60 * 1000;

    /* At-risk window: 21–60 days since subscription started */
    const atRisk = subs.data.filter(sub => {
      const age = now - sub.created * 1000;
      return age >= MS_21 && age <= MS_60;
    });

    const contacted       = await getContacted();
    const contactedEmails = new Set(contacted.map(c => c.email));
    const newContacted:   ContactedRecord[] = [];
    const emailsSent:     string[] = [];

    for (const sub of atRisk) {
      const customer = sub.customer as Stripe.Customer;
      if (!customer?.email) continue;
      if (contactedEmails.has(customer.email)) continue;

      const daysSince = Math.floor((now - sub.created * 1000) / (24 * 60 * 60 * 1000));
      const name = (customer.name ?? "").split(" ")[0] || "there";

      const bodyText = anthropicKey
        ? await generateRetentionEmail(name, daysSince, anthropicKey)
        : `Hi ${name},\n\nJust checking in — hope you've been enjoying your Style by Ellie membership.\n\nThis week's edit is live in your VIP Room with three fresh looks for Spring. Log in and take a look.\n\nEllie`;

      if (!bodyText) continue;

      await resend.emails.send({
        from:    "Ellie <ellie@stylebyellie.com>",
        to:      customer.email,
        subject: `A quick note from Ellie`,
        html:    buildEmailHtml(name, bodyText),
      });

      newContacted.push({ email: customer.email, contactedAt: new Date().toISOString() });
      emailsSent.push(customer.email);
    }

    /* Save updated contacted list */
    if (newContacted.length > 0) {
      await saveContacted([...contacted, ...newContacted]);
    }

    /* Email owner summary */
    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject: emailsSent.length > 0
        ? `Retention: ${emailsSent.length} win-back email${emailsSent.length > 1 ? "s" : ""} sent today`
        : `Retention: No new at-risk members today (${atRisk.length} in window, ${subs.data.length} total)`,
      html: buildOwnerSummary(emailsSent, atRisk.length, subs.data.length),
    });

    return NextResponse.json({
      ok:           true,
      totalActive:  subs.data.length,
      atRiskCount:  atRisk.length,
      emailsSent:   emailsSent.length,
    });

  } catch (err) {
    console.error("[agent-retention]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

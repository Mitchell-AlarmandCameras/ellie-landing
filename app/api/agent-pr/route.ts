import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-pr
   THE PR DIRECTOR — Ellie's press and media relations team.

   Equivalent role at: Vogue (Communications Director), Net-a-Porter (PR & 
   Communications), any major DTC brand (Head of PR). Every credible brand
   sends press releases. This drives backlinks, editorial coverage, and SEO.

   Runs on the 1st of every month at noon ET (16:00 UTC).

   What it does:
     1. Pulls current member + MRR data from Stripe
     2. Uses Claude to write a polished press release for the month's milestone
     3. Includes a fashion editorial angle (seasonal direction, brand positioning)
     4. Emails owner the ready-to-send press release + distribution targets
     5. Also generates a pitch email to send to 5 fashion bloggers/journalists
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

const SITE_URL   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
const SITE_NAME  = "The Style Refresh by Ellie";
const NICHE      = "women's fashion curation";

async function generatePressRelease(
  memberCount: number,
  mrr: number,
  anthropicKey: string,
): Promise<{ pressRelease: string; pitchEmail: string }> {
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prompt = `You are the PR Director for ${SITE_NAME}, a $19/month ${NICHE} membership.

Current stats: ${memberCount} active members, $${mrr} monthly recurring revenue.

Write two things:

1. A SHORT press release (250–300 words) announcing the brand's Spring 2026 editorial direction and momentum. Make it sound prestigious and credible — the tone of a Net-a-Porter press release. Include: headline, dateline (${month}, New York), 2-3 body paragraphs, boilerplate. Focus on the editorial mission and what makes it different, not just the numbers.

2. A pitch email (150 words) to send to fashion bloggers and journalists. Personal, specific, why their readers would care. Should feel like it's from a real PR person, not a template.

Return ONLY a JSON object:
{
  "pressRelease": "<full press release text with newlines as \\n>",
  "pitchEmail": "<pitch email text with newlines as \\n>"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data   = await res.json() as { content: Array<{ text: string }> };
  const raw    = data.content[0]?.text?.trim() ?? "{}";
  const json   = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  return JSON.parse(json) as { pressRelease: string; pitchEmail: string };
}

function buildPREmail(pressRelease: string, pitchEmail: string): string {
  const prHtml   = pressRelease.replace(/\n/g, "<br/>").replace(/\n\n/g, "<br/><br/>");
  const pitchHtml = pitchEmail.replace(/\n/g, "<br/>");

  const DISTRIBUTION_TARGETS = [
    "WhoWhatWear — tips@whowhatwear.com",
    "PureWow Style — editorial@purewow.com",
    "The Zoe Report — editorial@thezoereport.com",
    "Refinery29 — tips@refinery29.com",
    "StyleCaster — editorial@stylecaster.com",
  ];

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:640px;margin:0 auto;padding:40px 20px;">

  <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie · PR Director</p>
  <h1 style="margin:8px 0 4px;font-size:22px;color:#2C1A0E;font-weight:400;">Monthly Press Package</h1>
  <p style="margin:0 0 32px;font-size:12px;color:#7A5C3A;">${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</p>

  <h2 style="margin:0 0 12px;font-size:14px;color:#C4956A;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,sans-serif;">Press Release — Ready to Send</h2>
  <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:28px;">
    <p style="margin:0;font-size:13px;color:#2C1A0E;line-height:1.8;font-family:Georgia,serif;">${prHtml}</p>
  </div>

  <h2 style="margin:0 0 12px;font-size:14px;color:#C4956A;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,sans-serif;">Blogger Pitch Email</h2>
  <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:28px;">
    <p style="margin:0;font-size:13px;color:#2C1A0E;line-height:1.8;font-family:Georgia,serif;">${pitchHtml}</p>
  </div>

  <h2 style="margin:0 0 12px;font-size:14px;color:#C4956A;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,sans-serif;">Suggested Distribution Targets</h2>
  <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:28px;">
    ${DISTRIBUTION_TARGETS.map(t => `<p style="margin:4px 0;font-size:12px;color:#555;">· ${t}</p>`).join("")}
    <p style="margin:12px 0 0;font-size:11px;color:#999;">Send the pitch email to each. Paste the press release as attachment or inline. Reply rate is typically 5–15% for cold pitches with strong positioning.</p>
  </div>

  <a href="${SITE_URL}"
     style="display:inline-block;background:#3D2B1F;color:#fff;padding:12px 28px;border-radius:4px;
            text-decoration:none;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">
    View Site →
  </a>

  <p style="margin:36px 0 0;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">Style by Ellie · PR Director</p>
</div>
</body></html>`;
}

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const stripeKey    = process.env.STRIPE_SECRET_KEY ?? "";
  const resend       = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail   = process.env.OWNER_EMAIL ?? "owner@stylebyellie.com";

  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  let memberCount = 0;
  let mrr         = 0;

  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey);
      const subs   = await stripe.subscriptions.list({ status: "active", limit: 100 });
      memberCount  = subs.data.length;
      mrr = Math.round(subs.data.reduce((sum, s) => sum + (s.items.data[0]?.price?.unit_amount ?? 1900) / 100, 0));
    } catch { /* use defaults */ }
  }

  try {
    const { pressRelease, pitchEmail } = await generatePressRelease(memberCount, mrr, anthropicKey);
    const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject: `PR Package Ready — ${SITE_NAME} — ${month}`,
      html:    buildPREmail(pressRelease, pitchEmail),
    });

    return NextResponse.json({ ok: true, month, memberCount, mrr });

  } catch (err) {
    console.error("[agent-pr]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { put } from "@vercel/blob";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-competitor-intel
   THE COMPETITIVE INTELLIGENCE DIRECTOR — Ellie's market intelligence team.

   Equivalent role at: Net-a-Porter (Buying & Market Intelligence),
   Vogue Business (Editorial Intelligence), McKinsey Fashion (Strategy).
   Every major brand tracks what competitors are doing and where the gaps are.

   Runs every Wednesday at 10 AM ET (14:00 UTC).

   What it does:
     1. Uses Claude to synthesize the current competitive landscape in accessible
        luxury women's fashion — what Net-a-Porter, Vogue, Harper's Bazaar,
        Revolve, and direct competitors are pushing this week
     2. Identifies Ellie's differentiation opportunities
     3. Saves brief to Blob: ellie-intel/current.json (read by CEO + Director-Content)
     4. Emails owner a competitive intelligence card
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

const BLOB_KEY = "ellie-intel/fashion-current.json";

interface IntelBrief {
  weekOf:            string;
  competitorFocus:   string[];
  marketGaps:        string[];
  ellieAdvantage:    string;
  watchOut:          string[];
  opportunityThisWeek: string;
  generatedAt:       string;
}

async function generateIntelBrief(anthropicKey: string): Promise<IntelBrief> {
  const today  = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const weekOf = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const prompt = `Today is ${today}. You are Ellie's competitive intelligence director.

Synthesize the current competitive landscape for a $19/month women's fashion curation membership — specifically what the major players in accessible luxury editorial are doing RIGHT NOW in Spring 2026:

Competitors to analyze:
- Net-a-Porter (editorial curation, The Edit)
- Vogue / Harper's Bazaar (trend direction)  
- Who What Wear (accessible editorial)
- Revolve (influencer-driven curation)
- Stitch Fix / Rent the Runway (subscription fashion)
- The Real Real (resale luxury)

Ellie's positioning: curated weekly looks (Executive / Weekender / Wildcard), $19/month, professional women 34–50, anti-fast-fashion, The Row aesthetic at accessible prices.

Return ONLY a valid JSON object:
{
  "weekOf": "${weekOf}",
  "competitorFocus": ["3-4 things competitors are heavily pushing this week that could overlap with Ellie"],
  "marketGaps": ["3-4 things the market is NOT doing well that Ellie could own"],
  "ellieAdvantage": "2-3 sentences on what genuinely differentiates Ellie from every competitor right now",
  "watchOut": ["2-3 competitive risks or moves to monitor"],
  "opportunityThisWeek": "One specific editorial or marketing move Ellie could make THIS week to differentiate",
  "generatedAt": "${new Date().toISOString()}"
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
      max_tokens: 900,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data   = await res.json() as { content: Array<{ text: string }> };
  const raw    = data.content[0]?.text?.trim() ?? "{}";
  const json   = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  return JSON.parse(json) as IntelBrief;
}

function buildIntelEmail(brief: IntelBrief): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

  const gapItems  = brief.marketGaps.map(g  => `<p style="margin:3px 0;font-size:12px;color:#2D6A4F;">✦ ${g}</p>`).join("");
  const compItems = brief.competitorFocus.map(c => `<p style="margin:3px 0;font-size:12px;color:#555;">· ${c}</p>`).join("");
  const watchItems = brief.watchOut.map(w => `<p style="margin:3px 0;font-size:12px;color:#8B3A22;">▲ ${w}</p>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;margin-bottom:28px;">
    <p style="margin:0;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#9A7B5A;font-family:Arial,sans-serif;">Style by Ellie</p>
    <h1 style="margin:8px 0 4px;font-size:22px;color:#2C1A0E;font-weight:400;">Competitive Intelligence Brief</h1>
    <p style="margin:0;font-size:12px;color:#7A5C3A;">Week of ${brief.weekOf}</p>
  </div>

  <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:16px;">
    <p style="margin:0 0 8px;font-size:10px;color:#C4956A;letter-spacing:0.15em;text-transform:uppercase;">Ellie's Advantage Right Now</p>
    <p style="margin:0;font-size:14px;color:#2C1A0E;line-height:1.7;font-family:Georgia,serif;font-style:italic;">${brief.ellieAdvantage}</p>
  </div>

  <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:16px;">
    <p style="margin:0 0 10px;font-size:10px;color:#2D6A4F;letter-spacing:0.15em;text-transform:uppercase;">Market Gaps Ellie Can Own</p>
    ${gapItems}
  </div>

  <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #E8DDD0;margin-bottom:16px;">
    <p style="margin:0 0 10px;font-size:10px;color:#9A7B5A;letter-spacing:0.15em;text-transform:uppercase;">What Competitors Are Pushing</p>
    ${compItems}
  </div>

  <div style="background:#FEF9F0;padding:20px;border-radius:8px;border:1px solid #C4956A;margin-bottom:16px;">
    <p style="margin:0 0 8px;font-size:10px;color:#C4956A;letter-spacing:0.15em;text-transform:uppercase;">This Week's Opportunity</p>
    <p style="margin:0;font-size:13px;color:#2C1A0E;line-height:1.6;">${brief.opportunityThisWeek}</p>
  </div>

  <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #E8DDD0;">
    <p style="margin:0 0 10px;font-size:10px;color:#8B3A22;letter-spacing:0.15em;text-transform:uppercase;">Watch Out</p>
    ${watchItems}
  </div>

  <p style="margin:36px 0 0;text-align:center;font-size:10px;color:#C4A882;letter-spacing:0.15em;text-transform:uppercase;">Style by Ellie · Competitive Intelligence</p>
</div>
</body></html>`;
}

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const resend       = new Resend(process.env.RESEND_API_KEY);
  const ownerEmail   = process.env.OWNER_EMAIL ?? "owner@stylebyellie.com";

  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  try {
    const brief = await generateIntelBrief(anthropicKey);

    await put(BLOB_KEY, JSON.stringify(brief), { access: "public", addRandomSuffix: false });

    await resend.emails.send({
      from:    "Style by Ellie <ellie@stylebyellie.com>",
      to:      ownerEmail,
      subject: `Competitive Intel: ${brief.opportunityThisWeek.slice(0, 60)}…`,
      html:    buildIntelEmail(brief),
    });

    return NextResponse.json({ ok: true, weekOf: brief.weekOf, gapsFound: brief.marketGaps.length });

  } catch (err) {
    console.error("[agent-competitor-intel]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

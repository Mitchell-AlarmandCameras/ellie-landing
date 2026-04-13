import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-trend-scout
   THE TREND SCOUT — Ellie's research analyst.

   Runs every Sunday at 2 PM ET (18:00 UTC) — 4 hours before the Curator.

   What it does:
     1. Synthesizes a structured trend brief using Claude's knowledge of current
        fashion (seasonal patterns, what's having a moment, color stories)
     2. Saves the brief to Blob: ellie-trends/current.json
     3. The Curator (run-curator) reads this file before generating the weekly
        brief — so every look is grounded in what's actually trending
     4. Emails owner a one-paragraph summary so you always know the creative
        direction before Monday's brief lands in members' inboxes
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 30;

interface TrendBrief {
  weekOf:          string;
  season:          string;
  dominantColors:  string[];
  keyPieces:       string[];
  mood:            string;
  trendInsights:   string;
  whatToAvoid:     string[];
  occasionContext: string;
  generatedAt:     string;
}

function currentSeason(): string {
  const month = new Date().getMonth() + 1;
  const year  = new Date().getFullYear();
  if (month >= 3  && month <= 5)  return `Spring ${year}`;
  if (month >= 6  && month <= 8)  return `Summer ${year}`;
  if (month >= 9  && month <= 11) return `Fall ${year}`;
  return `Winter ${year}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function nextMonday(): Date {
  const d   = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/* ─── Build summary email ──────────────────────────────────────────────── */
function buildSummaryEmail(brief: TrendBrief): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:580px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#EDE5D8;padding:28px 36px 22px;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Trend Scout
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:22px;font-weight:400;font-family:Georgia,serif;">
      This week's creative direction is set
    </h2>
    <p style="margin:6px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      ${brief.season} · Week of ${brief.weekOf} · The Curator picks up from here
    </p>
  </td></tr>

  <!-- Mood -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Editorial Mood</p>
    <p style="margin:0;color:#2C2C2C;font-size:15px;font-style:italic;
               font-family:Georgia,serif;line-height:1.7;">"${brief.mood}"</p>
  </td></tr>

  <!-- Trend Insights -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Trend Insights</p>
    <p style="margin:0;color:#4A4A4A;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
      ${brief.trendInsights}
    </p>
  </td></tr>

  <!-- Two columns: Colors + Key Pieces -->
  <tr><td style="padding:20px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" style="vertical-align:top;padding-right:12px;">
          <p style="margin:0 0 8px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
                     text-transform:uppercase;font-family:Arial,sans-serif;">Dominant Colors</p>
          ${brief.dominantColors.map(c => `
          <p style="margin:0 0 4px;color:#2C2C2C;font-size:12px;
                     font-family:Arial,sans-serif;">· ${c}</p>`).join("")}
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align:top;padding-left:12px;
                                border-left:1px solid #E8DDD0;">
          <p style="margin:0 0 8px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
                     text-transform:uppercase;font-family:Arial,sans-serif;">Key Pieces</p>
          ${brief.keyPieces.map(p => `
          <p style="margin:0 0 4px;color:#2C2C2C;font-size:12px;
                     font-family:Arial,sans-serif;">· ${p}</p>`).join("")}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Occasion Context -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">What Members Need This Week</p>
    <p style="margin:0;color:#4A4A4A;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
      ${brief.occasionContext}
    </p>
  </td></tr>

  <!-- What to Avoid -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 8px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Avoid This Week</p>
    <p style="margin:0;color:#8A8580;font-size:12px;font-family:Arial,sans-serif;line-height:1.8;">
      ${brief.whatToAvoid.join(" · ")}
    </p>
  </td></tr>

  <!-- Footer note -->
  <tr><td style="padding:24px 36px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      The Curator runs tonight at 6 PM and will use this brief to guide the weekly looks.
      Members receive their brief Monday morning. · <a href="${siteUrl}" style="color:#C4956A;">stylebyellie.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Load Content Director note for Trend Scout ──────────────────────── */
async function loadTrendScoutNote(): Promise<string> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return "";
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-directives/" });
    const file = blobs.find(b => b.pathname === "ellie-directives/content.json");
    if (!file) return "";
    const ageHours = (Date.now() - new Date(file.uploadedAt).getTime()) / 3_600_000;
    if (ageHours > 6) return "";
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return "";
    const d = await r.json() as { trendScoutNote?: string };
    return d.trendScoutNote ? `\nContent Director's note for you: "${d.trendScoutNote}"` : "";
  } catch { return ""; }
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicKey) {
    return NextResponse.json({ skipped: true, reason: "ANTHROPIC_API_KEY not configured" });
  }

  const now       = new Date();
  const monday    = nextMonday();
  const weekOf    = formatDate(monday);
  const season    = currentSeason();
  const today     = formatDate(now);

  /* ── Load Content Director note ────────────────────────────────── */
  const directorNote = await loadTrendScoutNote();
  if (directorNote) console.log("[trend-scout] Content Director note loaded ✓");

  /* ── Ask Claude to synthesize trend brief ──────────────────────── */
  const prompt = `Today is ${today}. The current fashion season is ${season}.${directorNote}

You are Ellie's head of trend research. Your job is to produce a precise, actionable trend brief for this Sunday's curation session. This brief will be read by the AI curator before it selects the week's three looks (Executive, Weekender, Wildcard) and sources every piece by brand and price.

Return ONLY a valid JSON object with exactly these fields — no markdown, no preamble, no explanation:

{
  "weekOf": "${weekOf}",
  "season": "${season}",
  "dominantColors": ["3-5 specific color names dominant right now, e.g. 'ivory', 'chocolate brown', 'sage'"],
  "keyPieces": ["4-6 specific garment/accessory types having a moment right now, e.g. 'wide-leg linen trouser', 'structured blazer in neutral'"],
  "mood": "One sentence editorial mood for this week — specific, evocative, no clichés. No 'chic'. No 'stunning'.",
  "trendInsights": "2-3 sentences about what is genuinely trending this season across editorial and accessible luxury retail. Be specific. Reference real silhouettes, fabrications, styling moments.",
  "whatToAvoid": ["4-6 things that are overdone, out, or incompatible with the Ellie brand this week"],
  "occasionContext": "1-2 sentences about what life occasions members are dressing for this week (spring work season, travel season beginning, graduation events, etc.)"
}

The Ellie brand: accessible luxury women's styling, $19/month membership. Core customer: professional women 34-50 — too busy to scroll for hours, income to buy without deliberating, done with fast fashion. Extended: 28-52. Brands like Theory, Vince, Reformation, Tory Burch, Revolve, SSENSE. Never mass-market. Never youth-culture aesthetics. Never trendy for its own sake. Always intentional.`;

  let brief: TrendBrief;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5",
        max_tokens: 800,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const raw  = data.content[0]?.text?.trim() ?? "";

    /* Extract JSON even if Claude adds any surrounding text */
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]) as Partial<TrendBrief>;

    brief = {
      weekOf:          parsed.weekOf          ?? weekOf,
      season:          parsed.season          ?? season,
      dominantColors:  parsed.dominantColors  ?? [],
      keyPieces:       parsed.keyPieces       ?? [],
      mood:            parsed.mood            ?? "",
      trendInsights:   parsed.trendInsights   ?? "",
      whatToAvoid:     parsed.whatToAvoid     ?? [],
      occasionContext: parsed.occasionContext  ?? "",
      generatedAt:     now.toISOString(),
    };
  } catch (err) {
    console.error("[trend-scout] Claude failed:", err);
    return NextResponse.json({ error: "Claude generation failed" }, { status: 500 });
  }

  /* ── Save to Blob ──────────────────────────────────────────────── */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      await put("ellie-trends/current.json", JSON.stringify(brief), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[trend-scout] Trend brief saved to Blob");
    } catch (blobErr) {
      console.error("[trend-scout] Blob save failed (non-fatal):", blobErr);
    }
  }

  /* ── Email owner ───────────────────────────────────────────────── */
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie Scout <${fromEmail}>`,
      to:      notifyEmail,
      subject: `🔍 This week's creative direction — ${brief.mood.slice(0, 60)}`,
      html:    buildSummaryEmail(brief),
    }).catch(e => console.error("[trend-scout] Email failed:", e));
    console.log("[trend-scout] Summary email sent");
  }

  return NextResponse.json({
    ok:      true,
    weekOf:  brief.weekOf,
    season:  brief.season,
    mood:    brief.mood,
    colors:  brief.dominantColors,
    pieces:  brief.keyPieces,
  });
}

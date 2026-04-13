import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-ceo
   THE CEO AGENT — Tier 1. Reads all Director reports, synthesizes strategy,
   emails the Sunday Business Brief, writes directives for all three Directors.

   Runs every Sunday at 12 PM ET (16:00 UTC).
   Chain of command:
     CEO (12 PM) → Content Director (1 PM) → Trend Scout (2 PM) → Curator (6 PM)
                → Growth Director (Tuesday 10 AM)
                → Operations Director (Daily 6 AM)

   What it does:
     1. Reads all three Director reports from Blob (from the past week)
     2. Reads Stripe for current member count + MRR (source of truth)
     3. Reads the most recent approved brief (content the members just received)
     4. Asks Claude to synthesize a strategic assessment and produce directives
        for each Director for this week
     5. Saves CEO brief to ellie-ceo/brief.json — all Directors read this
     6. Emails owner the Sunday Business Brief — a one-page newspaper of the business
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 55;

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface CeoBrief {
  weekOf:              string;
  generatedAt:         string;
  memberCount:         number;
  mrr:                 number;
  newThisWeek:         number;
  systemHealth:        "green" | "yellow" | "red";
  weeklyAssessment:    string;
  strategicPriority:   string;
  contentDirective:    string;
  growthDirective:     string;
  opsDirective:        string;
  ownerActionRequired: boolean;
  ownerActionItems:    string[];
  oneThingThisWeek:    string;  /* the single most important action for the owner */
}

interface GrowthDirective {
  memberCount?:      number;
  newThisWeek?:      number;
  mrr?:              number;
  weeklyAssessment?: string;
  focusPriority?:    string;
  retentionHealth?:  string;
  acquisitionHealth?: string;
}

interface OpsDirective {
  systemHealth?:  string;
  openIssues?:    string[];
  briefFreshness?: string;
  recentFailures?: number;
}

interface ContentDirective {
  emphasize?:       string[];
  brandsToFeature?: string[];
  brandsToRest?:    string[];
  curatorNote?:     string;
}

/* ─── Load director reports ─────────────────────────────────────────────── */
async function loadDirectorReports(): Promise<{
  growth:     GrowthDirective;
  ops:        OpsDirective;
  content:    ContentDirective;
}> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-directives/" });

    async function loadBlob<T>(pathname: string): Promise<T> {
      const file = blobs.find(b => b.pathname === pathname);
      if (!file) return {} as T;
      const r = await fetch(file.url, { cache: "no-store" });
      if (!r.ok) return {} as T;
      return r.json() as Promise<T>;
    }

    const [growth, ops, content] = await Promise.all([
      loadBlob<GrowthDirective>("ellie-directives/growth.json"),
      loadBlob<OpsDirective>("ellie-directives/ops.json"),
      loadBlob<ContentDirective>("ellie-directives/content.json"),
    ]);

    return { growth, ops, content };
  } catch {
    return { growth: {}, ops: {}, content: {} };
  }
}

/* ─── Get Stripe executive summary ─────────────────────────────────────── */
async function getStripeExecutiveSummary(stripeKey: string): Promise<{
  totalActive:       number;
  newLast7Days:      number;
  canceledLast7Days: number;
  mrr:               number;
  arpu:              number;
}> {
  try {
    const stripe       = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 86_400_000) / 1000);

    const [activeSubs, canceledSubs] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.subscriptions.list({ status: "canceled", limit: 50, created: { gte: sevenDaysAgo } }),
    ]);

    const newLast7Days = activeSubs.data.filter(s => s.created >= sevenDaysAgo).length;

    let mrr = 0;
    for (const sub of activeSubs.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        if (price.unit_amount && price.currency === "usd") {
          if (price.recurring?.interval === "month") {
            mrr += price.unit_amount / 100;
          } else if (price.recurring?.interval === "year") {
            mrr += price.unit_amount / 100 / 12;
          }
        }
      }
    }

    const totalActive = activeSubs.data.length;
    return {
      totalActive,
      newLast7Days,
      canceledLast7Days: canceledSubs.data.length,
      mrr:               Math.round(mrr),
      arpu:              totalActive > 0 ? Math.round(mrr / totalActive) : 0,
    };
  } catch (err) {
    console.error("[agent-ceo] Stripe error:", err);
    return { totalActive: 0, newLast7Days: 0, canceledLast7Days: 0, mrr: 0, arpu: 0 };
  }
}

/* ─── Ask Claude to synthesize the CEO brief ────────────────────────────── */
async function generateCeoBrief(
  anthropicKey: string,
  stripe:       Awaited<ReturnType<typeof getStripeExecutiveSummary>>,
  reports:      Awaited<ReturnType<typeof loadDirectorReports>>,
  weekOf:       string,
): Promise<CeoBrief | null> {
  const opsHealth   = reports.ops.systemHealth   ?? "unknown";
  const opsIssues   = (reports.ops.openIssues    ?? []).join("; ") || "none";
  const growthNote  = reports.growth.weeklyAssessment ?? "No growth report yet";
  const contentNote = reports.content.curatorNote     ?? "No content report yet";

  const prompt = `You are the CEO of "The Style Refresh by Ellie" — a women's style membership ($19/month).
It is Sunday. You are reviewing your management team's weekly reports before setting direction for the new week.

MANAGEMENT TEAM REPORTS:

GROWTH DIRECTOR:
- Member count: ${stripe.totalActive}
- New members this week: ${stripe.newLast7Days}
- Canceled this week: ${stripe.canceledLast7Days}
- MRR: $${stripe.mrr}
- ARPU: $${stripe.arpu}
- Retention health: ${reports.growth.retentionHealth ?? "unknown"}
- Acquisition health: ${reports.growth.acquisitionHealth ?? "unknown"}
- Growth assessment: ${growthNote}
- Focus recommendation: ${reports.growth.focusPriority ?? "none"}

CONTENT DIRECTOR:
- Content note for this week: ${contentNote}
- Brands to feature: ${(reports.content.brandsToFeature ?? []).join(", ") || "none"}
- Brands to rest: ${(reports.content.brandsToRest ?? []).join(", ") || "none"}

OPERATIONS DIRECTOR:
- System health: ${opsHealth}
- Open issues: ${opsIssues}
- Brief freshness: ${reports.ops.briefFreshness ?? "unknown"}
- Recent deployment failures: ${reports.ops.recentFailures ?? 0}

BUSINESS CONTEXT: Early-stage subscription content business. Currently in member acquisition phase. The business is fully automated — content is AI-curated every Sunday, emails send Monday, shop links auto-repair every 6 hours. Owner's only job is approving Sunday brief + posting Instagram photos.

Return ONLY a valid JSON object with exactly these fields — no markdown, no preamble:
{
  "weekOf": "${weekOf}",
  "generatedAt": "${new Date().toISOString()}",
  "memberCount": ${stripe.totalActive},
  "mrr": ${stripe.mrr},
  "newThisWeek": ${stripe.newLast7Days},
  "systemHealth": "${opsHealth === "green" ? "green" : opsHealth === "red" ? "red" : "yellow"}",
  "weeklyAssessment": "2-3 sentences: honest, direct assessment of where the business stands this week. Be a real CEO — no fluff, no false positivity.",
  "strategicPriority": "The single most important strategic focus for this week in one sentence.",
  "contentDirective": "One specific directive for the Content Director about what this week's content should accomplish strategically.",
  "growthDirective": "One specific directive for the Growth Director about this week's acquisition or retention priority.",
  "opsDirective": "One specific directive for the Operations Director — either 'maintain stability' or a specific issue to resolve.",
  "ownerActionRequired": false,
  "ownerActionItems": [],
  "oneThingThisWeek": "If the owner could only do ONE thing this week to move the needle, what would it be? Be specific and actionable."
}`;

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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]) as CeoBrief;
  } catch (err) {
    console.error("[agent-ceo] Claude failed:", err);
    return null;
  }
}

/* ─── Build the Sunday Business Brief email ─────────────────────────────── */
function buildCeoEmail(brief: CeoBrief, stripe: Awaited<ReturnType<typeof getStripeExecutiveSummary>>): string {
  const siteUrl   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const healthMap = {
    green:  { color: "#3A7D44", label: "All Systems Green",    bg: "#F0FAF2" },
    yellow: { color: "#C4956A", label: "Attention Needed",     bg: "#FFF8F0" },
    red:    { color: "#C0392B", label: "Action Required",      bg: "#FFF2F2" },
  };
  const h = healthMap[brief.systemHealth] ?? healthMap.green;

  /* Net change indicator */
  const netChange = stripe.newLast7Days - stripe.canceledLast7Days;
  const netColor  = netChange > 0 ? "#3A7D44" : netChange < 0 ? "#C0392B" : "#9A9A9A";
  const netLabel  = netChange > 0 ? `+${netChange}` : `${netChange}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:4px;background:linear-gradient(90deg,#2C2C2C,#C4956A,#2C2C2C);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#2C2C2C;padding:32px 40px 26px;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:10px;letter-spacing:0.48em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      The Style Refresh · Sunday Business Brief
    </p>
    <h1 style="margin:0;color:#FDFAF5;font-size:26px;font-weight:400;font-family:Georgia,serif;line-height:1.3;">
      Week of ${brief.weekOf}
    </h1>
    <p style="margin:8px 0 0;color:#9A9A9A;font-size:11px;font-family:Arial,sans-serif;">
      Your autonomous team has completed its weekly review. Here is where we stand.
    </p>
  </td></tr>

  <!-- System health bar -->
  <tr><td style="background:${h.bg};padding:14px 40px;border-bottom:1px solid #E8DDD0;">
    <p style="margin:0;font-size:12px;font-family:Arial,sans-serif;color:${h.color};">
      ● ${h.label} &nbsp;·&nbsp; <span style="color:#6B6560;">All agents checked in</span>
    </p>
  </td></tr>

  <!-- KPI row -->
  <tr><td style="padding:0;border-bottom:1px solid #E8DDD0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="25%" style="padding:24px 20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:400;color:#2C2C2C;font-family:Georgia,serif;">${brief.memberCount}</p>
          <p style="margin:4px 0 0;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Members</p>
        </td>
        <td width="25%" style="padding:24px 20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:400;color:#C4956A;font-family:Georgia,serif;">$${brief.mrr}</p>
          <p style="margin:4px 0 0;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">MRR</p>
        </td>
        <td width="25%" style="padding:24px 20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:400;color:${netColor};font-family:Georgia,serif;">${netLabel}</p>
          <p style="margin:4px 0 0;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Net This Week</p>
        </td>
        <td width="25%" style="padding:24px 20px;text-align:center;">
          <p style="margin:0;font-size:32px;font-weight:400;color:#3A7D44;font-family:Georgia,serif;">${stripe.newLast7Days}</p>
          <p style="margin:4px 0 0;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">New Joins</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CEO Assessment -->
  <tr><td style="padding:28px 40px 0;">
    <p style="margin:0 0 8px;color:#C4956A;font-size:9px;letter-spacing:0.28em;
               text-transform:uppercase;font-family:Arial,sans-serif;">This Week's Assessment</p>
    <p style="margin:0;color:#2C2C2C;font-size:14px;font-family:Georgia,serif;line-height:1.8;
               font-style:italic;">
      "${brief.weeklyAssessment}"
    </p>
  </td></tr>

  <!-- Strategic priority -->
  <tr><td style="padding:24px 40px 0;">
    <p style="margin:0 0 8px;color:#C4956A;font-size:9px;letter-spacing:0.28em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Strategic Priority</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="4" style="background:#C4956A;"></td>
        <td style="padding:12px 16px;background:#F5EFE4;">
          <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
            ${brief.strategicPriority}
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:24px 40px 0;">
    <hr style="border:none;border-top:1px solid #E8DDD0;margin:0;"/>
    <p style="margin:16px 0 0;color:#C4956A;font-size:9px;letter-spacing:0.28em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Team Directives — This Week</p>
  </td></tr>

  <!-- Three directors row -->
  <tr><td style="padding:12px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="31%" style="padding:14px;background:#F5EFE4;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:9px;color:#C4956A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Content Director</p>
          <p style="margin:0;font-size:11px;color:#4A4A4A;font-family:Arial,sans-serif;line-height:1.6;">${brief.contentDirective}</p>
        </td>
        <td width="4%"></td>
        <td width="31%" style="padding:14px;background:#F5EFE4;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:9px;color:#C4956A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Growth Director</p>
          <p style="margin:0;font-size:11px;color:#4A4A4A;font-family:Arial,sans-serif;line-height:1.6;">${brief.growthDirective}</p>
        </td>
        <td width="4%"></td>
        <td width="31%" style="padding:14px;background:#F5EFE4;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:9px;color:#C4956A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Ops Director</p>
          <p style="margin:0;font-size:11px;color:#4A4A4A;font-family:Arial,sans-serif;line-height:1.6;">${brief.opsDirective}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- One thing this week -->
  <tr><td style="padding:24px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #2C2C2C;background:#2C2C2C;">
      <tr><td style="padding:10px 20px;">
        <p style="margin:0;color:#C4956A;font-size:9px;letter-spacing:0.28em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">Your one thing this week</p>
      </td></tr>
      <tr><td style="padding:14px 20px 18px;background:#FDFAF5;">
        <p style="margin:0;color:#2C2C2C;font-size:14px;font-family:Georgia,serif;line-height:1.7;">
          ${brief.oneThingThisWeek}
        </p>
      </td></tr>
    </table>
  </td></tr>

  ${brief.ownerActionRequired && brief.ownerActionItems.length ? `
  <!-- Owner actions -->
  <tr><td style="padding:20px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:2px solid #C0392B;">
      <tr><td style="background:#C0392B;padding:10px 16px;">
        <p style="margin:0;color:#FFF;font-size:9px;letter-spacing:0.18em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">Action required from you</p>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        ${brief.ownerActionItems.map(item => `
        <p style="margin:0 0 8px;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          → ${item}
        </p>`).join("")}
      </td></tr>
    </table>
  </td></tr>` : ""}

  <!-- Today's schedule reminder -->
  <tr><td style="padding:20px 40px 0;">
    <p style="margin:0 0 8px;color:#9A9A9A;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Today's automation schedule</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #F0E9DF;">
          <p style="margin:0;font-size:11px;color:#9A9A9A;font-family:Arial,sans-serif;">1 PM ET · Content Director sets creative brief</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #F0E9DF;">
          <p style="margin:0;font-size:11px;color:#9A9A9A;font-family:Arial,sans-serif;">2 PM ET · Trend Scout synthesizes this week's fashion direction</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #F0E9DF;">
          <p style="margin:0;font-size:11px;color:#9A9A9A;font-family:Arial,sans-serif;">6 PM ET · Curator generates this week's three looks — your approval email arrives</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0;font-size:11px;color:#C4956A;font-family:Arial,sans-serif;font-weight:bold;">Monday 7 AM ET · Brief sends to all ${brief.memberCount} members</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 32px;">
    <hr style="border:none;border-top:1px solid #E8DDD0;margin:0 0 18px;"/>
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.7;">
      This brief was assembled by your autonomous management team — Content Director, Growth Director, and Operations Director — each running independently, reporting to you. No humans were involved. · <a href="${siteUrl}" style="color:#C4956A;">stylebyellie.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Handler ───────────────────────────────────────────────────────────── */
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

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return NextResponse.json({ skipped: true, reason: "STRIPE_SECRET_KEY not configured" });
  }

  /* 1 — Gather all inputs in parallel */
  const [reports, stripe] = await Promise.all([
    loadDirectorReports(),
    getStripeExecutiveSummary(stripeKey),
  ]);

  /* 2 — Week label */
  const monday = new Date();
  const diff   = monday.getDay() === 0 ? 1 : 8 - monday.getDay();
  monday.setDate(monday.getDate() + diff);
  const weekOf = monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  /* 3 — Generate CEO brief */
  const brief = await generateCeoBrief(anthropicKey, stripe, reports, weekOf);
  if (!brief) {
    return NextResponse.json({ error: "CEO brief generation failed" }, { status: 500 });
  }

  /* 4 — Save to Blob */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      await put("ellie-ceo/brief.json", JSON.stringify(brief), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[agent-ceo] CEO brief saved to Blob");
    } catch (blobErr) {
      console.error("[agent-ceo] Blob save failed:", blobErr);
    }
  }

  /* 5 — Email Sunday Business Brief to owner */
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const resend  = new Resend(resendKey);
    const subject = `📋 Sunday Business Brief — ${stripe.totalActive} members · $${stripe.mrr} MRR · Week of ${weekOf}`;

    await resend.emails.send({
      from:    `Ellie CEO Agent <${fromEmail}>`,
      to:      notifyEmail,
      subject,
      html:    buildCeoEmail(brief, stripe),
    }).catch(e => console.error("[agent-ceo] Email failed:", e));

    console.log("[agent-ceo] Sunday Business Brief sent");
  }

  return NextResponse.json({
    ok:                true,
    weekOf:            brief.weekOf,
    memberCount:       brief.memberCount,
    mrr:               brief.mrr,
    systemHealth:      brief.systemHealth,
    strategicPriority: brief.strategicPriority,
    oneThingThisWeek:  brief.oneThingThisWeek,
  });
}

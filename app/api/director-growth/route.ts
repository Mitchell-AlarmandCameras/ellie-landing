import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/director-growth
   THE GROWTH DIRECTOR — Tier 2 manager, reports to CEO, leads Tier 3 growth workers.

   Runs every Tuesday at 10 AM ET (14:00 UTC) — after Reddit posts, Quora answers.

   Chain of command:
     CEO brief → Growth Director → Reddit Agent / Quora Agent / Outreach Agent

   What it does:
     1. Reads CEO's strategic brief from Blob
     2. Reads Stripe for member count + 7-day new joins + recent churn signals
     3. Reads Reddit posting history + Quora answer history from Blob
     4. Reads Member Coach sent.json for retention pipeline health
     5. Asks Claude to synthesize growth assessment:
        - Which acquisition channel is most active
        - Retention health (how many members in day 3/7/14 pipeline)
        - Growth velocity (joining / churning / net)
        - One actionable focus for this week's growth workers
     6. Saves directive to ellie-directives/growth.json — read by CEO next Sunday
     7. Emails owner a Tuesday growth summary card
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface GrowthDirective {
  weekOf:                string;
  generatedAt:           string;
  memberCount:           number;
  newThisWeek:           number;
  inCoachingPipeline:    number;
  mrr:                   number;
  primaryChannel:        string;
  retentionHealth:       "green" | "yellow" | "red";
  acquisitionHealth:     "green" | "yellow" | "red";
  weeklyAssessment:      string;
  focusPriority:         string;
  ownerActionRequired:   boolean;
  ownerActionNote:       string;
}

/* ─── Load CEO brief ────────────────────────────────────────────────────── */
async function loadCeoBrief(): Promise<{ growthDirective?: string; strategicPriority?: string }> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-ceo/" });
    const file = blobs.find(b => b.pathname === "ellie-ceo/brief.json");
    if (!file) return {};
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

/* ─── Load Reddit posting history ──────────────────────────────────────── */
async function loadRedditState(): Promise<{ lastPostDate?: string; postsThisMonth?: number }> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "reddit/" });
    const file = blobs.find(b => b.pathname === "reddit/last-post.json");
    if (!file) return {};
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

/* ─── Load coaching pipeline state ─────────────────────────────────────── */
async function loadCoachingState(): Promise<Record<string, string[]>> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-coaching/" });
    const file = blobs.find(b => b.pathname === "ellie-coaching/sent.json");
    if (!file) return {};
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

/* ─── Get Stripe growth data ────────────────────────────────────────────── */
async function getStripeGrowthData(stripeKey: string): Promise<{
  totalActive: number;
  newLast7Days: number;
  canceledLast7Days: number;
  mrr: number;
}> {
  try {
    const stripe   = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 86_400_000) / 1000);

    /* Active subscriptions */
    const active = await stripe.subscriptions.list({ status: "active", limit: 100 });
    const totalActive = active.data.length;

    /* New subs in last 7 days */
    const newSubs = active.data.filter(s => s.created >= sevenDaysAgo);
    const newLast7Days = newSubs.length;

    /* Canceled subs in last 7 days */
    const canceled = await stripe.subscriptions.list({ status: "canceled", limit: 50,
      created: { gte: sevenDaysAgo } });
    const canceledLast7Days = canceled.data.length;

    /* MRR — sum of all active subscription amounts */
    let mrr = 0;
    for (const sub of active.data) {
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

    return { totalActive, newLast7Days, canceledLast7Days, mrr: Math.round(mrr) };
  } catch (err) {
    console.error("[director-growth] Stripe error:", err);
    return { totalActive: 0, newLast7Days: 0, canceledLast7Days: 0, mrr: 0 };
  }
}

/* ─── Ask Claude to synthesize growth assessment ───────────────────────── */
async function generateGrowthDirective(
  anthropicKey:      string,
  ceoPriority:       string,
  stripeData:        Awaited<ReturnType<typeof getStripeGrowthData>>,
  redditState:       Awaited<ReturnType<typeof loadRedditState>>,
  coachingCount:     number,
  weekOf:            string,
): Promise<GrowthDirective | null> {
  const prompt = `You are the Growth Director for "The Style Refresh by Ellie" — a women's style membership ($19/month).

CURRENT DATA:
- Total active members: ${stripeData.totalActive}
- New members this week: ${stripeData.newLast7Days}
- Members canceled this week: ${stripeData.canceledLast7Days}
- Monthly Recurring Revenue: $${stripeData.mrr}
- Members in coaching pipeline (received at least one milestone email): ${coachingCount}
- Reddit last post: ${redditState.lastPostDate ?? "unknown"}

CEO strategic priority this week:
"${ceoPriority}"

CONTEXT: The business is in early growth phase. First members are the most critical — every signup and churn matters. Acquisition channels: Reddit posts (Tuesday), Quora answers (Thursday), blogger outreach (Friday).

Return ONLY a valid JSON object with exactly these fields:
{
  "weekOf": "${weekOf}",
  "generatedAt": "${new Date().toISOString()}",
  "memberCount": ${stripeData.totalActive},
  "newThisWeek": ${stripeData.newLast7Days},
  "inCoachingPipeline": ${coachingCount},
  "mrr": ${stripeData.mrr},
  "primaryChannel": "which acquisition channel to push hardest this week (reddit|quora|outreach|all)",
  "retentionHealth": "green if churn is 0, yellow if 1-2 this week, red if 3+",
  "acquisitionHealth": "green if 2+ new this week, yellow if 1, red if 0",
  "weeklyAssessment": "2-3 sentences: honest assessment of growth trajectory, what's working, what needs attention",
  "focusPriority": "One specific, actionable directive for this week's growth workers",
  "ownerActionRequired": false,
  "ownerActionNote": "empty string unless there is something the owner specifically needs to do"
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
        max_tokens: 600,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const raw  = data.content[0]?.text?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as GrowthDirective;

    /* Compute health signals deterministically (don't trust Claude's math) */
    parsed.retentionHealth   = stripeData.canceledLast7Days === 0 ? "green"
                             : stripeData.canceledLast7Days <= 2  ? "yellow" : "red";
    parsed.acquisitionHealth = stripeData.newLast7Days >= 2 ? "green"
                             : stripeData.newLast7Days === 1 ? "yellow" : "red";
    return parsed;
  } catch (err) {
    console.error("[director-growth] Claude failed:", err);
    return null;
  }
}

/* ─── Build owner email ─────────────────────────────────────────────────── */
function buildGrowthEmail(d: GrowthDirective): string {
  const siteUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const colorMap = { green: "#3A7D44", yellow: "#C4956A", red: "#C0392B" };
  const labelMap = { green: "Healthy", yellow: "Watch", red: "Action needed" };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:580px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#2C2C2C;padding:28px 36px 22px;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Growth Director · Tuesday Report
    </p>
    <h2 style="margin:4px 0 0;color:#FDFAF5;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      Weekly Growth Assessment
    </h2>
    <p style="margin:6px 0 0;color:#9A9A9A;font-size:11px;font-family:Arial,sans-serif;">
      Week of ${d.weekOf}
    </p>
  </td></tr>

  <!-- Stats row -->
  <tr><td style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="25%" style="padding:20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:400;color:#2C2C2C;font-family:Georgia,serif;">${d.memberCount}</p>
          <p style="margin:4px 0 0;font-size:10px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Members</p>
        </td>
        <td width="25%" style="padding:20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:400;color:#3A7D44;font-family:Georgia,serif;">+${d.newThisWeek}</p>
          <p style="margin:4px 0 0;font-size:10px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">New</p>
        </td>
        <td width="25%" style="padding:20px;border-right:1px solid #E8DDD0;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:400;color:#C4956A;font-family:Georgia,serif;">$${d.mrr}</p>
          <p style="margin:4px 0 0;font-size:10px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">MRR</p>
        </td>
        <td width="25%" style="padding:20px;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:400;color:#2C2C2C;font-family:Georgia,serif;">${d.inCoachingPipeline}</p>
          <p style="margin:4px 0 0;font-size:10px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">In Pipeline</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Health signals -->
  <tr><td style="padding:20px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="48%" style="padding:12px 16px;background:#F5EFE4;">
          <p style="margin:0 0 4px;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Acquisition</p>
          <p style="margin:0;font-size:13px;font-family:Arial,sans-serif;color:${colorMap[d.acquisitionHealth]};">
            ● ${labelMap[d.acquisitionHealth]}
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="padding:12px 16px;background:#F5EFE4;">
          <p style="margin:0 0 4px;font-size:9px;color:#9A9A9A;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Retention</p>
          <p style="margin:0;font-size:13px;font-family:Arial,sans-serif;color:${colorMap[d.retentionHealth]};">
            ● ${labelMap[d.retentionHealth]}
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Assessment -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Growth Assessment</p>
    <p style="margin:0;color:#4A4A4A;font-size:13px;font-family:Arial,sans-serif;line-height:1.7;">
      ${d.weeklyAssessment}
    </p>
  </td></tr>

  <!-- Focus -->
  <tr><td style="padding:16px 36px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">This Week's Focus</p>
    <p style="margin:0;padding:12px 16px;background:#F5EFE4;color:#2C2C2C;
               font-size:13px;font-family:Arial,sans-serif;line-height:1.6;border-left:3px solid #C4956A;">
      ${d.focusPriority}
    </p>
  </td></tr>

  ${d.ownerActionRequired ? `
  <!-- Action required -->
  <tr><td style="padding:16px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #C0392B;background:#FFF9F9;">
      <tr><td style="background:#C0392B;padding:8px 16px;">
        <p style="margin:0;color:#FFF;font-size:9px;letter-spacing:0.18em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">Action required</p>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          ${d.ownerActionNote}
        </p>
      </td></tr>
    </table>
  </td></tr>` : ""}

  <!-- Footer -->
  <tr><td style="padding:24px 36px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Managed by your Growth Director · Directive saved for CEO's Sunday review · <a href="${siteUrl}" style="color:#C4956A;">stylebyellie.com</a>
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

  /* 1 — Gather inputs in parallel */
  const [ceoBrief, redditState, coachingState, stripeData] = await Promise.all([
    loadCeoBrief(),
    loadRedditState(),
    loadCoachingState(),
    getStripeGrowthData(stripeKey),
  ]);

  const coachingCount = Object.keys(coachingState).length;

  /* 2 — Week label */
  const monday = new Date();
  const diff   = monday.getDay() === 0 ? 1 : 8 - monday.getDay();
  monday.setDate(monday.getDate() + diff);
  const weekOf = monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  /* 3 — Generate directive */
  const ceoPriority = ceoBrief.growthDirective ?? ceoBrief.strategicPriority ?? "Focus on member acquisition.";
  const directive   = await generateGrowthDirective(
    anthropicKey, ceoPriority, stripeData, redditState, coachingCount, weekOf,
  );

  if (!directive) {
    return NextResponse.json({ error: "Directive generation failed" }, { status: 500 });
  }

  /* 4 — Save to Blob */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      await put("ellie-directives/growth.json", JSON.stringify(directive), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[director-growth] Directive saved to Blob");
    } catch (blobErr) {
      console.error("[director-growth] Blob save failed:", blobErr);
    }
  }

  /* 5 — Email owner */
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const resend   = new Resend(resendKey);
    const subject  = directive.acquisitionHealth === "red"
      ? `⚠️ Growth Report — ${stripeData.newLast7Days} new members this week`
      : `📈 Growth Report — ${stripeData.totalActive} members · $${stripeData.mrr} MRR`;

    await resend.emails.send({
      from:    `Ellie Growth Director <${fromEmail}>`,
      to:      notifyEmail,
      subject,
      html:    buildGrowthEmail(directive),
    }).catch(e => console.error("[director-growth] Email failed:", e));
  }

  return NextResponse.json({
    ok:                true,
    memberCount:       directive.memberCount,
    newThisWeek:       directive.newThisWeek,
    mrr:               directive.mrr,
    retentionHealth:   directive.retentionHealth,
    acquisitionHealth: directive.acquisitionHealth,
    focusPriority:     directive.focusPriority,
  });
}

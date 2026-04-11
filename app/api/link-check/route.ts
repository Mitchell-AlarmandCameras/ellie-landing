import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/link-check
   Vercel Cron fires this every Wednesday at 9 PM ET (01:00 UTC Thursday).

   Sends Ellie a full business owner report covering:
     • Active members & revenue (Stripe)
     • Google Analytics 4 traffic — sessions, top pages, channels (if configured)
     • This week's shop link health (pass/fail per item)
     • Top clicked items this week (Vercel Blob analytics)
     • New signups this week
     • Action items before Monday
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 55;

/* ── GA4 types ───────────────────────────────────────────────────────── */
type GA4Data = {
  sessions:       number;
  newUsers:       number;
  engagementRate: number;
  topPages:       Array<{ path: string; views: number }>;
  channels:       Array<{ channel: string; sessions: number }>;
};

/* ── GA4 report fetch (requires GA4_SERVICE_ACCOUNT_KEY + GA4_PROPERTY_ID) ── */
async function fetchGA4Report(): Promise<GA4Data | null> {
  const rawKey     = process.env.GA4_SERVICE_ACCOUNT_KEY?.trim();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!rawKey || !propertyId) return null;

  try {
    const sa = JSON.parse(rawKey) as { client_email: string; private_key: string };

    /* Build JWT for service account auth */
    const now     = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss:   sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud:   "https://oauth2.googleapis.com/token",
      exp:   now + 3600,
      iat:   now,
    })).toString("base64url");

    const { createSign } = await import("crypto");
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    const sig = signer.sign(sa.private_key.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payload}.${sig}`;

    /* Exchange JWT for access token */
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json() as { access_token: string };

    const apiBase = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

    /* Parallel: channel breakdown + top pages */
    const [channelRes, pagesRes] = await Promise.all([
      fetch(apiBase, {
        method: "POST", headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics:    [{ name: "sessions" }, { name: "newUsers" }, { name: "engagementRate" }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          orderBys:   [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 8,
        }),
      }),
      fetch(apiBase, {
        method: "POST", headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics:    [{ name: "screenPageViews" }],
          dimensions: [{ name: "pagePath" }],
          orderBys:   [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 6,
        }),
      }),
    ]);

    if (!channelRes.ok || !pagesRes.ok) throw new Error("GA4 API call failed");

    type GA4Row = { dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> };
    type GA4Report = { rows?: GA4Row[] };

    const channelData = await channelRes.json() as GA4Report;
    const pagesData   = await pagesRes.json() as GA4Report;

    const channels: GA4Data["channels"] = (channelData.rows ?? []).map(r => ({
      channel:  r.dimensionValues[0]?.value ?? "Unknown",
      sessions: parseInt(r.metricValues[0]?.value ?? "0", 10),
    }));

    const totalSessions = channels.reduce((s, c) => s + c.sessions, 0);
    const totalNewUsers = (channelData.rows ?? []).reduce(
      (s, r) => s + parseInt(r.metricValues[1]?.value ?? "0", 10), 0
    );
    const avgEngagement = (channelData.rows ?? []).reduce(
      (s, r) => s + parseFloat(r.metricValues[2]?.value ?? "0"), 0
    ) / Math.max(channelData.rows?.length ?? 1, 1);

    const topPages: GA4Data["topPages"] = (pagesData.rows ?? []).map(r => ({
      path:  r.dimensionValues[0]?.value ?? "/",
      views: parseInt(r.metricValues[0]?.value ?? "0", 10),
    }));

    console.log(`[link-check] GA4: ${totalSessions} sessions, ${totalNewUsers} new users`);
    return { sessions: totalSessions, newUsers: totalNewUsers, engagementRate: avgEngagement, topPages, channels };
  } catch (err) {
    console.error("[link-check] GA4 fetch failed (non-fatal):", err);
    return null;
  }
}

/* ── GA4 email section ───────────────────────────────────────────────── */
function buildGA4Section(ga4: GA4Data): string {
  const channelRows = ga4.channels.slice(0, 6).map(c => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#2C2C2C;">${c.channel}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#6B6560;text-align:right;">${c.sessions.toLocaleString()}</td>
    </tr>`).join("");

  const pageRows = ga4.topPages.slice(0, 5).map(p => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:11px;color:#2C2C2C;word-break:break-all;">${p.path}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#6B6560;text-align:right;">${p.views.toLocaleString()}</td>
    </tr>`).join("");

  return `
  <!-- GA4 Traffic Section -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">
      Website Traffic — Last 7 Days
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="width:33%;padding:0 6px 0 0;vertical-align:top;">
          <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:14px 12px;border-top:3px solid #C4956A;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#2C2C2C;">${ga4.sessions.toLocaleString()}</div>
            <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#C4956A;margin-top:4px;">Sessions</div>
          </div>
        </td>
        <td style="width:33%;padding:0 3px;vertical-align:top;">
          <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:14px 12px;border-top:3px solid #4A6741;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#2C2C2C;">${ga4.newUsers.toLocaleString()}</div>
            <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#4A6741;margin-top:4px;">New Visitors</div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 6px;vertical-align:top;">
          <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:14px 12px;border-top:3px solid #2C2C2C;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#2C2C2C;">${Math.round(ga4.engagementRate * 100)}%</div>
            <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#6B6560;margin-top:4px;">Engagement</div>
          </div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;margin-bottom:10px;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Channel</th>
        <th style="padding:8px 14px;text-align:right;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Sessions</th>
      </tr>
      ${channelRows || `<tr><td colspan="2" style="padding:12px 14px;font-family:Arial,sans-serif;font-size:12px;color:#B5A99A;text-align:center;">No channel data yet</td></tr>`}
    </table>
    <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8A8580;font-family:Arial,sans-serif;">Top Pages</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Page</th>
        <th style="padding:8px 14px;text-align:right;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Views</th>
      </tr>
      ${pageRows || `<tr><td colspan="2" style="padding:12px 14px;font-family:Arial,sans-serif;font-size:12px;color:#B5A99A;text-align:center;">No page data yet</td></tr>`}
    </table>
  </td></tr>`;

type LinkResult = { piece: string; brand: string; url: string; ok: boolean; status: number | string };
type ClickRecord = { ts: string; url: string; retailer: string; src: string };

/* ── Helpers ──────────────────────────────────────────────────────────── */

async function checkLink(url: string): Promise<{ ok: boolean; status: number | string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      redirect: "follow",
    });
    clearTimeout(timer);
    /* 403 = bot protection (Cloudflare/Akamai) — link works in browser, treat as OK.
       404/410 = genuinely missing page — flag as broken.                          */
    const ok = res.status < 400 || res.status === 403;
    return { ok, status: res.status };
  } catch (err) {
    return { ok: false, status: String(err).slice(0, 60) };
  }
}

function getWeekKey(d = new Date()): string {
  const day    = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split("T")[0];
}

function fmt$(n: number): string {
  return "$" + (n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Build the full report email ─────────────────────────────────────── */
function buildReportEmail(opts: {
  checkTime:       string;
  memberCount:     number;
  monthlyRevenue:  number;
  newThisWeek:     number;
  mrr:             number;
  linkResults:     LinkResult[];
  topClicks:       { label: string; count: number }[];
  totalClicksWeek: number;
  mailingAddress:  string;
  ga4?:            GA4Data | null;
}): string {
  const {
    checkTime, memberCount, monthlyRevenue, newThisWeek, mrr,
    linkResults, topClicks, totalClicksWeek, mailingAddress, ga4,
  } = opts;

  const failCount  = linkResults.filter(r => !r.ok).length;
  const allGood    = failCount === 0;
  const headerColor = allGood ? "#4A6741" : "#c0392b";

  /* Stat cards */
  const statCard = (label: string, value: string, sub: string, color = "#C4956A") => `
    <td style="width:25%;padding:0 6px;text-align:center;vertical-align:top;">
      <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:16px 10px;border-top:3px solid ${color};">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#2C2C2C;margin-bottom:4px;">${value}</div>
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#C4956A;margin-bottom:4px;">${label}</div>
        <div style="font-family:Arial,sans-serif;font-size:10px;color:#999;">${sub}</div>
      </div>
    </td>`;

  /* Link rows */
  const linkRows = linkResults.map(r => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#2C2C2C;">${r.piece}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:11px;color:#6B6560;">${r.brand}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;text-align:center;font-size:13px;">${r.ok ? "✅" : "❌"}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:10px;color:${r.ok ? "#6B6560" : "#c0392b"};">
        ${r.ok ? `${r.status}` : `${r.status} — <a href="${r.url}" style="color:#C4956A;">check link →</a>`}
      </td>
    </tr>`).join("");

  /* Top click rows */
  const clickRows = topClicks.length
    ? topClicks.slice(0, 5).map((c, i) => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:11px;color:#C4956A;font-weight:600;">#${i + 1}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#2C2C2C;">${c.label}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#6B6560;text-align:right;">${c.count} click${c.count !== 1 ? "s" : ""}</td>
    </tr>`).join("")
    : `<tr><td colspan="3" style="padding:14px;font-family:Arial,sans-serif;font-size:12px;color:#B5A99A;text-align:center;">No clicks tracked yet this week — analytics build as members shop.</td></tr>`;

  /* Action items */
  const actions: string[] = [];
  if (failCount > 0) actions.push(`⚠️ Fix ${failCount} broken shop link${failCount > 1 ? "s" : ""} before Sunday approval`);
  if (newThisWeek === 0) actions.push("📣 Consider posting on Instagram to drive new signups");
  if (memberCount < 10) actions.push("🚀 Share your referral link — each member can invite friends at 50% off");
  actions.push("✅ Sunday: review and approve this week's AI-generated looks");
  actions.push("✅ Monday 7 AM ET: brief auto-sends to all members");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 12px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#FDFAF5;max-width:640px;width:100%;border:1px solid #DDD4C5;">

  <!-- Top bar -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#C4956A,${headerColor},#C4956A);"></td></tr>

  <!-- Header -->
  <tr><td style="background:#EDE5D8;padding:28px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.36em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Weekly Business Report
    </p>
    <h1 style="margin:6px 0 6px;color:#2C2C2C;font-size:24px;font-weight:400;font-family:Georgia,serif;">
      Your Business at a Glance
    </h1>
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">${checkTime}</p>
  </td></tr>

  <!-- Stats row -->
  <tr><td style="padding:24px 30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${statCard("Active Members", String(memberCount), "paying subscribers", "#4A6741")}
        ${statCard("Monthly Revenue", fmt$(monthlyRevenue), "this month so far", "#C4956A")}
        ${statCard("MRR", fmt$(mrr), "recurring / mo", "#2C2C2C")}
        ${statCard("New This Week", `+${newThisWeek}`, "new signups", newThisWeek > 0 ? "#4A6741" : "#B5A99A")}
      </tr>
    </table>
  </td></tr>

  ${ga4 ? buildGA4Section(ga4) : ""}

  <!-- Shop clicks this week -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">
      Shop Clicks This Week
      <span style="float:right;font-size:11px;letter-spacing:0;text-transform:none;color:#6B6560;">${totalClicksWeek} total clicks</span>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Rank</th>
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Item / Retailer</th>
        <th style="padding:8px 14px;text-align:right;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Clicks</th>
      </tr>
      ${clickRows}
    </table>
  </td></tr>

  <!-- Link health -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">
      Shop Link Health — ${linkResults.filter(r => r.ok).length}/${linkResults.length} Working
      <span style="float:right;font-size:11px;letter-spacing:0;text-transform:none;color:${allGood ? "#4A6741" : "#c0392b"};">
        ${allGood ? "✅ All clear" : `⚠️ ${failCount} need attention`}
      </span>
    </p>
    ${!allGood ? `
    <div style="background:#FDF0ED;border:1px solid #e8b4a8;padding:12px 16px;margin-bottom:12px;">
      <p style="margin:0;font-size:12px;color:#c0392b;font-family:Arial,sans-serif;line-height:1.6;">
        <strong>Action needed before Sunday.</strong> Fix the ❌ links below so Monday's brief goes out clean.
        Click the red link to verify, then reply to this email or open Cursor to fix.
      </p>
    </div>` : `
    <div style="background:#F0F7EE;border:1px solid #a8d4a0;padding:12px 16px;margin-bottom:12px;">
      <p style="margin:0;font-size:12px;color:#2d6a27;font-family:Arial,sans-serif;">
        All ${linkResults.length} links checked and live. Monday brief will go out clean. ✓
      </p>
    </div>`}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Item</th>
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Brand</th>
        <th style="padding:8px 14px;text-align:center;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Status</th>
        <th style="padding:8px 14px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Details</th>
      </tr>
      ${linkRows}
    </table>
  </td></tr>

  <!-- Action items -->
  <tr><td style="padding:24px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">This Week's Action Items</p>
    <div style="background:#F5EFE4;border:1px solid #DDD4C5;padding:16px 20px;">
      ${actions.map(a => `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;line-height:1.5;">${a}</p>`).join("")}
    </div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:28px 36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:18px 36px 28px;text-align:center;">
    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:13px;color:#6B6560;font-style:italic;">
      The Style Refresh is running automatically. This report arrives every Wednesday.
    </p>
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.7;">
      ${mailingAddress}<br/>
      Automated weekly report · The Style Refresh by Ellie
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

/* ── Main handler ─────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  /* Auth */
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const resendKey      = process.env.RESEND_API_KEY?.trim();
  const notifyEmail    = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail      = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
  const mailingAddress = process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY";
  const stripeKey      = process.env.STRIPE_SECRET_KEY?.trim();

  /* ── 1. Stripe: member count + revenue ─────────────────────────────── */
  let memberCount    = 0;
  let monthlyRevenue = 0;
  let mrr            = 0;
  let newThisWeek    = 0;

  if (stripeKey) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

      /* Active subscriptions */
      const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
      memberCount = subs.data.length;

      /* MRR: sum all active subscription amounts normalised to monthly */
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          const amt   = price.unit_amount ?? 0;
          if (price.recurring?.interval === "year") mrr += Math.round(amt / 12);
          else mrr += amt;
        }
      }

      /* New subs this week */
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
      newThisWeek   = subs.data.filter(s => s.created >= weekAgo).length;

      /* Revenue this calendar month */
      const now       = new Date();
      const monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
      const charges   = await stripe.charges.list({ created: { gte: monthStart }, limit: 100 });
      monthlyRevenue  = charges.data
        .filter(c => c.paid && !c.refunded)
        .reduce((sum, c) => sum + (c.amount ?? 0), 0);
    } catch (stripeErr) {
      console.error("[link-check] Stripe fetch failed (non-fatal):", stripeErr);
    }
  }

  /* ── 2. GA4 traffic report ──────────────────────────────────────── */
  const ga4Data = await fetchGA4Report();

  /* ── 3. Click analytics from Vercel Blob ──────────────────────────── */
  let topClicks:       { label: string; count: number }[] = [];
  let totalClicksWeek = 0;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import("@vercel/blob");
      const weekKey  = getWeekKey();
      const { blobs } = await list({ prefix: `analytics/clicks/${weekKey}/` });

      const retailerCounts: Record<string, number> = {};
      totalClicksWeek = blobs.length;

      for (const blob of blobs.slice(0, 200)) {
        try {
          const r    = await fetch(blob.url);
          const data = await r.json() as ClickRecord;
          const key  = data.retailer ?? "unknown";
          retailerCounts[key] = (retailerCounts[key] ?? 0) + 1;
        } catch { /* skip bad records */ }
      }

      topClicks = Object.entries(retailerCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));
    } catch (blobErr) {
      console.error("[link-check] Click analytics fetch failed (non-fatal):", blobErr);
    }
  }

  /* ── 4. Load approved brief for link checking ────────────────────── */
  type LookItem = { piece: string; brand: string; buyLink: string };
  type Look     = { label: string; items: LookItem[] };
  type Brief    = { looks: Look[] };

  let brief: Brief | null = null;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "ellie-approved/" });
      const latest = blobs
        .filter(b => b.pathname.endsWith(".json"))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
      if (latest) {
        const r = await fetch(latest.url);
        const d = await r.json();
        if (d?.looks) brief = d;
      }
    }
  } catch { /* fall through */ }

  if (!brief) {
    try {
      const tmpPath = path.join("/tmp", "ellie-approved.json");
      if (fs.existsSync(tmpPath)) brief = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
    } catch { /* fall through */ }
  }

  /* ── 5. Check every buy link ─────────────────────────────────────── */
  const linkResults: LinkResult[] = [];

  if (brief?.looks?.length) {
    const checks = brief.looks.flatMap(look =>
      (look.items ?? []).filter(i => i.buyLink).map(async item => {
        const { ok, status } = await checkLink(item.buyLink);
        linkResults.push({ piece: item.piece, brand: item.brand, url: item.buyLink, ok, status });
      })
    );
    await Promise.all(checks);
  }

  const failCount = linkResults.filter(r => !r.ok).length;
  const checkTime = new Date().toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  }) + " ET";

  console.log(`[link-check] members=${memberCount} mrr=${mrr} clicks=${totalClicksWeek} links=${linkResults.length} failures=${failCount}`);

  /* ── 6. Send report email ────────────────────────────────────────── */
  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    const subject = failCount > 0
      ? `⚠️ ${failCount} broken link${failCount > 1 ? "s" : ""} + weekly report — ${memberCount} members · ${fmt$(mrr)}/mo`
      : `✅ Weekly report — ${memberCount} members · ${fmt$(mrr)}/mo · all links clear`;

    await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject,
      html:    buildReportEmail({
        checkTime, memberCount, monthlyRevenue, newThisWeek, mrr,
        linkResults, topClicks, totalClicksWeek, mailingAddress,
        ga4: ga4Data,
      }),
    });
  }

  return NextResponse.json({
    ok:          failCount === 0,
    memberCount, mrr, monthlyRevenue, newThisWeek,
    totalClicks: totalClicksWeek,
    topClicks:   topClicks.slice(0, 5),
    links:       { checked: linkResults.length, failures: failCount },
    timestamp:   checkTime,
  });
}

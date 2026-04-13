import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/health-check
   Vercel Cron fires this every Sunday at 8:00 AM ET (12:00 UTC).
   Runs before the Sunday curator (6 PM ET) so Ellie has the entire day
   to fix anything before the week's automation kicks off.

   Checks:
     • All required environment variables are set
     • Stripe API key works + returns active subscriber count
     • Resend API key is configured
     • Anthropic API key is configured
     • Vercel Blob token is configured
   
   Sends a branded status email to RESEND_NOTIFY_EMAIL.
   Subject line tells you immediately if everything is green or if there
   are issues — without even opening the email.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 55;

type CheckResult = {
  label:   string;
  ok:      boolean;
  detail:  string;
};

async function probeUrl(url: string): Promise<{ ok: boolean; status: number | string }> {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 8000);
    const r    = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return { ok: r.status < 500, status: r.status };
  } catch (e) {
    return { ok: false, status: String(e).slice(0, 60) };
  }
}

async function runChecks(): Promise<{ checks: CheckResult[]; subscriberCount: number }> {
  const checks: CheckResult[] = [];
  let subscriberCount = 0;
  const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

  /* ── Stripe ─────────────────────────────────────────────────── */
  const stripeKey   = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId     = process.env.STRIPE_PRICE_ID?.trim();
  const annualPrice = process.env.STRIPE_ANNUAL_PRICE_ID?.trim();

  if (!stripeKey) {
    checks.push({ label: "Stripe Secret Key",   ok: false, detail: "STRIPE_SECRET_KEY not set" });
    checks.push({ label: "Stripe Connection",   ok: false, detail: "Cannot connect — key missing" });
  } else {
    checks.push({ label: "Stripe Secret Key",   ok: true,  detail: "Set ✓" });
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const subs   = await stripe.subscriptions.list({ status: "active", limit: 100 });
      subscriberCount = subs.data.length;
      checks.push({ label: "Stripe Connection", ok: true,  detail: `Connected — ${subscriberCount} active subscriber${subscriberCount !== 1 ? "s" : ""}` });
    } catch (e) {
      checks.push({ label: "Stripe Connection", ok: false, detail: `API error: ${String(e).slice(0, 80)}` });
    }
  }

  checks.push({ label: "Stripe Monthly Price ID", ok: Boolean(priceId),     detail: priceId     ? "Set ✓" : "STRIPE_PRICE_ID not set — checkout will fail" });
  checks.push({ label: "Stripe Annual Price ID",  ok: Boolean(annualPrice), detail: annualPrice ? "Set ✓" : "STRIPE_ANNUAL_PRICE_ID not set — annual plan unavailable" });

  /* ── Resend ─────────────────────────────────────────────────── */
  const resendKey    = process.env.RESEND_API_KEY?.trim();
  const fromEmail    = process.env.RESEND_FROM_EMAIL?.trim();
  const notifyEmail  = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const audienceId   = process.env.RESEND_AUDIENCE_ID?.trim();

  checks.push({ label: "Resend API Key",       ok: Boolean(resendKey),   detail: resendKey   ? "Set ✓" : "RESEND_API_KEY not set — all emails will fail" });
  checks.push({ label: "Resend From Email",    ok: Boolean(fromEmail),   detail: fromEmail   ? fromEmail : "RESEND_FROM_EMAIL not set" });
  checks.push({ label: "Resend Notify Email",  ok: Boolean(notifyEmail), detail: notifyEmail ? notifyEmail : "RESEND_NOTIFY_EMAIL not set — you will miss notifications" });
  checks.push({ label: "Resend Audience ID",   ok: Boolean(audienceId),  detail: audienceId  ? "Set ✓" : "RESEND_AUDIENCE_ID not set — drip emails won't run" });

  /* ── Anthropic — live API test ────────────────────────────────── */
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicKey) {
    checks.push({ label: "Anthropic (Claude) Key", ok: false, detail: "ANTHROPIC_API_KEY not set — Sunday curator will fail" });
    checks.push({ label: "Anthropic Live Test",    ok: false, detail: "Cannot test — key missing" });
  } else {
    checks.push({ label: "Anthropic (Claude) Key", ok: true, detail: "Set ✓" });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body:    JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
      });
      if (res.ok || res.status === 400) {
        checks.push({ label: "Anthropic Live Test", ok: true, detail: "API responding — curator will run tonight ✓" });
      } else {
        checks.push({ label: "Anthropic Live Test", ok: false, detail: `API error ${res.status} — check key or billing` });
      }
    } catch (e) {
      checks.push({ label: "Anthropic Live Test", ok: false, detail: `Connection failed: ${String(e).slice(0, 60)}` });
    }
  }

  /* ── Resend — live API validation ─────────────────────────────── */
  const resendKeyForTest = process.env.RESEND_API_KEY?.trim();
  if (resendKeyForTest) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKeyForTest}` },
      });
      if (res.ok) {
        const data = await res.json() as { data?: Array<{ name: string; status: string }> };
        const domains = data?.data ?? [];
        const verified = domains.find(d => d.status === "verified");
        checks.push({
          label:  "Resend Live Test",
          ok:     true,
          detail: verified ? `Verified domain: ${verified.name} ✓` : "Key valid — no verified domain yet",
        });
      } else {
        checks.push({ label: "Resend Live Test", ok: false, detail: `API returned ${res.status} — key may be invalid` });
      }
    } catch (e) {
      checks.push({ label: "Resend Live Test", ok: false, detail: `Connection failed: ${String(e).slice(0, 60)}` });
    }
  }

  /* ── Vercel Blob — live connectivity + brief freshness ─────────── */
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    checks.push({ label: "Vercel Blob Storage",  ok: false, detail: "BLOB_READ_WRITE_TOKEN not set — homepage won't auto-update" });
    checks.push({ label: "Approved Brief (Blob)", ok: false, detail: "Cannot check — Blob not configured" });
  } else {
    checks.push({ label: "Vercel Blob Storage", ok: true, detail: "Set ✓" });
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "ellie-approved/" });
      if (blobs.length === 0) {
        /* Health check fires Sunday 8 AM ET (12 UTC). Curator runs Sunday 6 PM ET (22 UTC).
           On the same Sunday — and on a brand-new site before the first curator run — there
           will never be a brief yet. This is expected, not an error. Only flag it as a
           real failure if we're past 11 PM ET on Sunday (curator had its window and still nothing). */
        const nowUtc       = new Date();
        const dayOfWeek    = nowUtc.getUTCDay();    // 0 = Sunday
        const hourUtc      = nowUtc.getUTCHours();  // curator = 22 UTC, window closes ~23 UTC
        const isSundayPreCurator = dayOfWeek === 0 && hourUtc < 23;
        if (isSundayPreCurator) {
          checks.push({ label: "Approved Brief (Blob)", ok: true, detail: "No brief yet — curator runs at 6 PM ET tonight ✓" });
        } else {
          checks.push({ label: "Approved Brief (Blob)", ok: false, detail: "No approved brief in Blob — curator may not have run or brief was not approved" });
        }
      } else {
        const latest  = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
        const daysOld = Math.floor((Date.now() - new Date(latest.uploadedAt).getTime()) / 86_400_000);
        if (daysOld > 8) {
          checks.push({ label: "Approved Brief (Blob)", ok: false, detail: `Brief is ${daysOld} days old — curator may have failed last Sunday` });
        } else {
          checks.push({ label: "Approved Brief (Blob)", ok: true, detail: `Brief from ${daysOld} day${daysOld !== 1 ? "s" : ""} ago — current ✓` });
        }
      }
    } catch (e) {
      checks.push({ label: "Approved Brief (Blob)", ok: false, detail: `Blob read failed: ${String(e).slice(0, 60)}` });
    }
  }

  /* ── Site URL ───────────────────────────────────────────────────── */
  const siteUrlEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  checks.push({ label: "Site URL", ok: Boolean(siteUrlEnv), detail: siteUrlEnv ? siteUrlEnv : "NEXT_PUBLIC_BASE_URL not set" });

  /* ── Cron security ──────────────────────────────────────────────── */
  const cronSecret    = process.env.CRON_SECRET?.trim();
  const approveSecret = process.env.CURATOR_APPROVE_SECRET?.trim();
  checks.push({ label: "Cron Secret",    ok: Boolean(cronSecret),    detail: cronSecret    ? "Set ✓" : "CRON_SECRET not set — cron jobs are unprotected" });
  checks.push({ label: "Approve Secret", ok: Boolean(approveSecret), detail: approveSecret ? "Set ✓" : "CURATOR_APPROVE_SECRET not set — approval link is unprotected" });

  /* ── All public page routes — checked in parallel ───────────────── */
  const publicRoutes: Array<[string, string]> = [
    ["/",                    "Homepage"],
    ["/login",               "Login page"],
    ["/contact",             "Contact page"],
    ["/blog",                "Blog index"],
    ["/press",               "Press page"],
    ["/terms",               "Terms of Service"],
    ["/privacy",             "Privacy Policy"],
    ["/sitemap.xml",         "Sitemap XML"],
    ["/api/current-preview", "Current-preview API"],
  ];
  const routeResults = await Promise.all(
    publicRoutes.map(async ([path, label]) => {
      const r = await probeUrl(`${siteUrl}${path}`);
      return { label, ok: r.ok, detail: r.ok ? `${r.status} ✓` : `${r.status} — DOWN` };
    })
  );
  checks.push(...routeResults.map(r => ({ label: `Page: ${r.label}`, ok: r.ok, detail: r.detail })));

  /* ── Optional integrations — just report status, no fail ────────── */
  const optionalVars: Array<[string, string]> = [
    ["GA4_PROPERTY_ID",         "GA4 Analytics (Wednesday report)"],
    ["GA4_SERVICE_ACCOUNT_KEY", "GA4 Service Account Key"],
    ["REDDIT_CLIENT_ID",        "Reddit agent (Tuesday posts)"],
    ["REDDIT_CLIENT_SECRET",    "Reddit client secret"],
    ["REDDIT_USERNAME",         "Reddit username"],
    ["REDDIT_PASSWORD",         "Reddit password"],
    ["PINTEREST_ACCESS_TOKEN",  "Pinterest auto-poster"],
    ["TWITTER_API_KEY",         "Twitter/X auto-poster"],
    ["SKIMLINKS_PUBLISHER_ID",  "Skimlinks affiliate"],
  ];
  for (const [key, label] of optionalVars) {
    const val = process.env[key]?.trim();
    checks.push({
      label:  `Optional: ${label}`,
      ok:     true, // optional vars never fail the health check
      detail: val ? "Set ✓" : "Not set — feature inactive (ok if not yet configured)",
    });
  }

  return { checks, subscriberCount };
}

function buildHealthEmail(
  checks: CheckResult[],
  subscriberCount: number,
  allGreen: boolean,
  now: string
): string {
  const mailingAddress = (process.env.BUSINESS_MAILING_ADDRESS ?? "The Style Refresh · New York, NY").trim();
  const siteUrl        = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

  const requiredChecks = checks.filter(c => !c.label.startsWith("Optional:"));
  const optionalChecks = checks.filter(c =>  c.label.startsWith("Optional:"));
  const issueCount     = requiredChecks.filter(c => !c.ok).length;

  const makeRows = (list: CheckResult[]) => list.map(c => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:13px;color:#2C2C2C;width:50%;">
        ${c.label.replace("Optional: ", "")}
      </td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:13px;width:10%;text-align:center;">
        ${c.ok ? "✅" : "❌"}
      </td>
      <td style="padding:9px 14px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
                  font-size:12px;color:${c.ok ? "#6B6560" : "#c0392b"};">
        ${c.detail}
      </td>
    </tr>`).join("");
  const checkRows    = makeRows(requiredChecks);
  const optionalRows = makeRows(optionalChecks);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Weekly Health Check — The Style Refresh</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:620px;width:100%;border:1px solid #DDD4C5;">

  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,${allGreen ? "#4A6741" : "#c0392b"},transparent);"></td></tr>

  <tr><td style="background:#EDE5D8;padding:26px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · The Style Refresh
    </p>
    <h1 style="margin:6px 0 4px;color:#2C2C2C;font-size:22px;font-weight:400;font-family:Georgia,serif;">
      ${allGreen ? "✅ All Systems Running" : `⚠️ ${issueCount} Issue${issueCount !== 1 ? "s" : ""} Found`}
    </h1>
    <p style="margin:0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Weekly check · ${now}
    </p>
  </td></tr>

  ${!allGreen ? `
  <tr><td style="padding:16px 36px 0;">
    <div style="background:#FDF0ED;border:1px solid #e8b4a8;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#c0392b;font-family:Arial,sans-serif;line-height:1.6;">
        <strong>Action required before this Sunday's curator runs at 6 PM ET.</strong><br/>
        Fix the items marked ❌ in Vercel → Settings → Environment Variables, then redeploy.
      </p>
    </div>
  </td></tr>` : ""}

  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#C4956A;font-family:Arial,sans-serif;">
      System Status
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;
            border:1px solid #E8DDD0;">
      ${checkRows}
    </table>
  </td></tr>

  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#C4956A;font-family:Arial,sans-serif;">
      This Week
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;
            border:1px solid #E8DDD0;">
      <tr>
        <td style="padding:10px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                    font-family:Arial,sans-serif;font-size:12px;color:#C4956A;
                    text-transform:uppercase;letter-spacing:0.16em;width:30%;">Today</td>
        <td style="padding:10px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                    font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">
          Curator runs at 6 PM ET — you'll get your approval email then
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                    font-family:Arial,sans-serif;font-size:12px;color:#C4956A;
                    text-transform:uppercase;letter-spacing:0.16em;">Tomorrow</td>
        <td style="padding:10px 14px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                    font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">
          Monday brief sends to all ${subscriberCount} member${subscriberCount !== 1 ? "s" : ""} at 7 AM ET
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#F5EFE4;
                    font-family:Arial,sans-serif;font-size:12px;color:#C4956A;
                    text-transform:uppercase;letter-spacing:0.16em;">Active</td>
        <td style="padding:10px 14px;background:#F5EFE4;
                    font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">
          <strong>${subscriberCount} paying member${subscriberCount !== 1 ? "s" : ""}</strong>
          &nbsp;·&nbsp; $${subscriberCount * 19}/month recurring
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#C4956A;font-family:Arial,sans-serif;">
      Your Dashboards
    </p>
    <table cellpadding="0" cellspacing="0">
      ${[
        ["Stripe",   "https://dashboard.stripe.com",          "Subscribers & revenue"],
        ["Resend",   "https://resend.com/emails",              "Email delivery logs"],
        ["Vercel",   "https://vercel.com/dashboard",          "Deployments & logs"],
        ["The Blog", `${siteUrl}/blog`,                        "Published look archive"],
      ].map(([label, url, desc]) => `
      <tr>
        <td style="padding:5px 14px 5px 0;">
          <a href="${url}" style="font-family:Arial,sans-serif;font-size:12px;
                                   color:#C4956A;text-decoration:none;">${label} →</a>
        </td>
        <td style="padding:5px 0;font-family:Arial,sans-serif;font-size:12px;color:#8A8580;">
          ${desc}
        </td>
      </tr>`).join("")}
    </table>
  </td></tr>

  <!-- Optional integrations -->
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#8A8580;font-family:Arial,sans-serif;">
      Optional Integrations (not required — inactive until you configure them)
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;
            border:1px solid #E8DDD0;opacity:0.8;">
      ${optionalRows}
    </table>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>
  <tr><td style="padding:0 36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>
  <tr><td style="padding:16px 36px 24px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      ${mailingAddress}<br/>
      This is your automated weekly system health check. Sent every Sunday at 8 AM ET.
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  /* Authenticate */
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  const { checks, subscriberCount } = await runChecks();
  const requiredOnly = checks.filter(c => !c.label.startsWith("Optional:"));
  const allGreen     = requiredOnly.every(c => c.ok);
  const issueCount   = requiredOnly.filter(c => !c.ok).length;

  const now = new Date().toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York",
  }) + " ET";

  console.log(`[health-check] ${allGreen ? "ALL GREEN" : `${issueCount} ISSUES`} | ${subscriberCount} subscribers | ${now}`);

  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from:    `Ellie <${fromEmail}>`,
      to:      notifyEmail,
      subject: allGreen
        ? `✅ All Systems Running — The Style Refresh — ${subscriberCount} member${subscriberCount !== 1 ? "s" : ""}`
        : `⚠️ ${issueCount} Issue${issueCount !== 1 ? "s" : ""} Found — The Style Refresh — Fix Before 6 PM Today`,
      html: buildHealthEmail(checks, subscriberCount, allGreen, now),
    });

    if (error) {
      console.error("[health-check] Failed to send email:", error);
    }
  } else {
    console.warn("[health-check] Cannot send — RESEND_API_KEY or RESEND_NOTIFY_EMAIL not set");
  }

  return NextResponse.json({
    ok:              allGreen,
    issues:          issueCount,
    subscriberCount,
    checks:          checks.map(c => ({ label: c.label, ok: c.ok })),
    timestamp:       now,
  });
}

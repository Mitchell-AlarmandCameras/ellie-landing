import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/monitor
   Runs every 2 hours via Vercel Cron.

   Tests every critical system that members and Ellie depend on:
     • Site homepage reachable
     • Checkout API responds
     • Member login API responds
     • Stripe API reachable + key valid
     • Resend API key set
     • All required env vars present

   SMART ALERTING — only sends email when status CHANGES:
     • Working → Broken  : sends ALERT email immediately
     • Broken  → Working : sends RECOVERY email immediately
     • No change         : silent (no email spam)

   Last known state is stored in Vercel Blob so alerts fire once,
   not every 2 hours while something is down.
═══════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 30;

type Check = { name: string; ok: boolean; detail: string };
type MonitorState = { allOk: boolean; failures: string[]; checkedAt: string };

const STATE_KEY = "monitor/last-state.json";

/* ── Helpers ──────────────────────────────────────────────────────── */

async function loadLastState(): Promise<MonitorState | null> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: STATE_KEY });
    if (!blobs[0]) return null;
    const r = await fetch(blobs[0].url, { cache: "no-store" });
    return r.ok ? await r.json() as MonitorState : null;
  } catch { return null; }
}

async function saveState(state: MonitorState): Promise<void> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return;
    const { put } = await import("@vercel/blob");
    await put(STATE_KEY, JSON.stringify(state), {
      access: "public", contentType: "application/json", addRandomSuffix: false,
    });
  } catch { /* non-fatal */ }
}

async function probe(url: string, opts?: RequestInit): Promise<{ ok: boolean; status: number | string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(t);
    return { ok: r.status < 500, status: r.status };
  } catch (e) {
    return { ok: false, status: String(e).slice(0, 60) };
  }
}

/* ── Run all checks ───────────────────────────────────────────────── */

async function runChecks(baseUrl: string): Promise<Check[]> {
  const checks: Check[] = [];

  /* 1 — Homepage loads */
  const home = await probe(baseUrl);
  checks.push({
    name:   "Homepage",
    ok:     home.ok,
    detail: home.ok ? `Responding (${home.status})` : `DOWN — status ${home.status}`,
  });

  /* 2 — Checkout API responds (POST with empty body — will fail gracefully, not 500) */
  const checkout = await probe(`${baseUrl}/api/checkout`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({}),
  });
  checks.push({
    name:   "Checkout API",
    ok:     checkout.ok,
    detail: checkout.ok ? `Responding (${checkout.status})` : `DOWN — status ${checkout.status}`,
  });

  /* 3 — Login API responds */
  const login = await probe(`${baseUrl}/api/member-login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email: "monitor@test.invalid", password: "test" }),
  });
  checks.push({
    name:   "Login API",
    ok:     login.ok,
    detail: login.ok ? `Responding (${login.status})` : `DOWN — status ${login.status}`,
  });

  /* 4 — Stripe key valid */
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    checks.push({ name: "Stripe", ok: false, detail: "STRIPE_SECRET_KEY missing — checkout broken" });
  } else {
    try {
      const Stripe  = (await import("stripe")).default;
      const stripe  = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const balance = await stripe.balance.retrieve();
      checks.push({ name: "Stripe", ok: true, detail: `Connected — ${balance.livemode ? "LIVE" : "test"} mode` });
    } catch (e) {
      checks.push({ name: "Stripe", ok: false, detail: `API error: ${String(e).slice(0, 80)}` });
    }
  }

  /* 5 — Resend key set */
  const resendKey = process.env.RESEND_API_KEY?.trim();
  checks.push({
    name:   "Email (Resend)",
    ok:     Boolean(resendKey),
    detail: resendKey ? "API key set ✓" : "RESEND_API_KEY missing — all emails broken",
  });

  /* 6 — Critical env vars */
  const required = [
    ["STRIPE_PRICE_ID",       "Monthly checkout"],
    ["NEXT_PUBLIC_BASE_URL",  "Site URL"],
    ["ANTHROPIC_API_KEY",     "AI curator"],
    ["BLOB_READ_WRITE_TOKEN", "Storage / dashboard sync"],
  ];
  for (const [key, label] of required) {
    const val = process.env[key]?.trim();
    checks.push({
      name:   label,
      ok:     Boolean(val),
      detail: val ? "Set ✓" : `${key} missing`,
    });
  }

  /* 7 — Dashboard page reachable (redirects to /login for non-members = 200 or 307, both fine) */
  const dash = await probe(`${baseUrl}/dashboard`);
  checks.push({
    name:   "VIP Room (dashboard)",
    ok:     dash.ok,
    detail: dash.ok ? `Reachable (${dash.status})` : `DOWN — ${dash.status}`,
  });

  /* 8 — Current-preview API returns JSON (homepage brief cards) */
  const preview = await probe(`${baseUrl}/api/current-preview`);
  checks.push({
    name:   "Current-preview API",
    ok:     preview.ok,
    detail: preview.ok ? `Responding (${preview.status})` : `DOWN — ${preview.status}`,
  });

  /* 9 — Sitemap accessible (important for SEO indexing) */
  const sitemap = await probe(`${baseUrl}/sitemap.xml`);
  checks.push({
    name:   "Sitemap (/sitemap.xml)",
    ok:     sitemap.ok,
    detail: sitemap.ok ? `Accessible (${sitemap.status})` : `DOWN — ${sitemap.status}`,
  });

  /* 10 — Contact page reachable (member support) */
  const contact = await probe(`${baseUrl}/contact`);
  checks.push({
    name:   "Contact page",
    ok:     contact.ok,
    detail: contact.ok ? `Reachable (${contact.status})` : `DOWN — ${contact.status}`,
  });

  return checks;
}

/* ── Alert emails ─────────────────────────────────────────────────── */

function alertEmail(failures: string[], checkedAt: string, baseUrl: string): string {
  const rows = failures.map(f =>
    `<tr><td style="padding:9px 16px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;
      font-size:13px;color:#c0392b;">❌ ${f}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:540px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:4px;background:#c0392b;"></td></tr>
  <tr><td style="background:#FDF0ED;padding:24px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#c0392b;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      ⚠️ Site Alert · The Style Refresh
    </p>
    <h1 style="margin:6px 0 4px;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      ${failures.length} system${failures.length > 1 ? "s" : ""} need${failures.length === 1 ? "s" : ""} attention
    </h1>
    <p style="margin:0;color:#c0392b;font-size:12px;font-family:Arial,sans-serif;">${checkedAt}</p>
  </td></tr>
  <tr><td style="padding:20px 36px 0;">
    <div style="background:#FDF0ED;border:1px solid #e8b4a8;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#c0392b;font-family:Arial,sans-serif;line-height:1.6;">
        <strong>Your members may be affected right now.</strong> Open Cursor and message Claude with
        "Something is broken on the site" — he will diagnose and fix it.
      </p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      ${rows}
    </table>
  </td></tr>
  <tr><td style="padding:20px 36px;">
    <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:11px;color:#6B6560;letter-spacing:0.1em;text-transform:uppercase;">
      Quick links
    </p>
    <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:2;">
      <a href="https://vercel.com/dashboard" style="color:#C4956A;">Vercel Logs →</a>&nbsp;&nbsp;
      <a href="https://dashboard.stripe.com" style="color:#C4956A;">Stripe →</a>&nbsp;&nbsp;
      <a href="https://resend.com/emails" style="color:#C4956A;">Resend Emails →</a>&nbsp;&nbsp;
      <a href="${baseUrl}" style="color:#C4956A;">Live Site →</a>
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 20px;text-align:center;font-family:Arial,sans-serif;font-size:10px;color:#B5A99A;">
    Automated monitor · checks every 2 hours · The Style Refresh
  </td></tr>
</table></td></tr></table></body></html>`;
}

function recoveryEmail(checkedAt: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:540px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:4px;background:#4A6741;"></td></tr>
  <tr><td style="background:#F0F7EE;padding:24px 36px;text-align:center;">
    <p style="margin:0 0 4px;color:#4A6741;font-size:10px;letter-spacing:0.34em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      ✅ Recovered · The Style Refresh
    </p>
    <h1 style="margin:6px 0 4px;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      All systems back online
    </h1>
    <p style="margin:0;color:#4A6741;font-size:12px;font-family:Arial,sans-serif;">${checkedAt}</p>
  </td></tr>
  <tr><td style="padding:20px 36px;">
    <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#2C2C2C;line-height:1.75;text-align:center;">
      Everything is working normally.<br/>
      Your members can shop, login, and receive emails without any issues.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 20px;text-align:center;font-family:Arial,sans-serif;font-size:10px;color:#B5A99A;">
    Automated monitor · The Style Refresh
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* ── Main handler ─────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  /* Auth */
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  const checkedAt = new Date().toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  }) + " ET";

  /* Run all checks */
  const checks   = await runChecks(baseUrl);
  const failures = checks.filter(c => !c.ok).map(c => `${c.name}: ${c.detail}`);
  const allOk    = failures.length === 0;

  console.log(`[monitor] ${allOk ? "ALL OK" : `${failures.length} FAILURES`} — ${checkedAt}`);

  /* Load last known state */
  const lastState = await loadLastState();
  const wasOk     = lastState?.allOk ?? true;

  /* Save current state */
  await saveState({ allOk, failures, checkedAt });

  /* Only email on state CHANGE — no spam */
  let emailSent = false;
  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);

    if (wasOk && !allOk) {
      /* Transition: working → broken → ALERT */
      await resend.emails.send({
        from:    `Ellie <${fromEmail}>`,
        to:      notifyEmail,
        subject: `🚨 Site alert — ${failures.length} system${failures.length > 1 ? "s" : ""} down · stylebyellie.com`,
        html:    alertEmail(failures, checkedAt, baseUrl),
      });
      emailSent = true;
      console.log("[monitor] ALERT email sent");

    } else if (!wasOk && allOk) {
      /* Transition: broken → working → RECOVERY */
      await resend.emails.send({
        from:    `Ellie <${fromEmail}>`,
        to:      notifyEmail,
        subject: `✅ Recovered — all systems back online · stylebyellie.com`,
        html:    recoveryEmail(checkedAt),
      });
      emailSent = true;
      console.log("[monitor] RECOVERY email sent");
    }
    /* No change = no email */
  }

  return NextResponse.json({
    ok:        allOk,
    failures,
    checks:    checks.map(c => ({ name: c.name, ok: c.ok })),
    emailSent,
    timestamp: checkedAt,
  });
}

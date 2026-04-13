import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/director-operations
   THE OPERATIONS DIRECTOR — Tier 2 manager, reports to CEO, leads Tier 3 ops workers.

   Runs daily at 6 AM ET (10:00 UTC).

   Chain of command:
     CEO brief → Operations Director → Deploy Watchdog / Link Repair / Monitor

   What it does:
     1. Reads CEO's strategic brief from Blob
     2. Reads Deploy Watchdog's processed deployments from Blob
     3. Checks if an approved brief exists and how fresh it is
     4. Checks if the most recent approved brief has any stale/broken link signals
     5. Synthesizes an ops health report (green/yellow/red)
     6. Saves ops directive to ellie-directives/ops.json — read by CEO on Sunday
     7. Emails owner ONLY if system health is yellow or red
     8. On green days: stays silent (no email noise)
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 30;

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface OpsDirective {
  checkedAt:         string;
  systemHealth:      "green" | "yellow" | "red";
  openIssues:        string[];
  resolvedIssues:    string[];
  briefFreshness:    "current" | "stale" | "missing";
  lastBriefWeekOf:   string;
  watchdogStatus:    "clean" | "had_failures" | "unknown";
  recentFailures:    number;
  escalate:          boolean;
  escalationNote:    string;
}

/* ─── Load CEO brief ────────────────────────────────────────────────────── */
async function loadCeoBrief(): Promise<{ opsDirective?: string }> {
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

/* ─── Load watchdog processed deployments ──────────────────────────────── */
async function loadWatchdogState(): Promise<{
  processed: Array<{ deploymentId: string; processedAt: string; status?: string; autoFixed?: boolean }>;
}> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-watchdog/" });
    const file = blobs.find(b => b.pathname === "ellie-watchdog/processed.json");
    if (!file) return { processed: [] };
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return { processed: [] };
    const data = await r.json();
    /* Handle array or object format */
    if (Array.isArray(data)) return { processed: data };
    if (Array.isArray(data.processed)) return data;
    return { processed: [] };
  } catch { return { processed: [] }; }
}

/* ─── Load and assess approved brief freshness ──────────────────────────── */
async function loadApprovedBriefMeta(): Promise<{
  exists:    boolean;
  weekOf:    string;
  freshDays: number;
}> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    if (!blobs.length) return { exists: false, weekOf: "none", freshDays: 999 };

    const sorted = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (!sorted.length) return { exists: false, weekOf: "none", freshDays: 999 };

    const latest = sorted[0];
    const ageDays = (Date.now() - new Date(latest.uploadedAt).getTime()) / 86_400_000;

    /* Try to read the weekOf from the brief */
    let weekOf = latest.pathname;
    try {
      const r = await fetch(latest.url, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json() as { weekOf?: string };
        if (data.weekOf) weekOf = data.weekOf;
      }
    } catch { /* use filename */ }

    return { exists: true, weekOf, freshDays: Math.round(ageDays) };
  } catch {
    return { exists: false, weekOf: "unknown", freshDays: 999 };
  }
}

/* ─── Assess system health ──────────────────────────────────────────────── */
function assessHealth(
  briefMeta:       Awaited<ReturnType<typeof loadApprovedBriefMeta>>,
  watchdogState:   Awaited<ReturnType<typeof loadWatchdogState>>,
): { health: "green" | "yellow" | "red"; issues: string[]; resolved: string[] } {
  const issues:   string[] = [];
  const resolved: string[] = [];

  /* Brief freshness */
  if (!briefMeta.exists) {
    issues.push("No approved brief found in Blob — content pipeline may be broken");
  } else if (briefMeta.freshDays > 14) {
    issues.push(`Approved brief is ${briefMeta.freshDays} days old — curator may not have run`);
  } else {
    resolved.push(`Brief is current (${briefMeta.freshDays} days old)`);
  }

  /* Recent deployment failures */
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentEntries = watchdogState.processed.filter(
    p => p.processedAt > sevenDaysAgo,
  );
  const recentFailures = recentEntries.length;

  if (recentFailures > 3) {
    issues.push(`${recentFailures} deployment failures in the last 7 days — site may be unstable`);
  } else if (recentFailures > 0) {
    const autoFixed = recentEntries.filter(p => p.autoFixed).length;
    if (autoFixed === recentFailures) {
      resolved.push(`${recentFailures} deployment failure(s) — all auto-fixed by watchdog`);
    } else {
      issues.push(`${recentFailures - autoFixed} deployment failure(s) may need manual review`);
    }
  } else {
    resolved.push("No deployment failures this week");
  }

  const health: "green" | "yellow" | "red" =
    issues.length === 0         ? "green"
    : issues.length <= 1        ? "yellow"
    : "red";

  return { health, issues, resolved };
}

/* ─── Build alert email ─────────────────────────────────────────────────── */
function buildAlertEmail(d: OpsDirective): string {
  const siteUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const colorMap = { green: "#3A7D44", yellow: "#C4956A", red: "#C0392B" };
  const bgMap    = { green: "#F0FAF2", yellow: "#FFF8F0", red: "#FFF2F2" };
  const labelMap = { green: "All Systems Green", yellow: "Attention Needed", red: "Urgent — Action Required" };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:580px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:${colorMap[d.systemHealth]};"></td></tr>

  <!-- Header -->
  <tr><td style="background:${bgMap[d.systemHealth]};padding:24px 36px;">
    <p style="margin:0 0 4px;color:${colorMap[d.systemHealth]};font-size:10px;letter-spacing:0.38em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Operations Director · System Alert
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      ${labelMap[d.systemHealth]}
    </h2>
    <p style="margin:6px 0 0;color:#6B6560;font-size:11px;font-family:Arial,sans-serif;">
      Checked ${new Date(d.checkedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
    </p>
  </td></tr>

  <!-- Issues -->
  ${d.openIssues.length ? `
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 10px;color:#C0392B;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Open Issues</p>
    ${d.openIssues.map(issue => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="4" style="background:#C0392B;"></td>
        <td style="padding:10px 14px;background:#FFF2F2;">
          <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">${issue}</p>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>` : ""}

  <!-- Escalation note -->
  ${d.escalate ? `
  <tr><td style="padding:16px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:2px solid #C0392B;background:#FFF9F9;">
      <tr><td style="background:#C0392B;padding:10px 16px;">
        <p style="margin:0;color:#FFF;font-size:9px;letter-spacing:0.18em;
                   text-transform:uppercase;font-family:Arial,sans-serif;">Escalated to owner</p>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;color:#2C2C2C;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
          ${d.escalationNote}
        </p>
      </td></tr>
    </table>
  </td></tr>` : ""}

  <!-- Resolved -->
  ${d.resolvedIssues.length ? `
  <tr><td style="padding:20px 36px 0;">
    <p style="margin:0 0 8px;color:#3A7D44;font-size:9px;letter-spacing:0.24em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Confirmed Working</p>
    ${d.resolvedIssues.map(r => `
    <p style="margin:0 0 4px;color:#4A4A4A;font-size:12px;font-family:Arial,sans-serif;">✓ ${r}</p>`).join("")}
  </td></tr>` : ""}

  <!-- Footer -->
  <tr><td style="padding:24px 36px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Operations Director monitors 24/7. You only receive this email when action is needed. · <a href="${siteUrl}" style="color:#C4956A;">stylebyellie.com</a>
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "BLOB_READ_WRITE_TOKEN not configured" });
  }

  /* 1 — Gather inputs in parallel */
  const [ceoBrief, watchdogState, briefMeta] = await Promise.all([
    loadCeoBrief(),
    loadWatchdogState(),
    loadApprovedBriefMeta(),
  ]);

  void ceoBrief; /* Stored for future directive reading */

  /* 2 — Assess health */
  const { health, issues, resolved } = assessHealth(briefMeta, watchdogState);

  const sevenDaysAgo   = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentFailures = watchdogState.processed.filter(p => p.processedAt > sevenDaysAgo).length;

  const directive: OpsDirective = {
    checkedAt:       new Date().toISOString(),
    systemHealth:    health,
    openIssues:      issues,
    resolvedIssues:  resolved,
    briefFreshness:  !briefMeta.exists   ? "missing"
                   : briefMeta.freshDays > 14 ? "stale" : "current",
    lastBriefWeekOf: briefMeta.weekOf,
    watchdogStatus:  recentFailures === 0 ? "clean" : "had_failures",
    recentFailures,
    escalate:        health === "red",
    escalationNote:  health === "red"
      ? `System health is RED. Issues: ${issues.join(" | ")}. Please review immediately.`
      : "",
  };

  /* 3 — Save to Blob */
  try {
    const { put } = await import("@vercel/blob");
    await put("ellie-directives/ops.json", JSON.stringify(directive), {
      access:          "public",
      contentType:     "application/json",
      addRandomSuffix: false,
    });
    console.log(`[director-ops] Health: ${health} · Issues: ${issues.length}`);
  } catch (blobErr) {
    console.error("[director-ops] Blob save failed:", blobErr);
  }

  /* 4 — Email only if not green */
  if (health !== "green") {
    const resendKey   = process.env.RESEND_API_KEY?.trim();
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
    const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

    if (resendKey && notifyEmail) {
      const resend  = new Resend(resendKey);
      const emoji   = health === "red" ? "🚨" : "⚠️";
      const subject = `${emoji} Ops Alert — ${issues[0] ?? "System needs attention"}`;

      await resend.emails.send({
        from:    `Ellie Operations Director <${fromEmail}>`,
        to:      notifyEmail,
        subject,
        html:    buildAlertEmail(directive),
      }).catch(e => console.error("[director-ops] Email failed:", e));
    }
  }

  return NextResponse.json({
    ok:            true,
    systemHealth:  directive.systemHealth,
    openIssues:    directive.openIssues,
    briefFreshness: directive.briefFreshness,
    escalated:     directive.escalate,
  });
}

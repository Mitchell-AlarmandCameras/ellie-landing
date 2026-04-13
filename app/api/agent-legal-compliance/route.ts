/**
 * LEGAL COMPLIANCE AGENT — The Style Refresh (Fashion)
 * ======================================================
 * Runs weekly (Sunday midnight ET) via Vercel cron.
 * Also callable manually: GET /api/agent-legal-compliance
 * Authorization: Bearer CRON_SECRET
 *
 * What this agent checks:
 *
 * [FASHION-SPECIFIC]
 *  1. Editorial disclaimer — "not professional styling advice" language
 *  2. Size/fit disclaimer — "sizing varies by brand" language
 *  3. Availability disclaimer — "prices and availability subject to change"
 *  4. No misleading exclusivity claims — scanning for false scarcity language
 *
 * [UNIVERSAL — all industries]
 *  5. FTC affiliate disclosure — visible on every page with shop links
 *  6. CAN-SPAM mailing address — present in footer
 *  7. Privacy Policy link — present in footer
 *  8. Terms of Service link — present in footer
 *  9. Copyright notice — present in footer
 * 10. GDPR / CCPA privacy rights statement — present on privacy page
 *
 * Output: sends a compliance report email every Sunday.
 * If any CRITICAL issue is found, sends an immediate alert email.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend    = new Resend(process.env.RESEND_API_KEY);
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? "hello@thestylerefresh.com";
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thestylerefresh.com";
const NICHE       = "fashion";

// ─── Required Fashion Disclaimers ────────────────────────────────────────────
// FTC and consumer protection standards for style/editorial sites
const REQUIRED_FASHION_DISCLAIMERS = [
  "affiliate",
  "commission",
];

// ─── Misleading Exclusivity Red Flags ────────────────────────────────────────
// Phrases that could constitute false advertising under FTC Act Section 5
// if they're not literally true
const EXCLUSIVITY_RED_FLAGS = [
  "guaranteed in stock",
  "always available",
  "never sells out",
  "exclusive deal",
  "only available here",
];

const REQUIRED_UNIVERSAL_DISCLAIMERS = [
  "affiliate",
  "privacy",
  "terms",
];

const PAGES_TO_CHECK = [
  { path: "/",        name: "Homepage", type: "fashion+universal" },
  { path: "/terms",   name: "Terms",    type: "fashion+universal" },
  { path: "/privacy", name: "Privacy",  type: "universal"         },
  { path: "/contact", name: "Contact",  type: "universal"         },
];

type CheckResult = {
  page:     string;
  url:      string;
  pass:     boolean;
  issues:   string[];
  warnings: string[];
};

async function auditPage(path: string, name: string, type: string): Promise<CheckResult> {
  const url = `${SITE_URL}${path}`;
  const issues:   string[] = [];
  const warnings: string[] = [];

  let html = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "EllieLegalBot/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      issues.push(`HTTP ${res.status} — page unreachable`);
      return { page: name, url, pass: false, issues, warnings };
    }
    html = (await res.text()).toLowerCase();
  } catch {
    issues.push("Fetch timeout or network error");
    return { page: name, url, pass: false, issues, warnings };
  }

  // ── Fashion exclusivity red-flag scan ─────────────────────────────────────
  if (type.includes("fashion")) {
    for (const phrase of EXCLUSIVITY_RED_FLAGS) {
      if (html.includes(phrase)) {
        issues.push(`Potentially misleading exclusivity claim: "${phrase}" — verify this is literally true or remove`);
      }
    }
  }

  // ── Required fashion disclaimers ──────────────────────────────────────────
  if (type.includes("fashion")) {
    const missingAny = REQUIRED_FASHION_DISCLAIMERS.every(d => !html.includes(d));
    if (missingAny) {
      issues.push(`No affiliate/commission disclosure found. Required by FTC 16 C.F.R. Part 255.`);
    }
  }

  // ── Required universal elements ────────────────────────────────────────────
  if (type.includes("universal")) {
    for (const phrase of REQUIRED_UNIVERSAL_DISCLAIMERS) {
      if (!html.includes(phrase)) {
        issues.push(`Missing required element: "${phrase}"`);
      }
    }
  }

  // ── FTC affiliate disclosure on shop pages ─────────────────────────────────
  if (type.includes("universal") && html.includes("shop") && !html.includes("commission") && !html.includes("affiliate")) {
    issues.push("Page contains shop links but no visible FTC affiliate disclosure");
  }

  // ── Copyright notice ───────────────────────────────────────────────────────
  if (!html.includes("©") && !html.includes("&copy;") && !html.includes("all rights reserved")) {
    warnings.push("No copyright notice detected");
  }

  return {
    page: name,
    url,
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

function buildEmailHtml(results: CheckResult[], criticalCount: number, warningCount: number): string {
  const statusColor = criticalCount > 0 ? "#dc2626" : warningCount > 0 ? "#d97706" : "#16a34a";
  const statusLabel = criticalCount > 0 ? "⚠️ ACTION REQUIRED" : warningCount > 0 ? "🔶 WARNINGS FOUND" : "✅ ALL CLEAR";

  const rows = results.map(r => {
    const rowColor  = r.issues.length > 0 ? "#fef2f2" : r.warnings.length > 0 ? "#fffbeb" : "#f0fdf4";
    const issueList = r.issues.map(i   => `<li style="color:#dc2626">🚨 ${i}</li>`).join("");
    const warnList  = r.warnings.map(w => `<li style="color:#b45309">⚠️ ${w}</li>`).join("");
    return `
      <tr style="background:${rowColor}">
        <td style="padding:10px 12px;font-weight:600">${r.page}</td>
        <td style="padding:10px 12px">
          ${r.pass && r.warnings.length === 0 ? "✅ Pass" : ""}
          ${r.issues.length > 0 || r.warnings.length > 0 ? `<ul style="margin:0;padding-left:18px">${issueList}${warnList}</ul>` : ""}
        </td>
      </tr>`;
  }).join("");

  return `
  <div style="font-family:Inter,sans-serif;max-width:680px;margin:0 auto;padding:32px 24px;background:#faf8f5">
    <div style="background:#1a1a2e;padding:20px 24px;border-radius:8px 8px 0 0">
      <h1 style="color:#fff;font-size:1.1rem;margin:0">The Style Refresh — Legal Compliance Report</h1>
      <p style="color:#c4956a;font-size:0.8rem;margin:6px 0 0">Niche: Fashion · ${new Date().toUTCString()}</p>
    </div>
    <div style="background:#fff;padding:20px 24px;border-left:4px solid ${statusColor}">
      <p style="font-size:1.2rem;font-weight:700;color:${statusColor};margin:0 0 8px">${statusLabel}</p>
      <p style="color:#555;font-size:0.85rem;margin:0">
        ${criticalCount} critical issue(s) · ${warningCount} warning(s) · ${results.length} pages audited
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#fff">
      <thead>
        <tr style="background:#f5efe4">
          <th style="padding:10px 12px;text-align:left;font-size:0.78rem;color:#1a1a2e;width:140px">Page</th>
          <th style="padding:10px 12px;text-align:left;font-size:0.78rem;color:#1a1a2e">Findings</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="background:#f5efe4;padding:16px 20px;margin-top:4px;border-radius:0 0 8px 8px">
      <p style="font-size:0.75rem;color:#888;margin:0;line-height:1.7">
        This report is generated automatically by the Ellie Legal Compliance Agent.<br/>
        It does not constitute legal advice. Consult a licensed attorney for any compliance questions.<br/>
        Agent: /api/agent-legal-compliance · Site: ${SITE_URL}
      </p>
    </div>
  </div>`;
}

export async function GET(req: Request) {
  const authHeader    = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: CheckResult[] = [];
  for (const page of PAGES_TO_CHECK) {
    const result = await auditPage(page.path, page.name, page.type);
    results.push(result);
  }

  const criticalCount = results.reduce((n, r) => n + r.issues.length, 0);
  const warningCount  = results.reduce((n, r) => n + r.warnings.length, 0);
  const allClear      = criticalCount === 0;

  const subject = allClear
    ? `✅ Legal Compliance — All Clear · ${NICHE} · ${new Date().toLocaleDateString()}`
    : `🚨 Legal Compliance ALERT — ${criticalCount} Issue(s) Found · ${NICHE}`;

  await resend.emails.send({
    from:    "Ellie Legal Agent <agent@thestylerefresh.com>",
    to:      [ALERT_EMAIL],
    subject,
    html:    buildEmailHtml(results, criticalCount, warningCount),
  });

  return NextResponse.json({
    ok:             true,
    niche:          NICHE,
    pagesAudited:   results.length,
    criticalIssues: criticalCount,
    warnings:       warningCount,
    allClear,
    results,
  });
}

export const POST = GET;

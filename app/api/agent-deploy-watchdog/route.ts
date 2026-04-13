import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET  /api/agent-deploy-watchdog   ← Vercel Cron (every hour)
   POST /api/agent-deploy-watchdog   ← Vercel Webhook (instant, on failure)

   THE DEPLOYMENT WATCHDOG — Ellie's autonomous build engineer.

   Full autonomous loop — no human touch needed:
     1. Detects a failed Vercel deployment (via cron poll OR instant webhook)
     2. Fetches the full build log from Vercel API
     3. Parses the error: file path, line number, error type
     4. Fetches the broken file from GitHub
     5. Asks Claude to generate the exact fix
     6. For HIGH-CONFIDENCE errors (missing import, syntax error, module not
        found): pushes the fix directly to GitHub → triggers a new deployment
     7. For COMPLEX errors: emails owner with full diagnosis + fix ready to paste
     8. Tracks processed deployments in Blob to never double-process

   Required env vars (add to Vercel):
     VERCEL_TOKEN       — Vercel account API token (Account Settings → Tokens)
     VERCEL_PROJECT_ID  — Project ID (Project Settings → General, copy "Project ID")
     GITHUB_TOKEN       — GitHub fine-grained PAT with Contents: Read & Write
                          (GitHub → Settings → Developer Settings → Fine-grained tokens)
     GITHUB_REPO_OWNER  — "Mitchell-AlarmandCameras"
     GITHUB_REPO_NAME   — "AlarmEngine_PRO"

   Optional (for instant webhook — set in Vercel Dashboard → Project → Settings → Git → Deploy Hooks):
     Add a Deploy Hook named "watchdog" pointed at this route with POST method.
     Without webhook, the hourly cron catches failures within 60 minutes.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 55;

/* ─── Error confidence levels ─────────────────────────────────────────── */
type Confidence = "HIGH" | "MEDIUM" | "LOW";

const HIGH_CONFIDENCE_PATTERNS: RegExp[] = [
  /Module not found.*Can't resolve/i,
  /Cannot find module/i,
  /Cannot find name/i,
  /is not a module/i,
  /has no exported member/i,
  /Object literal may only specify known properties/i,
  /Syntax Error/i,
  /Unexpected token/i,
  /Expected '\}'/i,
  /Expected '\)'/i,
  /Property .* does not exist on type/i,
  /Type .* is not assignable to type/i,
  /Argument of type .* is not assignable/i,
  /is not assignable to parameter/i,
  /implicitly has an 'any' type/i,
  /is not defined/i,
  /does not exist on type/i,
];

function classifyError(errorText: string): Confidence {
  for (const p of HIGH_CONFIDENCE_PATTERNS) {
    if (p.test(errorText)) return "HIGH";
  }
  if (/error/i.test(errorText) && errorText.length < 300) return "MEDIUM";
  return "LOW";
}

/* ─── Vercel API helpers ───────────────────────────────────────────────── */
interface VercelDeployment {
  uid:       string;
  state:     string;
  url:       string;
  createdAt: number;
  meta?:     { githubCommitSha?: string; githubCommitMessage?: string };
}

async function getLatestDeployment(token: string, projectId: string): Promise<VercelDeployment | null> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5&target=production`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { deployments: VercelDeployment[] };
    return data.deployments?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getBuildLogs(token: string, deploymentId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v2/deployments/${deploymentId}/events?builds=1&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return "";
    const text = await res.text();

    /* Each line is a JSON event — extract "text" fields */
    const lines = text.split("\n").filter(Boolean);
    const logLines: string[] = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as { type?: string; payload?: { text?: string } };
        if (event.payload?.text) logLines.push(event.payload.text);
      } catch { /* skip */ }
    }
    return logLines.join("\n").slice(0, 8000); /* cap at 8KB */
  } catch {
    return "";
  }
}

/* ─── Parse error from build log ──────────────────────────────────────── */
interface ParsedError {
  filePath:    string;
  errorType:   string;
  errorDetail: string;
  fullSnippet: string;
}

function parseError(log: string): ParsedError | null {
  /* Look for patterns like:
     ./app/api/something/route.ts
     Module not found: Can't resolve '@anthropic-ai/sdk'
  */
  const fileMatch = log.match(/\.\/(app|pages|components|lib|utils)[^\s'"]+\.(ts|tsx|js|jsx)/);
  const filePath  = fileMatch?.[0]?.replace(/^\.\//, "") ?? "";

  /* Find the error block */
  const errorMatch = log.match(
    /(Module not found|Cannot find|Syntax Error|Type error|Error|Failed)[^\n]{0,300}/i
  );
  const errorDetail = errorMatch?.[0] ?? "";

  const errorTypeMatch = errorDetail.match(/^(Module not found|Cannot find \w+|Syntax Error|Type error|Error)/i);
  const errorType      = errorTypeMatch?.[0] ?? "Build Error";

  /* Grab a 20-line window around the error */
  const lines       = log.split("\n");
  const errorLineIdx = lines.findIndex(l => /error|Error|ERROR/.test(l) && l.length > 10);
  const start       = Math.max(0, errorLineIdx - 5);
  const end         = Math.min(lines.length, errorLineIdx + 15);
  const fullSnippet = lines.slice(start, end).join("\n");

  if (!errorDetail) return null;
  return { filePath, errorType, errorDetail, fullSnippet };
}

/* ─── GitHub API helpers ───────────────────────────────────────────────── */
interface GitHubFile {
  content:  string;   /* base64 */
  sha:      string;
  encoding: string;
}

async function getGitHubFile(
  token: string, owner: string, repo: string, path: string
): Promise<GitHubFile | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return null;
    return await res.json() as GitHubFile;
  } catch {
    return null;
  }
}

async function pushGitHubFix(
  token:   string,
  owner:   string,
  repo:    string,
  path:    string,
  sha:     string,
  content: string, /* raw text */
  message: string,
): Promise<boolean> {
  try {
    const encoded = Buffer.from(content, "utf-8").toString("base64");
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method:  "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:        "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, content: encoded, sha }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ─── Ask Claude to fix the broken file ───────────────────────────────── */
async function generateFix(
  anthropicKey: string,
  filePath:     string,
  fileContent:  string,
  errorSnippet: string,
): Promise<{ fixedContent: string; explanation: string } | null> {
  try {
    const prompt = `You are a Next.js TypeScript expert fixing a Vercel build error.

PROJECT CONTEXT:
- Next.js 14 App Router, TypeScript
- Anthropic API is called via raw fetch() — the @anthropic-ai/sdk package is NOT installed
- Resend is installed for email (import { Resend } from "resend")
- Stripe is installed (import Stripe from "stripe")
- @vercel/blob is available (import { put, list } from "@vercel/blob")
- All API routes export: export const runtime = "nodejs"; export async function GET/POST(req: NextRequest)

BUILD ERROR:
${errorSnippet}

BROKEN FILE (${filePath}):
\`\`\`typescript
${fileContent.slice(0, 6000)}
\`\`\`

Return ONLY a JSON object with exactly these fields:
{
  "fixedContent": "the complete corrected file content as a string",
  "explanation": "one sentence explaining what was wrong and what you fixed"
}

Rules:
- Return the ENTIRE file content in fixedContent, not just the changed lines
- Only fix what the error is about — do not refactor or change anything else
- If you cannot confidently fix it, return { "fixedContent": "", "explanation": "needs manual review" }`;

    const models = [
      "claude-haiku-4-5", "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307",
    ];
    let res: Response | null = null;
    for (const model of models) {
      const attempt = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
      });
      if (attempt.status !== 404) { res = attempt; break; }
    }
    if (!res) return null;
    if (!res.ok) return null;
    const data      = await res.json() as { content: Array<{ type: string; text: string }> };
    const raw       = data.content[0]?.text?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as { fixedContent: string; explanation: string };
    if (!parsed.fixedContent || parsed.explanation === "needs manual review") return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ─── Blob: track processed deployments ───────────────────────────────── */
async function loadProcessedIds(): Promise<Set<string>> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-watchdog/" });
    const file = blobs.find(b => b.pathname === "ellie-watchdog/processed.json");
    if (!file) return new Set();
    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return new Set();
    const ids = await r.json() as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function markProcessed(id: string): Promise<void> {
  try {
    const existing = await loadProcessedIds();
    existing.add(id);
    /* Keep only last 50 to prevent unbounded growth */
    const arr = [...existing].slice(-50);
    const { put } = await import("@vercel/blob");
    await put("ellie-watchdog/processed.json", JSON.stringify(arr), {
      access: "public", contentType: "application/json", addRandomSuffix: false,
    });
  } catch { /* non-fatal */ }
}

/* ─── Email helpers ────────────────────────────────────────────────────── */
function buildAutoFixEmail(
  deployment: VercelDeployment,
  error:      ParsedError,
  fix:        { fixedContent: string; explanation: string },
): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,#2d6a27,#C4956A,#2d6a27);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:24px 32px;">
    <p style="margin:0 0 4px;color:#2d6a27;font-size:10px;letter-spacing:0.32em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Deploy Watchdog · AUTO-FIXED ✓
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      Build error detected and fixed automatically
    </h2>
    <p style="margin:6px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      A new deployment was triggered. Check Vercel — it should go green.
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">What broke</p>
    <p style="margin:0 0 16px;background:#FDF0ED;padding:10px 14px;font-family:monospace;
               font-size:12px;color:#c0392b;line-height:1.5;">${error.errorDetail}</p>
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">File</p>
    <p style="margin:0 0 16px;font-family:monospace;font-size:12px;color:#2C2C2C;">
      ${error.filePath}
    </p>
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Fix applied</p>
    <p style="margin:0 0 20px;background:#EDF7ED;padding:10px 14px;font-family:Arial,sans-serif;
               font-size:13px;color:#2d6a27;line-height:1.6;">${fix.explanation}</p>
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Deployment: ${deployment.uid} · No action needed from you.
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px 28px;"></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildManualReviewEmail(
  deployment: VercelDeployment,
  error:      ParsedError,
  buildLog:   string,
): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,#c0392b,#C4956A,#c0392b);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:24px 32px;">
    <p style="margin:0 0 4px;color:#c0392b;font-size:10px;letter-spacing:0.32em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Deploy Watchdog · NEEDS ATTENTION
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      Build failed — paste the section below to Claude
    </h2>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">Error</p>
    <p style="margin:0 0 16px;background:#FDF0ED;padding:10px 14px;font-family:monospace;
               font-size:12px;color:#c0392b;line-height:1.5;">${error.errorDetail}</p>
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">File</p>
    <p style="margin:0 0 16px;font-family:monospace;font-size:12px;color:#2C2C2C;">
      ${error.filePath || "See log below"}
    </p>

    <!-- Pre-written message to paste to Claude -->
    <p style="margin:0 0 6px;color:#C4956A;font-size:9px;letter-spacing:0.2em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      ↓ Copy everything in this box and paste it to Claude ↓
    </p>
    <div style="background:#2C2C2C;padding:16px;font-family:monospace;font-size:11px;
                color:#FDFAF5;line-height:1.6;white-space:pre-wrap;">Vercel build failed. Please fix.

File: ${error.filePath}
Error: ${error.errorDetail}

Full log snippet:
${error.fullSnippet}</div>
  </td></tr>
  <tr><td style="padding:20px 32px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Deployment ID: ${deployment.uid} · Detected by Deployment Watchdog
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ─── Vercel: trigger a new deployment via API ─────────────────────────── */
async function triggerRedeploy(token: string, projectId: string, teamId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v13/deployments?teamId=${teamId}&forceNew=1`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectId }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ─── Vercel: fix project settings (root directory, etc.) ─────────────── */
async function fixVercelSettings(
  token: string, projectId: string, teamId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`,
      {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ─── Core logic (shared between GET cron and POST webhook) ───────────── */
async function runWatchdog(): Promise<{ action: string; deployment?: string }> {
  const vercelToken  = process.env.VERCEL_TOKEN?.trim();
  const projectId    = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId       = process.env.VERCEL_TEAM_ID?.trim() ?? "mitchell-alarmandcameras-projects";
  const githubToken  = process.env.GITHUB_TOKEN?.trim();
  const repoOwner    = process.env.GITHUB_REPO_OWNER?.trim() ?? "Mitchell-AlarmandCameras";
  /* Style Refresh deploys from the standalone ellie-landing repo (files at root, no prefix) */
  const repoName     = process.env.GITHUB_REPO_NAME?.trim()  ?? "ellie-landing";
  const siteRoot     = process.env.GITHUB_SITE_ROOT?.trim()  ?? "";  /* empty = files at repo root */
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const resendKey    = process.env.RESEND_API_KEY?.trim();
  const notifyEmail  = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail    = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (!vercelToken || !projectId) {
    return { action: "skipped — VERCEL_TOKEN or VERCEL_PROJECT_ID not set" };
  }

  /* ── Get latest deployment ─────────────────────────────────────── */
  const deployment = await getLatestDeployment(vercelToken, projectId);
  if (!deployment) return { action: "no deployments found" };
  if (deployment.state !== "ERROR") return { action: `deployment ${deployment.uid} is ${deployment.state} — no action needed` };

  /* ── Check if already processed ───────────────────────────────── */
  const processedIds = await loadProcessedIds();
  if (processedIds.has(deployment.uid)) {
    return { action: `deployment ${deployment.uid} already processed` };
  }

  console.log(`[watchdog] Failed deployment detected: ${deployment.uid}`);

  /* ── Fetch build logs ──────────────────────────────────────────── */
  const buildLog = await getBuildLogs(vercelToken, deployment.uid);

  /* ── Handle Vercel config errors (not code errors) ─────────────── */

  /* Root directory missing — clear it via API and redeploy */
  if (/Root Directory.*does not exist/i.test(buildLog) || /specified Root Directory/i.test(buildLog)) {
    console.log("[watchdog] Root directory error — clearing via Vercel API");
    const fixed = await fixVercelSettings(vercelToken, projectId, teamId, { rootDirectory: null });
    await markProcessed(deployment.uid);
    if (fixed) {
      await triggerRedeploy(vercelToken, projectId, teamId);
      if (resendKey && notifyEmail) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: `Ellie Watchdog <${fromEmail}>`, to: notifyEmail,
          subject: "✅ Build error auto-fixed — Root Directory cleared",
          html: buildAutoFixEmail(deployment,
            { filePath: "vercel.json", errorType: "Config Error", errorDetail: "Root Directory setting pointed to non-existent subfolder", fullSnippet: "" },
            { fixedContent: "", explanation: "Cleared the Root Directory setting via Vercel API so the project deploys from the repo root. Redeployment triggered." }),
        }).catch(() => {});
      }
      return { action: "auto-fixed root directory + redeployed", deployment: deployment.uid };
    }
  }

  /* Cron expression invalid — fix vercel.json in GitHub */
  if (/cron_jobs_invalid_expression/i.test(buildLog) || /Expected 5 values, but got 6/i.test(buildLog)) {
    console.log("[watchdog] Cron expression error — fixing vercel.json");
    if (githubToken) {
      const vercelJsonPath = siteRoot ? `${siteRoot}/vercel.json` : "vercel.json";
      const fileData = await getGitHubFile(githubToken, repoOwner, repoName, vercelJsonPath);
      if (fileData) {
        const raw     = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");
        /* Fix any cron schedule with double spaces */
        const fixed   = raw.replace(/"schedule":\s*"([^"]+)"/g, (_, sched) => `"schedule": "${sched.replace(/\s+/g, " ")}"`);
        if (fixed !== raw) {
          const pushed = await pushGitHubFix(githubToken, repoOwner, repoName, vercelJsonPath, fileData.sha, fixed, "fix(watchdog): normalize cron expression whitespace in vercel.json");
          await markProcessed(deployment.uid);
          if (pushed && resendKey && notifyEmail) {
            const resend = new Resend(resendKey);
            await resend.emails.send({
              from: `Ellie Watchdog <${fromEmail}>`, to: notifyEmail,
              subject: "✅ Build error auto-fixed — cron expression whitespace normalized",
              html: buildAutoFixEmail(deployment,
                { filePath: "vercel.json", errorType: "Cron Config Error", errorDetail: "Cron expression had extra whitespace causing 6-value parse failure", fullSnippet: "" },
                { fixedContent: "", explanation: "Removed extra whitespace from cron schedule expressions in vercel.json. New deployment triggered automatically by GitHub push." }),
            }).catch(() => {});
          }
          return { action: "auto-fixed cron expression in vercel.json", deployment: deployment.uid };
        }
      }
    }
  }

  /* No Next.js version / wrong root dir type error */
  if (/No Next\.js version detected/i.test(buildLog) || /Could not identify Next\.js version/i.test(buildLog)) {
    console.log("[watchdog] Next.js version not found — likely root directory mismatch, clearing");
    const fixed = await fixVercelSettings(vercelToken, projectId, teamId, { rootDirectory: null });
    await markProcessed(deployment.uid);
    if (fixed) {
      await triggerRedeploy(vercelToken, projectId, teamId);
      return { action: "auto-fixed root directory for Next.js version error + redeployed", deployment: deployment.uid };
    }
  }

  /* ── Parse code error ──────────────────────────────────────────── */
  const parsedErr = parseError(buildLog);

  if (!parsedErr) {
    await markProcessed(deployment.uid);
    console.log("[watchdog] Could not parse error — sending manual review email");
    if (resendKey && notifyEmail) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    `Ellie Watchdog <${fromEmail}>`,
        to:      notifyEmail,
        subject: `🔴 Build failed — check Vercel (${deployment.uid.slice(0, 8)})`,
        html:    buildManualReviewEmail(deployment, { filePath: "", errorType: "Unknown", errorDetail: buildLog.slice(0, 500), fullSnippet: buildLog.slice(0, 1000) }, buildLog),
      }).catch(() => {});
    }
    return { action: "error parsed failed — manual review email sent", deployment: deployment.uid };
  }

  const confidence = classifyError(parsedErr.errorDetail);
  console.log(`[watchdog] Error classified as ${confidence}: ${parsedErr.errorType} in ${parsedErr.filePath}`);

  /* ── Attempt auto-fix for HIGH confidence errors ──────────────── */
  if (confidence === "HIGH" && githubToken && anthropicKey && parsedErr.filePath) {
    /* siteRoot is "" for style refresh (standalone repo, files at root) */
    const ghPath   = siteRoot ? `${siteRoot}/${parsedErr.filePath}` : parsedErr.filePath;
    const fileData = await getGitHubFile(githubToken, repoOwner, repoName, ghPath);

    if (fileData) {
      const rawContent = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");
      const fix        = await generateFix(anthropicKey, parsedErr.filePath, rawContent, parsedErr.fullSnippet);

      if (fix) {
        const commitMsg = `fix(watchdog): auto-fix ${parsedErr.errorType} in ${parsedErr.filePath.split("/").pop()}`;
        const pushed    = await pushGitHubFix(githubToken, repoOwner, repoName, ghPath, fileData.sha, fix.fixedContent, commitMsg);

        if (pushed) {
          console.log(`[watchdog] Auto-fix pushed for ${parsedErr.filePath}`);
          await markProcessed(deployment.uid);

          if (resendKey && notifyEmail) {
            const resend = new Resend(resendKey);
            await resend.emails.send({
              from:    `Ellie Watchdog <${fromEmail}>`,
              to:      notifyEmail,
              subject: `✅ Build error auto-fixed — ${parsedErr.errorType} (${parsedErr.filePath.split("/").pop()})`,
              html:    buildAutoFixEmail(deployment, parsedErr, fix),
            }).catch(() => {});
          }
          return { action: "auto-fixed and pushed", deployment: deployment.uid };
        }
      }
    }
  }

  /* ── Fall back to manual review email ─────────────────────────── */
  await markProcessed(deployment.uid);
  if (resendKey && notifyEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie Watchdog <${fromEmail}>`,
      to:      notifyEmail,
      subject: `🔴 Build failed — ${parsedErr.errorType} · paste to Claude to fix`,
      html:    buildManualReviewEmail(deployment, parsedErr, buildLog),
    }).catch(() => {});
  }

  return { action: `manual review email sent (confidence: ${confidence})`, deployment: deployment.uid };
}

/* ─── GET — hourly cron ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await runWatchdog();
  console.log("[watchdog] Cron run:", result.action);
  return NextResponse.json({ ok: true, ...result });
}

/* ─── POST — Vercel deploy webhook (instant notification) ─────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { type?: string; payload?: { deployment?: { state?: string } } };
    /* Only act on deployment error events */
    if (body.type !== "deployment" && body.payload?.deployment?.state !== "ERROR") {
      return NextResponse.json({ ok: true, skipped: "not a deployment error event" });
    }
  } catch { /* body parse failed — run anyway */ }

  const result = await runWatchdog();
  console.log("[watchdog] Webhook run:", result.action);
  return NextResponse.json({ ok: true, ...result });
}

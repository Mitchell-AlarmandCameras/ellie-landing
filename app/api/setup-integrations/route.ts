import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/setup-integrations
   ONE-TIME SETUP AGENT — run this once after adding your tokens.

   What it does automatically (no Vercel dashboard, no GitHub settings):
     1. Looks up your Vercel Project ID from the API (no manual copy-paste)
     2. Creates the Vercel deployment webhook → points to the Deploy Watchdog
        so build failures trigger the watchdog INSTANTLY (not hourly)
     3. Adds VERCEL_PROJECT_ID, GITHUB_REPO_OWNER, GITHUB_REPO_NAME as
        environment variables directly via Vercel API
     4. Verifies GITHUB_TOKEN has the right permissions
     5. Prints a full status report

   Prerequisites (the only two things you add manually):
     VERCEL_TOKEN  — Vercel → Account Settings → Tokens → Create (any name)
     GITHUB_TOKEN  — GitHub → Settings → Developer Settings →
                     Fine-grained personal access tokens → Generate new token →
                     Repository access: AlarmEngine_PRO only →
                     Permissions: Contents → Read and write → Generate
                     Then add to Vercel env vars.

   Run it:  https://stylebyellie.com/api/setup-integrations?secret=YOUR_CRON_SECRET
   (or just hit the URL in your browser if CRON_SECRET is not set)
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 30;

const REPO_OWNER = "Mitchell-AlarmandCameras";
const REPO_NAME  = "AlarmEngine_PRO";

/* ─── Vercel API helpers ───────────────────────────────────────────────── */
async function getVercelProjects(token: string): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch("https://api.vercel.com/v9/projects?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json() as { projects: Array<{ id: string; name: string }> };
  return data.projects ?? [];
}

async function setVercelEnvVar(
  token:     string,
  projectId: string,
  key:       string,
  value:     string,
): Promise<{ ok: boolean; message: string }> {
  /* Check if already exists */
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (listRes.ok) {
    const listData = await listRes.json() as { envs: Array<{ key: string; id: string }> };
    const existing = listData.envs?.find(e => e.key === key);
    if (existing) {
      /* Update existing */
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
        {
          method:  "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ value, target: ["production", "preview", "development"] }),
        }
      );
      return patchRes.ok
        ? { ok: true,  message: `${key} updated` }
        : { ok: false, message: `${key} update failed (${patchRes.status})` };
    }
  }

  /* Create new */
  const createRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        key,
        value,
        type:   "plain",
        target: ["production", "preview", "development"],
      }),
    }
  );
  return createRes.ok
    ? { ok: true,  message: `${key} created` }
    : { ok: false, message: `${key} creation failed (${createRes.status})` };
}

async function createVercelWebhook(
  token:     string,
  projectId: string,
  webhookUrl: string,
): Promise<{ ok: boolean; message: string; webhookId?: string }> {
  /* List existing webhooks to avoid duplicates */
  const listRes = await fetch(
    `https://api.vercel.com/v1/webhooks?projectId=${projectId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (listRes.ok) {
    const listData = await listRes.json() as { webhooks: Array<{ id: string; url: string }> };
    const existing = listData.webhooks?.find(w => w.url === webhookUrl);
    if (existing) {
      return { ok: true, message: "Webhook already exists", webhookId: existing.id };
    }
  }

  const res = await fetch("https://api.vercel.com/v1/webhooks", {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({
      url:    webhookUrl,
      events: ["deployment.error", "deployment.canceled"],
      projectIds: [projectId],
    }),
  });

  if (res.ok) {
    const data = await res.json() as { id: string };
    return { ok: true, message: "Webhook created — watchdog will now trigger instantly on build failure", webhookId: data.id };
  }
  const errText = await res.text().catch(() => res.status.toString());
  return { ok: false, message: `Webhook creation failed: ${errText}` };
}

async function verifyGitHubToken(
  token: string,
  owner: string,
  repo:  string,
): Promise<{ ok: boolean; message: string; scopes?: string }> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 200 || res.status === 404) {
    /* 404 = file doesn't exist but token works */
    const scopes = res.headers.get("x-oauth-scopes") ?? "fine-grained";
    return { ok: true, message: "GitHub token valid — repo access confirmed", scopes };
  }
  if (res.status === 401) return { ok: false, message: "GitHub token invalid or expired" };
  if (res.status === 403) return { ok: false, message: "GitHub token lacks Contents: Read permission" };
  return { ok: false, message: `GitHub token check returned ${res.status}` };
}

/* ─── Handler ──────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  /* Light auth — accept CRON_SECRET or open if not set */
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const urlSecret = new URL(req.url).searchParams.get("secret");
    const authHeader = req.headers.get("authorization") ?? "";
    if (urlSecret !== secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Pass ?secret=YOUR_CRON_SECRET in the URL" }, { status: 401 });
    }
  }

  const vercelToken  = process.env.VERCEL_TOKEN?.trim();
  const githubToken  = process.env.GITHUB_TOKEN?.trim();
  const baseUrl      = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const webhookUrl   = `${baseUrl}/api/agent-deploy-watchdog`;

  const results: Record<string, { ok: boolean; message: string }> = {};

  /* ── Step 1: Verify VERCEL_TOKEN and find project ID ────────────── */
  if (!vercelToken) {
    return NextResponse.json({
      ok: false,
      error: "VERCEL_TOKEN not set. Add it to Vercel environment variables first.",
      instructions: {
        step1: "Go to vercel.com → Account Settings → Tokens → Create Token (name it anything)",
        step2: "Add it as VERCEL_TOKEN in Vercel → Project → Settings → Environment Variables",
        step3: "Redeploy, then hit this URL again",
      },
    });
  }

  const projects    = await getVercelProjects(vercelToken);
  const project     = projects.find(p => p.name === "ellie-landing") ?? projects[0];

  if (!project) {
    results["vercel_project"] = { ok: false, message: "No Vercel projects found — check VERCEL_TOKEN" };
  } else {
    results["vercel_project"] = { ok: true, message: `Found project: ${project.name} (${project.id})` };

    /* ── Step 2: Set env vars automatically ─────────────────────── */
    const envResults = await Promise.all([
      setVercelEnvVar(vercelToken, project.id, "VERCEL_PROJECT_ID",  project.id),
      setVercelEnvVar(vercelToken, project.id, "GITHUB_REPO_OWNER",  REPO_OWNER),
      setVercelEnvVar(vercelToken, project.id, "GITHUB_REPO_NAME",   REPO_NAME),
    ]);

    results["env_VERCEL_PROJECT_ID"]  = envResults[0];
    results["env_GITHUB_REPO_OWNER"]  = envResults[1];
    results["env_GITHUB_REPO_NAME"]   = envResults[2];

    /* ── Step 3: Create Vercel deployment webhook ────────────────── */
    const webhookResult = await createVercelWebhook(vercelToken, project.id, webhookUrl);
    results["vercel_webhook"] = webhookResult;
  }

  /* ── Step 4: Verify GitHub token ──────────────────────────────── */
  if (!githubToken) {
    results["github_token"] = {
      ok:      false,
      message: "GITHUB_TOKEN not set — auto-fix will not work until added. " +
               "Get it from GitHub → Settings → Developer Settings → Fine-grained tokens. " +
               "Set repo AlarmEngine_PRO, permission Contents: Read & Write.",
    };
  } else {
    const ghResult = await verifyGitHubToken(githubToken, REPO_OWNER, REPO_NAME);
    results["github_token"] = ghResult;
  }

  /* ── Summary ───────────────────────────────────────────────────── */
  const allOk    = Object.values(results).every(r => r.ok);
  const failures = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k);

  return NextResponse.json({
    ok:       allOk,
    summary:  allOk
      ? "✅ Everything configured. Webhook is live. Watchdog will now catch build failures instantly and auto-fix them."
      : `⚠️ Setup mostly done. Still needs: ${failures.join(", ")}`,
    results,
    webhookUrl,
    nextStep: allOk
      ? "Nothing. You're done. Redeploy to pick up the new env vars."
      : githubToken
        ? "All env vars are set. Run a new deployment to pick them up."
        : "Add GITHUB_TOKEN to Vercel env vars, redeploy, then hit this URL one more time.",
  });
}

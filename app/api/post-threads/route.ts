/**
 * POST-THREADS — The Style Refresh (Fashion)
 * ============================================
 * Cron: every Thursday at 11 AM ET (15:00 UTC)
 * Posts a fashion look teaser to Threads (Meta).
 *
 * Setup:
 *   1. Have an Instagram Business or Creator account
 *   2. Connect it to Threads
 *   3. Go to developers.facebook.com → create an app → add Threads API
 *   4. Generate a long-lived access token
 *
 * Required env vars:
 *   THREADS_USER_ID       numeric Threads user ID
 *   THREADS_ACCESS_TOKEN  long-lived access token
 *
 * Optional:
 *   BLOB_READ_WRITE_TOKEN  reads approved brief
 *   ANTHROPIC_API_KEY      generates platform copy
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 45;
export const dynamic     = "force-dynamic";

type LookItem = { piece: string; brand: string; price: string };
type Look     = { label: string; tagline: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[] };

const SITE      = "https://stylebyellie.com";
const USER_ID   = process.env.THREADS_USER_ID ?? "";
const TOKEN     = process.env.THREADS_ACCESS_TOKEN ?? "";
const THREADS   = "https://graph.threads.net/v1.0";

/* ── Create media container ───────────────────────────────────────── */
async function createContainer(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      media_type:   "TEXT",
      text,
      access_token: TOKEN,
    });
    const res = await fetch(`${THREADS}/${USER_ID}/threads?${params}`, { method: "POST" });
    if (!res.ok) { console.error("[threads] container failed", res.status, await res.text()); return null; }
    const d = await res.json() as { id?: string };
    return d.id ?? null;
  } catch (e) { console.error("[threads] container error", e); return null; }
}

/* ── Publish container ────────────────────────────────────────────── */
async function publishContainer(containerId: string): Promise<boolean> {
  /* Threads requires a brief pause between create + publish */
  await new Promise(r => setTimeout(r, 3000));
  try {
    const params = new URLSearchParams({
      creation_id:  containerId,
      access_token: TOKEN,
    });
    const res = await fetch(`${THREADS}/${USER_ID}/threads_publish?${params}`, { method: "POST" });
    return res.ok;
  } catch { return false; }
}

/* ── Load brief ───────────────────────────────────────────────────── */
async function loadBrief(): Promise<Brief | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!latest) return null;
    const r = await fetch(latest.url, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json() as Brief;
    return d?.looks ? d : null;
  } catch { return null; }
}

/* ── Claude generates Threads copy ───────────────────────────────── */
async function generatePost(brief: Brief): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const look = brief.looks[0];
    return `This week's look: "${look.tagline}"\n\n${look.editorsNote.slice(0, 150)}\n\nFull Monday brief → ${SITE}\n\n#fashion #style #ootd #styleinspo`;
  }
  const looksText = brief.looks.map(l => `"${l.tagline}" — ${l.editorsNote.slice(0, 80)}`).join("\n");
  const prompt = `Write a Threads post for a fashion curation account. Threads is casual, conversational — like Instagram captions but more text-forward.

This week's looks:
${looksText}
Mood: "${brief.editorialLead}"

Rules:
- Hook in first line (no "This week" opener — be more creative)
- 2-3 short paragraphs. Punchy. Real voice.
- End with the site URL: ${SITE}
- 5-8 relevant hashtags at the end: #fashion #style etc
- 400 chars max before hashtags
- Return only the post text, nothing else`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body:    JSON.stringify({
        model: "claude-haiku-4-5", max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await res.json() as { content: Array<{ text: string }> };
    return (j.content[0]?.text ?? "").trim();
  } catch { return `"${brief.looks[0]?.tagline}" — full sourced looks every Monday\n\n${SITE}\n\n#fashion #style #ootd`; }
}

/* ── Rate limit ───────────────────────────────────────────────────── */
async function alreadyPosted(): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "threads-fashion/last-post.json" });
    if (!blobs[0]) return false;
    const r = await fetch(blobs[0].url);
    if (!r.ok) return false;
    const { postedAt } = await r.json() as { postedAt: string };
    return (Date.now() - new Date(postedAt).getTime()) < 5 * 86_400_000;
  } catch { return false; }
}

async function markPosted() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put } = await import("@vercel/blob");
    await put("threads-fashion/last-post.json",
      JSON.stringify({ postedAt: new Date().toISOString() }),
      { access: "public", contentType: "application/json", addRandomSuffix: false }
    );
  } catch { /* non-fatal */ }
}

/* ── Handler ──────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!USER_ID || !TOKEN) {
    return NextResponse.json({ skipped: true, reason: "THREADS_USER_ID or THREADS_ACCESS_TOKEN not set" });
  }
  if (await alreadyPosted()) {
    return NextResponse.json({ skipped: true, reason: "Already posted this week" });
  }

  const brief = await loadBrief();
  if (!brief) return NextResponse.json({ skipped: true, reason: "No approved brief" });

  const text        = await generatePost(brief);
  const containerId = await createContainer(text);
  if (!containerId) return NextResponse.json({ error: "Container creation failed" }, { status: 500 });

  const ok = await publishContainer(containerId);
  if (ok) await markPosted();

  return NextResponse.json({ ok, weekOf: brief.weekOf, preview: text.slice(0, 80) });
}

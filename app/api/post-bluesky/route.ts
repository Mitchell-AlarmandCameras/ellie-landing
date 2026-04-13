/**
 * POST-BLUESKY — The Style Refresh (Fashion)
 * ============================================
 * Cron: every Wednesday at 2 PM ET (18:00 UTC)
 * Posts a fashion styling tip + look teaser to Bluesky.
 *
 * Bluesky uses the AT Protocol — no app review needed.
 * Create a free account at bsky.social, then generate an
 * App Password in Settings → Privacy and Security → App Passwords.
 *
 * Required env vars:
 *   BLUESKY_HANDLE        e.g. "elliestyler.bsky.social"
 *   BLUESKY_APP_PASSWORD  the app password (NOT your account password)
 *
 * Optional:
 *   BLOB_READ_WRITE_TOKEN  reads approved brief for post content
 *   ANTHROPIC_API_KEY      generates platform-optimised copy
 *   RESEND_API_KEY + RESEND_NOTIFY_EMAIL  email alert on failure
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 45;
export const dynamic     = "force-dynamic";

type LookItem = { piece: string; brand: string; price: string };
type Look     = { label: string; tagline: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[] };

const SITE    = "https://stylebyellie.com";
const HANDLE  = process.env.BLUESKY_HANDLE  ?? "";
const APP_PW  = process.env.BLUESKY_APP_PASSWORD ?? "";
const BSKY    = "https://bsky.social/xrpc";

/* ── Auth ─────────────────────────────────────────────────────────── */
async function bskyLogin(): Promise<{ did: string; token: string } | null> {
  if (!HANDLE || !APP_PW) return null;
  try {
    const res = await fetch(`${BSKY}/com.atproto.server.createSession`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ identifier: HANDLE, password: APP_PW }),
    });
    if (!res.ok) { console.error("[bluesky] login failed", res.status); return null; }
    const d = await res.json() as { did: string; accessJwt: string };
    return { did: d.did, token: d.accessJwt };
  } catch (e) { console.error("[bluesky] login error", e); return null; }
}

/* ── Post (record) ────────────────────────────────────────────────── */
async function bskyPost(token: string, did: string, text: string): Promise<boolean> {
  /* Bluesky: 300 char limit */
  const trimmed = text.length > 300 ? text.slice(0, 297) + "…" : text;
  try {
    const res = await fetch(`${BSKY}/com.atproto.repo.createRecord`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        repo:       did,
        collection: "app.bsky.feed.post",
        record: {
          $type:     "app.bsky.feed.post",
          text:      trimmed,
          createdAt: new Date().toISOString(),
        },
      }),
    });
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

/* ── Claude generates Bluesky copy ───────────────────────────────── */
async function generatePost(brief: Brief): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    /* Fallback: build simple post from brief data */
    const look = brief.looks[0];
    return `This week's style direction: "${look.tagline}" ✨\n\n${look.editorsNote.slice(0, 120)}\n\nFull sourced looks every Monday → ${SITE}`;
  }
  const looksText = brief.looks.map(l =>
    `• ${l.tagline} — ${l.editorsNote.slice(0, 80)}`
  ).join("\n");
  const prompt = `Write a Bluesky post (max 280 chars) for a fashion curation account.
This week's looks:
${looksText}
Mood: "${brief.editorialLead}"

Rules:
- Share ONE specific styling insight — something actionable, not just pretty words
- Sound like a knowledgeable person, not a brand
- End with: ${SITE}
- 280 chars max including the URL
- NO hashtags on Bluesky (they don't help there)
- Return only the post text, nothing else`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body:    JSON.stringify({
        model: "claude-haiku-4-5", max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await res.json() as { content: Array<{ text: string }> };
    return (j.content[0]?.text ?? "").trim();
  } catch { return `This week: "${brief.looks[0]?.tagline}" — full sourced looks at ${SITE}`; }
}

/* ── Rate limit ───────────────────────────────────────────────────── */
async function alreadyPosted(): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "bluesky-fashion/last-post.json" });
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
    await put("bluesky-fashion/last-post.json",
      JSON.stringify({ postedAt: new Date().toISOString() }),
      { access: "public", contentType: "application/json", addRandomSuffix: false }
    );
  } catch { /* non-fatal */ }
}

/* ── Handler ──────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const provided = req.headers.get("authorization")?.replace("Bearer ", "").trim()
    ?? new URL(req.url).searchParams.get("secret")?.trim()
    ?? "";
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!HANDLE || !APP_PW) {
    return NextResponse.json({ skipped: true, reason: "BLUESKY_HANDLE or BLUESKY_APP_PASSWORD not set" });
  }
  if (await alreadyPosted()) {
    return NextResponse.json({ skipped: true, reason: "Already posted this week" });
  }

  const brief = await loadBrief();
  if (!brief) return NextResponse.json({ skipped: true, reason: "No approved brief" });

  const auth = await bskyLogin();
  if (!auth) return NextResponse.json({ error: "Bluesky login failed" }, { status: 500 });

  const text = await generatePost(brief);
  const ok   = await bskyPost(auth.token, auth.did, text);

  if (ok) {
    await markPosted();
    console.log("[bluesky] ✅ posted:", text.slice(0, 60));
  }

  return NextResponse.json({ ok, text: text.slice(0, 100), weekOf: brief.weekOf });
}

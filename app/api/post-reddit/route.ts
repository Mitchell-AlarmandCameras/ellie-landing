import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/post-reddit
   Vercel Cron fires this every Tuesday at 10 AM ET (14:00 UTC).

   Reads this week's approved brief → asks Claude to write a genuinely
   helpful Reddit post (content-first, not promotional) → posts to
   r/femalefashionadvice and r/frugalfemalefashion.

   The post is 90% styling advice, 10% natural site mention.
   Rate-limited: skips if already posted within the last 5 days.

   Required env vars (all optional — route no-ops if not set):
     REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
     REDDIT_USERNAME, REDDIT_PASSWORD
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 45;

type LookItem = { piece: string; brand: string; price: string; note: string };
type Look     = { label: string; tagline: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[] };

/* ── Reddit OAuth (script app — username + password flow) ───────────── */
async function getRedditToken(): Promise<string | null> {
  const clientId     = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  const username     = process.env.REDDIT_USERNAME?.trim();
  const password     = process.env.REDDIT_PASSWORD?.trim();
  if (!clientId || !clientSecret || !username || !password) return null;

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res   = await fetch("https://www.reddit.com/api/v1/access_token", {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   `TheStyleRefresh/1.0 (by /u/${username})`,
      },
      body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });
    if (!res.ok) {
      console.error("[post-reddit] Token fetch failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.error("[post-reddit] Token error:", err);
    return null;
  }
}

/* ── Claude generates a helpful Reddit post from the week's brief ─── */
async function generateRedditPost(brief: Brief): Promise<{ title: string; body: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const looksText = brief.looks.map(look => `
${look.label}: "${look.tagline}"
Ellie's note: ${look.editorsNote}
Pieces: ${look.items.map(i => `${i.piece} (${i.brand}, ${i.price})`).join(", ")}`).join("\n");

  const prompt = `You are writing a Reddit post for r/femalefashionadvice on behalf of a fashion curator.

This week's curated looks:
${looksText}

Editorial mood: "${brief.editorialLead}"

Write a Reddit post that:
1. Leads with GENUINE STYLING ADVICE — not a product list. What's the principle behind these looks? What can readers apply today without buying anything?
2. Shares 2-3 specific, actionable styling tips derived from this week's looks (e.g. "the reason the ivory blazer over wide-legs works is tonal dressing — same temperature colors, different weights")
3. Lists the key pieces as examples, with prices, so it reads like useful context not an ad
4. Ends with ONE natural sentence: "I put these together as part of this week's Style Refresh brief — if you want the full sourced looks every Monday, stylebyellie.com runs a $19/month curation subscription."
5. Tone: knowledgeable friend, not a brand. Direct, warm, no fluff.

The post must pass the "would a real fashion person write this?" test. If it sounds like marketing copy, rewrite it.

Return ONLY valid JSON:
{
  "title": "post title (no quotes, no all-caps, 60-80 chars, starts with the styling insight not a promo hook)",
  "body": "full post body in plain text with paragraph breaks as \\n\\n"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5",
        max_tokens: 900,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}`);
    const json = await res.json() as { content: Array<{ text: string }> };
    let raw = (json.content[0]?.text ?? "").trim();
    if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n").replace(/`{3}\s*$/, "").trim();
    return JSON.parse(raw) as { title: string; body: string };
  } catch (err) {
    console.error("[post-reddit] Claude post generation failed:", err);
    return null;
  }
}

/* ── Post to a subreddit ─────────────────────────────────────────────── */
async function postToSubreddit(
  token:     string,
  subreddit: string,
  title:     string,
  body:      string,
  username:  string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://oauth.reddit.com/api/submit", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   `TheStyleRefresh/1.0 (by /u/${username})`,
      },
      body: new URLSearchParams({
        sr:       subreddit,
        kind:     "self",
        title:    title.substring(0, 300),
        text:     body,
        resubmit: "false",
        nsfw:     "false",
        spoiler:  "false",
      }).toString(),
    });

    const data = await res.json() as { success?: boolean; jquery?: Array<Array<unknown>> };

    /* Reddit returns success in a weird nested structure */
    const errMsg = (data.jquery ?? [])
      .flat()
      .find((v): v is string => typeof v === "string" && v.includes("error"));

    if (errMsg) return { ok: false, error: errMsg };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* ── Rate limit check — skip if posted within last 5 days ───────────── */
async function alreadyPostedThisWeek(): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "reddit/last-post.json" });
    if (!blobs[0]) return false;
    const r = await fetch(blobs[0].url);
    if (!r.ok) return false;
    const { postedAt } = await r.json() as { postedAt: string };
    const daysSince = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 5;
  } catch {
    return false;
  }
}

async function markPosted(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put } = await import("@vercel/blob");
    await put("reddit/last-post.json",
      JSON.stringify({ postedAt: new Date().toISOString() }),
      { access: "public", contentType: "application/json", addRandomSuffix: false }
    );
  } catch { /* non-fatal */ }
}

/* ── Load current approved brief from Blob ───────────────────────────── */
async function loadCurrentBrief(): Promise<Brief | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!latest) return null;
    const r = await fetch(latest.url);
    if (!r.ok) return null;
    const data = await r.json() as Brief;
    return data?.looks ? data : null;
  } catch {
    return null;
  }
}

/* ── Handler ─────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  /* Skip if Reddit credentials not configured */
  if (!process.env.REDDIT_CLIENT_ID) {
    return NextResponse.json({ skipped: true, reason: "Reddit credentials not configured" });
  }

  /* Rate limit — skip if already posted this week */
  if (await alreadyPostedThisWeek()) {
    console.log("[post-reddit] Already posted within 5 days — skipping");
    return NextResponse.json({ skipped: true, reason: "Already posted this week" });
  }

  /* Load this week's brief */
  const brief = await loadCurrentBrief();
  if (!brief) {
    console.log("[post-reddit] No approved brief found — skipping");
    return NextResponse.json({ skipped: true, reason: "No approved brief available" });
  }

  /* Get Reddit token */
  const token = await getRedditToken();
  if (!token) {
    return NextResponse.json({ error: "Reddit authentication failed" }, { status: 500 });
  }

  /* Generate post content */
  const post = await generateRedditPost(brief);
  if (!post) {
    return NextResponse.json({ error: "Post generation failed" }, { status: 500 });
  }

  console.log(`[post-reddit] Posting: "${post.title}"`);

  /* Post to subreddits */
  const username   = process.env.REDDIT_USERNAME ?? "";
  const subreddits = ["femalefashionadvice", "frugalfemalefashion"];
  const results: Record<string, { ok: boolean; error?: string }> = {};

  for (const sub of subreddits) {
    const result = await postToSubreddit(token, sub, post.title, post.body, username);
    results[sub] = result;
    console.log(`[post-reddit] r/${sub}:`, result.ok ? "✅ posted" : `❌ ${result.error}`);
    /* Brief pause between posts */
    await new Promise(r => setTimeout(r, 2000));
  }

  const anySuccess = Object.values(results).some(r => r.ok);
  if (anySuccess) await markPosted();

  return NextResponse.json({
    ok:      anySuccess,
    weekOf:  brief.weekOf,
    title:   post.title,
    results,
  });
}

import { NextRequest, NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/post-reddit
   Vercel Cron fires this every Tuesday at 10 AM ET (14:00 UTC).

   Strategy (v2 — fixes repeat auto-mod rejections):
   ─────────────────────────────────────────────────
   Large subreddits like r/femalefashionadvice auto-remove standalone posts
   that look like PSAs, announcements, or general sharing. The solution:

   1. FIND the subreddit's current weekly discussion/megathread
   2. POST A COMMENT on that thread — not a new standalone post
   3. Fall back to posting in smaller, permissive subreddits if no thread found

   Comments on megathreads are NEVER auto-removed and are exactly how
   community members naturally participate.

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

/* ── Find the active weekly megathread in a subreddit ───────────────
   Searches "hot" posts for titles containing common megathread keywords.
   Returns the post fullname (t3_xxxx) to comment on, or null if not found. */
async function findMegathread(
  token: string,
  subreddit: string,
  username: string,
): Promise<string | null> {
  const THREAD_KEYWORDS = [
    "general discussion", "random fashion", "weekly discussion",
    "what are you wearing", "purchase", "bought", "haul",
    "monday", "tuesday", "wednesday", "megathread", "daily thread",
    "weekly thread", "chat thread",
  ];
  try {
    const res = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/hot?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent":  `TheStyleRefresh/1.0 (by /u/${username})`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      data: { children: Array<{ data: { title: string; name: string; is_self: boolean } }> }
    };
    const posts = data.data?.children ?? [];
    for (const post of posts) {
      const title = post.data.title.toLowerCase();
      if (THREAD_KEYWORDS.some(kw => title.includes(kw))) {
        return post.data.name; // e.g. "t3_abc123"
      }
    }
    return null;
  } catch {
    return null;
  }
}

/* ── Post a comment on an existing thread ───────────────────────────── */
async function postComment(
  token:    string,
  thingId:  string,
  body:     string,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://oauth.reddit.com/api/comment", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   `TheStyleRefresh/1.0 (by /u/${username})`,
      },
      body: new URLSearchParams({
        thing_id: thingId,
        text:     body,
      }).toString(),
    });
    const data = await res.json() as { success?: boolean; jquery?: Array<Array<unknown>> };
    const errMsg = (data.jquery ?? [])
      .flat()
      .find((v): v is string => typeof v === "string" && v.includes("error"));
    if (errMsg) return { ok: false, error: errMsg };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* ── Claude generates content for TWO formats ───────────────────────
   1. megathread_comment — for posting inside a weekly discussion thread
   2. standalone_post    — for smaller permissive subreddits only        */
async function generateRedditContent(brief: Brief): Promise<{
  megathread_comment: string;
  standalone_title:   string;
  standalone_body:    string;
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const looksText = brief.looks.map(look =>
    `${look.label}: "${look.tagline}" — ${look.editorsNote} ` +
    `(key pieces: ${look.items.slice(0, 2).map(i => `${i.piece} by ${i.brand}, ${i.price}`).join("; ")})`
  ).join("\n");

  const prompt = `You are a real person who curates fashion looks as a hobby. You are writing for Reddit.

This week you put together these looks:
${looksText}

Mood: "${brief.editorialLead}"

Write TWO pieces of Reddit content:

────────────────────────────────────────────────
FORMAT 1: megathread_comment
────────────────────────────────────────────────
This is a comment you'll drop into a weekly discussion thread like "General Discussion" or "What are you wearing this week?" or "Random Fashion Thoughts."

Rules:
- 3-5 sentences max. Short. Conversational. Like you're chatting with friends.
- Share ONE specific styling insight from this week's looks — something useful, not generic
- Mention one or two pieces naturally as examples with prices
- End with: "Been sharing these as part of stylebyellie.com if anyone wants the full sourced list every Monday."
- Sound like a person, not a brand. First-person casual. No bullet points.
- DO NOT start with "I" — start with the insight or the context.

────────────────────────────────────────────────
FORMAT 2: standalone_post (for permissive subs like r/fashionadvice or r/capsulewardrobe)
────────────────────────────────────────────────
Rules:
- Title: a genuine QUESTION that invites discussion. Not a PSA. Not an announcement.
  Examples: "Anyone else leaning into tonal dressing this season?" or
  "What's the actual difference between a quality blazer and a fast-fashion one — here's what I found"
- Body: share your styling insight + the pieces as examples, then ask the community something real
- End naturally with the stylebyellie.com mention as an aside, not a CTA
- 150-250 words. Conversational. No marketing language.

Return ONLY valid JSON — no markdown, no explanation:
{
  "megathread_comment": "the comment text",
  "standalone_title": "the post title",
  "standalone_body": "the post body with \\n\\n paragraph breaks"
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
        max_tokens: 1000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}`);
    const json = await res.json() as { content: Array<{ text: string }> };
    let raw = (json.content[0]?.text ?? "").trim();
    if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n").replace(/`{3}\s*$/, "").trim();
    return JSON.parse(raw) as {
      megathread_comment: string;
      standalone_title:   string;
      standalone_body:    string;
    };
  } catch (err) {
    console.error("[post-reddit] Claude content generation failed:", err);
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

  if (!process.env.REDDIT_CLIENT_ID) {
    return NextResponse.json({ skipped: true, reason: "Reddit credentials not configured" });
  }

  if (await alreadyPostedThisWeek()) {
    return NextResponse.json({ skipped: true, reason: "Already posted this week" });
  }

  const brief = await loadCurrentBrief();
  if (!brief) {
    return NextResponse.json({ skipped: true, reason: "No approved brief available" });
  }

  const token = await getRedditToken();
  if (!token) {
    return NextResponse.json({ error: "Reddit authentication failed" }, { status: 500 });
  }

  const content = await generateRedditContent(brief);
  if (!content) {
    return NextResponse.json({ error: "Content generation failed" }, { status: 500 });
  }

  const username = process.env.REDDIT_USERNAME ?? "";
  const results: Record<string, { ok: boolean; method: string; error?: string }> = {};

  /* ── Strategy 1: Comment on megathreads in the big moderated subs ── */
  const megathreadSubs = ["femalefashionadvice", "frugalfemalefashion"];
  for (const sub of megathreadSubs) {
    const threadId = await findMegathread(token, sub, username);
    if (threadId) {
      const result = await postComment(token, threadId, content.megathread_comment, username);
      results[`r/${sub} (megathread comment)`] = { ...result, method: "comment" };
      console.log(`[post-reddit] r/${sub} megathread:`, result.ok ? "✅ commented" : `❌ ${result.error}`);
    } else {
      results[`r/${sub}`] = { ok: false, method: "skipped", error: "No megathread found this week" };
      console.log(`[post-reddit] r/${sub}: no megathread found — skipping`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  /* ── Strategy 2: Standalone post in permissive smaller subs ──────── */
  const standaloneSubs = ["fashionadvice", "capsulewardrobe"];
  for (const sub of standaloneSubs) {
    const result = await postToSubreddit(token, sub, content.standalone_title, content.standalone_body, username);
    results[`r/${sub} (new post)`] = { ...result, method: "post" };
    console.log(`[post-reddit] r/${sub} new post:`, result.ok ? "✅ posted" : `❌ ${result.error}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  const anySuccess = Object.values(results).some(r => r.ok);
  if (anySuccess) await markPosted();

  return NextResponse.json({
    ok:      anySuccess,
    weekOf:  brief.weekOf,
    title:   content.standalone_title,
    results,
  });
}

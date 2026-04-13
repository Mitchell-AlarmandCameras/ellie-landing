/**
 * SETUP-PROFILE — The Style Refresh by Ellie
 * ===========================================
 * One-time agent: uploads Ellie's avatar + bio to Twitter/X and Bluesky.
 * Call manually once: GET /api/setup-profile?secret=<CRON_SECRET>
 *
 * Required env vars:
 *   TWITTER_API_KEY, TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 *   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 *   CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime     = "nodejs";
export const maxDuration = 60;
export const dynamic     = "force-dynamic";

const AVATAR_URL = "https://stylebyellie.com/ellie-avatar.jpg";
const TWITTER_BIO = "Weekly fashion edits curated by Ellie — three complete looks with direct buy links, every Monday. stylebyellie.com";
const BLUESKY_BIO = "Weekly fashion edits — three complete looks with direct buy links, every Monday. stylebyellie.com";
const BSKY = "https://bsky.social/xrpc";

/* ─── Twitter OAuth 1.0a ─────────────────────────────────────────── */
function oauthHeader(method: string, url: string, params: Record<string, string>): string {
  const apiKey    = process.env.TWITTER_API_KEY!.trim();
  const apiSecret = process.env.TWITTER_API_SECRET!.trim();
  const accToken  = process.env.TWITTER_ACCESS_TOKEN!.trim();
  const accSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET!.trim();

  const oauth: Record<string, string> = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            accToken,
    oauth_version:          "1.0",
  };

  const allParams = { ...params, ...oauth };
  const base = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");
  const sigBase  = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(base)}`;
  const sigKey   = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accSecret)}`;
  const sig      = crypto.createHmac("sha1", sigKey).update(sigBase).digest("base64");
  oauth.oauth_signature = sig;

  return "OAuth " + Object.keys(oauth).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauth[k])}"`)
    .join(", ");
}

async function updateTwitterProfile(): Promise<{ ok: boolean; detail: string }> {
  const missing = ["TWITTER_API_KEY","TWITTER_API_SECRET","TWITTER_ACCESS_TOKEN","TWITTER_ACCESS_TOKEN_SECRET"]
    .filter(k => !process.env[k]);
  if (missing.length) return { ok: false, detail: `Missing: ${missing.join(", ")}` };

  try {
    // 1 — Download avatar
    const imgRes = await fetch(AVATAR_URL);
    if (!imgRes.ok) return { ok: false, detail: `Avatar fetch failed: ${imgRes.status}` };
    const imgBuf   = Buffer.from(await imgRes.arrayBuffer());
    const imgB64   = imgBuf.toString("base64");

    // 2 — Upload profile image (Twitter v1.1)
    const imgUrl = "https://api.twitter.com/1.1/account/update_profile_image.json";
    const imgParams = { image: imgB64, skip_status: "true" };
    const imgAuth   = oauthHeader("POST", imgUrl, imgParams);
    const form      = new URLSearchParams(imgParams);
    const imgResp   = await fetch(imgUrl, {
      method: "POST",
      headers: { Authorization: imgAuth, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const imgJson = await imgResp.json() as Record<string, unknown>;
    if (!imgResp.ok) return { ok: false, detail: `Twitter image upload failed: ${JSON.stringify(imgJson)}` };

    // 3 — Update bio (Twitter v1.1)
    const bioUrl    = "https://api.twitter.com/1.1/account/update_profile.json";
    const bioParams = { description: TWITTER_BIO };
    const bioAuth   = oauthHeader("POST", bioUrl, bioParams);
    const bioForm   = new URLSearchParams(bioParams);
    const bioResp   = await fetch(bioUrl, {
      method: "POST",
      headers: { Authorization: bioAuth, "Content-Type": "application/x-www-form-urlencoded" },
      body: bioForm.toString(),
    });
    if (!bioResp.ok) {
      const bioJson = await bioResp.json() as Record<string, unknown>;
      return { ok: false, detail: `Twitter bio update failed: ${JSON.stringify(bioJson)}` };
    }

    return { ok: true, detail: "Twitter avatar + bio updated" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

async function updateBlueskyProfile(): Promise<{ ok: boolean; detail: string }> {
  const handle = process.env.BLUESKY_HANDLE?.trim();
  const appPw  = process.env.BLUESKY_APP_PASSWORD?.trim();
  if (!handle || !appPw) return { ok: false, detail: "Missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD" };

  try {
    // 1 — Login
    const sessionRes = await fetch(`${BSKY}/com.atproto.server.createSession`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ identifier: handle, password: appPw }),
    });
    if (!sessionRes.ok) return { ok: false, detail: "Bluesky login failed" };
    const session = await sessionRes.json() as { did: string; accessJwt: string };

    // 2 — Download avatar
    const imgRes = await fetch(AVATAR_URL);
    if (!imgRes.ok) return { ok: false, detail: `Avatar fetch failed: ${imgRes.status}` };
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());

    // 3 — Upload blob
    const blobRes = await fetch(`${BSKY}/com.atproto.repo.uploadBlob`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "image/jpeg" },
      body:    imgBuf,
    });
    if (!blobRes.ok) return { ok: false, detail: "Bluesky blob upload failed" };
    const blobJson = await blobRes.json() as { blob: unknown };

    // 4 — Get existing profile to preserve display name
    const profileRes = await fetch(`${BSKY}/com.atproto.repo.getRecord?repo=${session.did}&collection=app.bsky.actor.profile&rkey=self`);
    const existing   = profileRes.ok ? (await profileRes.json() as { value?: Record<string, unknown> }).value ?? {} : {};
    const displayName = (existing.displayName as string | undefined) ?? "Ellie";

    // 5 — Put updated profile
    const putRes = await fetch(`${BSKY}/com.atproto.repo.putRecord`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        repo:       session.did,
        collection: "app.bsky.actor.profile",
        rkey:       "self",
        record: {
          $type:       "app.bsky.actor.profile",
          displayName,
          description: BLUESKY_BIO,
          avatar:      blobJson.blob,
        },
      }),
    });
    if (!putRes.ok) {
      const putErr = await putRes.text();
      return { ok: false, detail: `Bluesky profile update failed (${putRes.status}): ${putErr}` };
    }
    return { ok: true, detail: "Bluesky avatar + bio updated" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const secret   = process.env.CRON_SECRET?.trim();
  const provided = req.headers.get("authorization")?.replace("Bearer ", "").trim()
    ?? new URL(req.url).searchParams.get("secret")?.trim()
    ?? "";
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [twitter, bluesky] = await Promise.all([
    updateTwitterProfile(),
    updateBlueskyProfile(),
  ]);

  return NextResponse.json({ twitter, bluesky });
}

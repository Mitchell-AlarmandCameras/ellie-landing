import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/approve-weekly?secret=xxx
   Ellie clicks this link in her Sunday preview email.
   Reads draft from /tmp/ellie-draft.json, saves to /tmp/ellie-approved.json.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret      = req.nextUrl.searchParams.get("secret") ?? "";
  const cronSecret  = process.env.CRON_SECRET?.trim() ?? "";
  const approveSecret = process.env.CURATOR_APPROVE_SECRET?.trim() ?? "";

  if (!secret || (secret !== cronSecret && secret !== approveSecret)) {
    return new NextResponse(
      `<html><body style="font-family:Georgia,serif;padding:48px;background:#F5EFE4;text-align:center;">
        <h2 style="color:#c0392b;">Invalid approval link.</h2>
        <p style="color:#6B6560;">This link may have expired. Check your Sunday preview email for a fresh one.</p>
      </body></html>`,
      { status: 401, headers: { "Content-Type": "text/html" } }
    );
  }

  const draftPath    = path.join("/tmp", "ellie-draft.json");
  const approvedPath = path.join("/tmp", "ellie-approved.json");

  if (!fs.existsSync(draftPath)) {
    return new NextResponse(
      `<html><body style="font-family:Georgia,serif;padding:48px;background:#F5EFE4;text-align:center;">
        <h2 style="color:#C4956A;">No draft found.</h2>
        <p style="color:#6B6560;">The draft may have expired from the server's memory.<br/>
        The Sunday curator will generate a fresh one next week.</p>
        <p style="margin-top:24px;font-size:12px;color:#B5A99A;font-family:Arial,sans-serif;">
          To trigger immediately: Vercel → your project → Deployments → Functions →
          run-curator manually (or contact your developer).
        </p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  let lookbook: Record<string, unknown>;
  try {
    lookbook = JSON.parse(fs.readFileSync(draftPath, "utf8")) as Record<string, unknown>;
  } catch {
    return new NextResponse(
      `<html><body style="font-family:Georgia,serif;padding:48px;background:#F5EFE4;text-align:center;">
        <h2 style="color:#c0392b;">Could not read draft.</h2>
        <p style="color:#6B6560;">File corrupted. A fresh draft will generate next Sunday.</p>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  /* ── Live link check before approval ────────────────────────────────────
     Test every buyLink in the draft. Show results in the approval page so
     broken links can be caught before Monday's email goes to members.      */
  type LinkCheckResult = { piece: string; brand: string; url: string; ok: boolean; status: number | string };
  const linkResults: LinkCheckResult[] = [];
  try {
    type DraftItem = { piece: string; brand: string; buyLink?: string };
    type DraftLook = { items?: DraftItem[] };
    const draftLooks = (lookbook.looks as DraftLook[]) ?? [];
    const checks: Promise<void>[] = [];
    for (const look of draftLooks) {
      for (const item of (look.items ?? [])) {
        if (!item.buyLink) continue;
        const { piece, brand, buyLink } = item;
        checks.push(
          (async () => {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 6000);
              const res = await fetch(buyLink, {
                method: "GET",
                signal: controller.signal,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
                redirect: "follow",
              });
              clearTimeout(timer);
              /* 403 = Cloudflare bot protection — link works in browser, not a real failure */
              const ok = res.ok || res.status === 301 || res.status === 302 || res.status === 403;
              linkResults.push({ piece, brand, url: buyLink, ok, status: res.status });
            } catch {
              linkResults.push({ piece, brand, url: buyLink, ok: false, status: "timeout/error" });
            }
          })()
        );
      }
    }
    await Promise.all(checks);
  } catch (checkErr) {
    console.error("[approve-weekly] Link check error (non-fatal):", checkErr);
  }
  const brokenLinks  = linkResults.filter(r => !r.ok);
  const workingLinks = linkResults.filter(r => r.ok);

  /* Save to approved path (local /tmp) */
  const approvedData = { ...lookbook, approvedAt: new Date().toISOString(), linkCheckResults: linkResults };
  try {
    fs.writeFileSync(approvedPath, JSON.stringify(approvedData), "utf8");
  } catch (err) {
    console.error("[approve-weekly] Could not write approved file:", err);
  }

  /* ── Persist full approved brief to Vercel Blob ─────────────────────
     Saves the complete lookbook (including buy links) so the dashboard
     always shows the same looks that went out in Monday's email.
     Members can return any day of the week and see identical content.  */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const slug = String(lookbook.weekOf ?? "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await put(
        `ellie-approved/${slug}.json`,
        JSON.stringify(approvedData),
        { access: "public", contentType: "application/json", addRandomSuffix: false }
      );
      console.log("[approve-weekly] Full approved brief saved to Blob for dashboard sync.");
    } catch (blobErr) {
      console.error("[approve-weekly] Blob approved brief save failed (non-fatal):", blobErr);
    }
  }

  /* ── Push live preview to Vercel Blob so the homepage auto-updates ──
     Writes the public teaser (no buy links) to persistent Blob storage.
     The homepage fetches /api/current-preview which reads from here.    */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const rawLooks = (lookbook.looks as Array<Record<string, unknown>>) ?? [];
      const previewData = {
        weekOf:        lookbook.weekOf,
        editorialLead: lookbook.editorialLead ?? "",
        updatedAt:     new Date().toISOString(),
        looks: rawLooks.map((look) => ({
          index:       look.index,
          label:       look.label,
          tagline:     look.tagline,
          description: look.description,
          teaser: ((look.items as Array<{ piece: string }>) ?? [])
            .slice(0, 4)
            .map((item) => item.piece),
        })),
      };
      await put("ellie-preview/current.json", JSON.stringify(previewData), {
        access:            "public",
        contentType:       "application/json",
        addRandomSuffix:   false,
      });
      console.log("[approve-weekly] Live preview written to Vercel Blob.");
    } catch (blobErr) {
      console.error("[approve-weekly] Blob write failed (non-fatal):", blobErr);
    }
  }

  /* ── Save hero images to Vercel Blob so homepage carousel updates ──
     Claude picks 4 matching Unsplash images as part of the weekly brief.
     On approval, we save them to ellie-hero/current.json.
     The HeroCarousel component fetches /api/hero-images which reads here. */
  type HeroImage = { id: string; alt: string; mood?: string };
  const rawHeroImages = (lookbook.heroImages as HeroImage[]) ?? [];
  if (process.env.BLOB_READ_WRITE_TOKEN && rawHeroImages.length === 4) {
    try {
      const { put } = await import("@vercel/blob");
      const heroData = {
        weekOf:    lookbook.weekOf,
        updatedAt: new Date().toISOString(),
        images: rawHeroImages.map(img => ({
          url:  `https://images.unsplash.com/photo-${img.id}?auto=format&fit=crop&w=900&q=85`,
          alt:  img.alt,
          mood: img.mood ?? "editorial",
        })),
      };
      await put("ellie-hero/current.json", JSON.stringify(heroData), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[approve-weekly] Hero carousel images saved to Blob.");
    } catch (blobErr) {
      console.error("[approve-weekly] Hero image Blob save failed (non-fatal):", blobErr);
    }
  }

  /* ── Publish SEO blog post to Vercel Blob ─────────────────────────────
     Creates a public blog post at /blog/week-of-[date] so Google can index
     the looks. The post is a teaser (no buy links) with a strong CTA to join.
     Also maintains a blog/index.json for the /blog listing page.          */
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put, list } = await import("@vercel/blob");
      type LookItem = { piece: string };
      type Look     = { index: string; label: string; tagline: string; description: string; editorsNote: string; items: LookItem[] };
      const rawLooks = (lookbook.looks as Look[]) ?? [];
      const rawWeekOf = String(lookbook.weekOf ?? "");

      /* slug: "week-of-april-14-2026" */
      const slug = `week-of-${rawWeekOf.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;

      const postData = {
        slug,
        weekOf:        rawWeekOf,
        publishedAt:   new Date().toISOString(),
        editorialLead: String(lookbook.editorialLead ?? ""),
        looks: rawLooks.map(look => ({
          index:       look.index,
          label:       look.label,
          tagline:     look.tagline,
          description: look.description ?? "",
          editorsNote: look.editorsNote ?? "",
          teaser:      (look.items ?? []).slice(0, 5).map(i => i.piece),
        })),
      };

      await put(`blog/posts/${slug}.json`, JSON.stringify(postData), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });

      /* Maintain the blog index */
      const { blobs: indexBlobs } = await list({ prefix: "blog/index" });
      let index: Array<{ slug: string; weekOf: string; publishedAt: string; editorialLead: string; lookLabels: string[] }> = [];
      if (indexBlobs[0]) {
        try {
          const r = await fetch(indexBlobs[0].url);
          if (r.ok) index = await r.json();
        } catch { /* start fresh */ }
      }

      const entry = {
        slug,
        weekOf:        rawWeekOf,
        publishedAt:   new Date().toISOString(),
        editorialLead: String(lookbook.editorialLead ?? "").substring(0, 140),
        lookLabels:    rawLooks.map(l => l.label),
      };
      const existingIdx = index.findIndex(p => p.slug === slug);
      if (existingIdx >= 0) index[existingIdx] = entry; else index.unshift(entry);
      if (index.length > 52) index = index.slice(0, 52);

      await put("blog/index.json", JSON.stringify(index), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[approve-weekly] Blog post published:", slug);
    } catch (blogErr) {
      console.error("[approve-weekly] Blog publish failed (non-fatal):", blogErr);
    }
  }

  /* ── Post to Pinterest ────────────────────────────────────────────────────
     Creates one pin per look (3 total) every Sunday after approval.
     Requires: PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID in Vercel env vars.
     Optional: UNSPLASH_ACCESS_KEY for fresh fashion photos per look.
     Falls back to curated Unsplash images if no key is set.              */
  if (process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID) {
    try {
      type PinLookItem = { piece: string; brand: string; price: string };
      type PinLook     = { label: string; tagline: string; description: string; editorsNote: string; items: PinLookItem[] };
      const rawLooks   = (lookbook.looks as PinLook[]) ?? [];
      const weekOfStr  = String(lookbook.weekOf ?? "");

      /* Curated fallback fashion images (portrait, women's style) */
      const fallbackImages = [
        "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
      ];

      /* Search queries matched to the three standard look types */
      const imageQueries = [
        "professional women blazer office fashion spring",
        "casual women linen outfit weekend spring style",
        "elegant women dress evening champagne style",
      ];

      for (let i = 0; i < rawLooks.length; i++) {
        const look  = rawLooks[i];
        const query = imageQueries[i] ?? "women fashion spring style";
        let imageUrl = fallbackImages[i] ?? fallbackImages[0];

        /* Try Unsplash for a fresh photo if key is available */
        if (process.env.UNSPLASH_ACCESS_KEY) {
          try {
            const uRes = await fetch(
              `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=portrait&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
            );
            if (uRes.ok) {
              const photo = await uRes.json() as { urls?: { regular?: string } };
              if (photo.urls?.regular) imageUrl = photo.urls.regular;
            }
          } catch { /* use fallback */ }
        }

        const itemList = (look.items ?? [])
          .map((item: PinLookItem) => `• ${item.piece} — ${item.brand} (${item.price})`)
          .join("\n");

        const pinDescription =
          `${look.tagline}\n\n` +
          `${look.description}\n\n` +
          `${itemList}\n\n` +
          `Ellie's note: ${look.editorsNote}\n\n` +
          `Full brief + every buy link → stylebyellie.com\n\n` +
          `#StyleRefresh #WomensFashion #PersonalStylist #WeeklyLooks #FashionCuration #OOTD #StyleInspiration`;

        const pinRes = await fetch("https://api.pinterest.com/v5/pins", {
          method: "POST",
          headers: {
            Authorization:  `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            board_id:     process.env.PINTEREST_BOARD_ID,
            title:        `${look.label} — ${weekOfStr} | The Style Refresh`,
            description:  pinDescription,
            link:         "https://stylebyellie.com",
            media_source: { source_type: "image_url", url: imageUrl },
          }),
        });

        if (!pinRes.ok) {
          console.error(`[approve-weekly] Pinterest pin ${i + 1} failed:`, await pinRes.text());
        } else {
          console.log(`[approve-weekly] Pinterest pin posted: ${look.label}`);
        }

        /* Brief pause between pins to respect rate limits */
        await new Promise(r => setTimeout(r, 600));
      }
    } catch (pinterestErr) {
      console.error("[approve-weekly] Pinterest posting failed (non-fatal):", pinterestErr);
    }
  }

  /* ── Post to Twitter / X ─────────────────────────────────────────────────
     Fires after approval every Sunday. Needs 4 env vars in Vercel:
       TWITTER_API_KEY, TWITTER_API_SECRET,
       TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
     Uses OAuth 1.0a (Twitter v2 endpoint) — no app-level read permissions needed.
     The tweet teases the three looks and links to the site — no buy links shown.  */
  if (
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  ) {
    try {
      type TweetLook = { label: string; tagline: string };
      const tweetLooks  = (lookbook.looks as TweetLook[]) ?? [];
      const weekOfStr   = String(lookbook.weekOf ?? "");
      const siteUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

      const lookLines = tweetLooks
        .map((l, i) => `${["01","02","03"][i] ?? String(i + 1)} — ${l.label}: ${l.tagline}`)
        .join("\n");

      const tweetText =
        `This week's Style Refresh is live ✨\n\n` +
        `${String(lookbook.editorialLead ?? "").substring(0, 120)}\n\n` +
        `${lookLines}\n\n` +
        `Full brief + every buy link → ${siteUrl}\n\n` +
        `#StyleRefresh #PersonalStylist #WomensFashion #MondayLooks #FashionCuration`;

      /* OAuth 1.0a signature for Twitter API v2 */
      const oauthSign = async (method: string, url: string, params: Record<string, string>) => {
        const nonce     = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const oauthParams: Record<string, string> = {
          oauth_consumer_key:     process.env.TWITTER_API_KEY!,
          oauth_nonce:            nonce,
          oauth_signature_method: "HMAC-SHA256",
          oauth_timestamp:        timestamp,
          oauth_token:            process.env.TWITTER_ACCESS_TOKEN!,
          oauth_version:          "1.0",
          ...params,
        };
        const sortedKeys = Object.keys(oauthParams).sort();
        const paramStr   = sortedKeys
          .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
          .join("&");
        const sigBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
        const sigKey  =
          `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&` +
          `${encodeURIComponent(process.env.TWITTER_ACCESS_SECRET!)}`;

        /* Crypto is available in Vercel Node.js runtime */
        const { createHmac } = await import("crypto");
        const signature = createHmac("sha256", sigKey).update(sigBase).digest("base64");
        oauthParams.oauth_signature = signature;

        const authHeader =
          "OAuth " +
          Object.entries(oauthParams)
            .filter(([k]) => k.startsWith("oauth_"))
            .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
            .join(", ");
        return authHeader;
      };

      const tweetUrl  = "https://api.twitter.com/2/tweets";
      const authHeader = await oauthSign("POST", tweetUrl, {});
      const tweetRes   = await fetch(tweetUrl, {
        method:  "POST",
        headers: {
          Authorization:  authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
      });

      if (!tweetRes.ok) {
        console.error("[approve-weekly] Twitter post failed:", await tweetRes.text());
      } else {
        const tweetData = await tweetRes.json() as { data?: { id: string } };
        console.log("[approve-weekly] Twitter post published:", tweetData.data?.id);
      }
    } catch (twitterErr) {
      console.error("[approve-weekly] Twitter posting failed (non-fatal):", twitterErr);
    }
  }

  /* ── Post to Facebook Page ──────────────────────────────────────────────
     Posts a weekly summary to the Facebook Page every Sunday on approval.
     Requires: FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN in Vercel env vars.
     How to get: Meta Business Suite → Settings → Page Access Token
     (see blueprint Part 4 for full instructions)                        */
  if (process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    try {
      type FBLook = { label: string; tagline: string };
      const fbLooks   = (lookbook.looks as FBLook[]) ?? [];
      const fbWeekOf  = String(lookbook.weekOf ?? "");
      const fbLead    = String(lookbook.editorialLead ?? "");
      const siteUrl   = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

      const fbLookLines = fbLooks
        .map((l, i) => `${["✨", "🤍", "🌿"][i] ?? "•"} ${l.label} — "${l.tagline}"`)
        .join("\n");

      const fbMessage =
        `This week's Style Refresh is live 🌿\n\n` +
        `"${fbLead}"\n\n` +
        `Week of ${fbWeekOf} — three complete looks:\n\n` +
        `${fbLookLines}\n\n` +
        `Members get every brand, price, and direct buy link in Monday's brief.\n\n` +
        `Join for $19/month → ${siteUrl}\n\n` +
        `#TheStyleRefresh #WomensFashion #PersonalStylist #WeeklyLooks #FashionCuration #OOTD`;

      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message:      fbMessage,
            link:         siteUrl,
            access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
          }),
        }
      );

      if (!fbRes.ok) {
        console.error("[approve-weekly] Facebook post failed:", await fbRes.text());
      } else {
        const fbData = await fbRes.json() as { id?: string };
        console.log("[approve-weekly] Facebook post published:", fbData.id);
      }
    } catch (fbErr) {
      console.error("[approve-weekly] Facebook posting failed (non-fatal):", fbErr);
    }
  }

  /* ── Post to Instagram (via Meta Graph API) ──────────────────────────────
     Auto-posts a photo + caption to @elliestylerefresh every Sunday.
     Requires Instagram Business Account linked to the Facebook Page.
     Requires: INSTAGRAM_ACCOUNT_ID, FACEBOOK_PAGE_ACCESS_TOKEN in Vercel.
     How to get: Meta Business Suite → Instagram → Instagram Account ID
     Uses a curated fashion photo from Unsplash (or UNSPLASH_ACCESS_KEY
     for a fresh weekly photo).                                          */
  if (process.env.INSTAGRAM_ACCOUNT_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    try {
      type IGAutoLook = { label: string; tagline: string };
      const igAutoLooks  = (lookbook.looks as IGAutoLook[]) ?? [];
      const igAutoWeekOf = String(lookbook.weekOf ?? "");
      const igAutoLead   = String(lookbook.editorialLead ?? "");
      const igAutoSite   = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

      const igAutoLookLines = igAutoLooks
        .map((l, i) => `${["✨", "🤍", "🌿"][i] ?? "•"} ${l.label}\n"${l.tagline}"`)
        .join("\n\n");

      const igAutoHashtags = [
        "#TheStyleRefresh", "#StyleRefresh", "#WomensFashion",
        "#PersonalStylist", "#WeeklyLooks", "#FashionCuration",
        "#CuratedStyle", "#OOTD", "#StyleInspo", "#EditorialFashion",
        "#FashionSubscription", "#LookBook", "#StyleEdit", "#MondayVibes",
      ].join(" ");

      const igCaption =
        `This week's edit is here. 🌿\n\n` +
        `"${igAutoLead}"\n\n` +
        `Week of ${igAutoWeekOf}:\n\n` +
        `${igAutoLookLines}\n\n` +
        `Members get every brand, price, and direct buy link.\n` +
        `Link in bio → ${igAutoSite}\n\n` +
        `${igAutoHashtags}`;

      /* Pick a curated fashion photo — try Unsplash API first, fall back to static */
      let igImageUrl = "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1080&q=85";
      if (process.env.UNSPLASH_ACCESS_KEY) {
        try {
          const uRes = await fetch(
            `https://api.unsplash.com/photos/random?query=women+fashion+editorial+style&orientation=portrait&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
          );
          if (uRes.ok) {
            const photo = await uRes.json() as { urls?: { regular?: string } };
            if (photo.urls?.regular) igImageUrl = photo.urls.regular;
          }
        } catch { /* use fallback */ }
      }

      /* Step 1: Create a media container */
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url:    igImageUrl,
            caption:      igCaption,
            access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
          }),
        }
      );

      if (!containerRes.ok) {
        console.error("[approve-weekly] Instagram container creation failed:", await containerRes.text());
      } else {
        const containerData = await containerRes.json() as { id?: string };
        const containerId   = containerData.id;

        if (containerId) {
          /* Step 2: Publish the container */
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerId,
                access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
              }),
            }
          );

          if (!publishRes.ok) {
            console.error("[approve-weekly] Instagram publish failed:", await publishRes.text());
          } else {
            const publishData = await publishRes.json() as { id?: string };
            console.log("[approve-weekly] Instagram post published:", publishData.id);
          }
        }
      }
    } catch (igErr) {
      console.error("[approve-weekly] Instagram posting failed (non-fatal):", igErr);
    }
  }

  /* ── Generate Instagram caption ─────────────────────────────────────────
     Ready to paste into Instagram immediately after approving.
     Ellie just needs to add a photo from her camera roll.              */
  type IGLook = { label: string; tagline: string; items?: Array<{ piece: string }> };
  const igLooks   = (lookbook.looks as IGLook[]) ?? [];
  const weekOfStr = String(lookbook.weekOf ?? "");
  const igLead    = String(lookbook.editorialLead ?? "");
  const igEmojis  = ["✨", "🤍", "🌿"];

  const igLookLines = igLooks
    .map((l, i) => `${igEmojis[i] ?? "•"} ${l.label}\n"${l.tagline}"`)
    .join("\n\n");

  const igHashtags = [
    "#TheStyleRefresh", "#StyleRefresh", "#WomensFashion",
    "#PersonalStylist", "#WeeklyLooks", "#FashionCuration",
    "#CuratedStyle", "#OOTD", "#StyleInspo", "#EditorialFashion",
    "#FashionSubscription", "#LookBook", "#StyleEdit", "#MondayVibes",
    "#FashionForWomen",
  ].join(" ");

  const instagramCaption =
    `This week's edit is here. 🌿\n\n` +
    `${igLead}\n\n` +
    `Week of ${weekOfStr} — three complete looks:\n\n` +
    `${igLookLines}\n\n` +
    `Members get every brand, price, and direct buy link in Monday's brief.\n` +
    `Link in bio → stylebyellie.com\n\n` +
    `${igHashtags}`;

  const weekOf  = weekOfStr || "this week";
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");
  const sendUrl = `${baseUrl}/api/send-weekly`;

  /* ── Build link check HTML table ────────────────────────────────────── */
  const linkCheckHtml = linkResults.length === 0 ? "" : `
    <div style="margin-top:28px;text-align:left;">
      <p style="color:#2C2C2C;font-family:Arial,sans-serif;font-size:11px;
                 letter-spacing:0.2em;text-transform:uppercase;margin:0 0 10px;">
        Link Check — ${workingLinks.length}/${linkResults.length} OK
        ${brokenLinks.length > 0 ? `<span style="color:#c0392b;"> · ${brokenLinks.length} need attention</span>` : `<span style="color:#27ae60;"> · All clear ✓</span>`}
      </p>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">
        ${linkResults.map(r => `
          <tr style="border-bottom:1px solid #EDE7DC;">
            <td style="padding:6px 4px;color:${r.ok ? "#27ae60" : "#c0392b"};font-size:14px;width:20px;">
              ${r.ok ? "✓" : "✗"}
            </td>
            <td style="padding:6px 4px;color:#2C2C2C;">${r.brand} — ${r.piece}</td>
            <td style="padding:6px 4px;color:#999;font-size:10px;">${r.status}</td>
            <td style="padding:6px 4px;">
              <a href="${r.url}" target="_blank" style="color:#C4956A;font-size:10px;word-break:break-all;">
                ${r.url.length > 55 ? r.url.substring(0, 55) + "…" : r.url}
              </a>
            </td>
          </tr>`).join("")}
      </table>
      ${brokenLinks.length > 0 ? `
        <p style="margin:12px 0 0;color:#c0392b;font-size:11px;font-family:Arial,sans-serif;">
          ⚠ ${brokenLinks.length} link(s) returned errors above. 
          Consider updating <code>data/lookbook.ts</code> with corrected URLs before Monday.
        </p>` : ""}
    </div>`;

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Approved — Ellie Style Refresh</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
  <div style="max-width:600px;width:90%;margin:0 auto;padding:48px 0;text-align:center;">
    <p style="color:#C4956A;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;
               font-family:Arial,sans-serif;margin-bottom:10px;">
      Ellie · The Style Refresh
    </p>
    <h1 style="color:#2C2C2C;font-size:28px;font-weight:400;margin:0 0 12px;">Approved. ✓</h1>
    <p style="color:#4A4A4A;font-size:16px;line-height:1.75;margin:0 0 24px;">
      Week of <strong>${weekOf}</strong> is approved.<br/>
      Members will receive their Monday morning brief automatically at 7 AM ET.
    </p>
    <div style="background:#FDFAF5;border:1px solid #DDD4C5;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
        Need to send immediately instead?
      </p>
      <a href="${sendUrl}" onclick="return confirm('Send the weekly brief to all members now?')"
         style="display:inline-block;background:#C4956A;color:#FDFAF5;padding:11px 28px;
                 font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;
                 text-transform:uppercase;text-decoration:none;">
        Send Now →
      </a>
    </div>
    ${linkCheckHtml}

    <!-- ── Instagram Photos ─────────────────────────────────────── -->
    ${rawHeroImages.length > 0 ? `
    <div style="margin-top:32px;text-align:left;background:#FDFAF5;border:1px solid #DDD4C5;padding:22px 24px;">
      <p style="color:#C4956A;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;
                 font-family:Arial,sans-serif;margin:0 0 6px;">
        📸 This Week's Photos — Tap &amp; Hold to Save
      </p>
      <p style="color:#6B6560;font-size:11px;font-family:Arial,sans-serif;margin:0 0 14px;line-height:1.5;">
        Pick one of these for your Instagram post. Tap and hold on your phone → Save Image, or right-click on desktop → Save.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${rawHeroImages.map((img: { id: string; alt: string }) => `
          <a href="https://images.unsplash.com/photo-${img.id}?auto=format&fit=crop&w=1080&q=90"
             target="_blank"
             style="display:block;text-decoration:none;">
            <img
              src="https://images.unsplash.com/photo-${img.id}?auto=format&fit=crop&w=400&q=80"
              alt="${img.alt}"
              style="width:100%;height:180px;object-fit:cover;display:block;border:1px solid #DDD4C5;"
            />
            <p style="margin:4px 0 0;font-size:10px;color:#8A8580;font-family:Arial,sans-serif;">
              Tap to open full size →
            </p>
          </a>`).join("")}
      </div>
      <p style="color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;margin:12px 0 0;">
        Photos by Unsplash · Free to use · No credit required for Instagram
      </p>
    </div>` : ""}

    <!-- ── Instagram Caption ───────────────────────────────────── -->
    <div style="margin-top:16px;text-align:left;background:#FDFAF5;border:1px solid #DDD4C5;padding:22px 24px;">
      <p style="color:#C4956A;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;
                 font-family:Arial,sans-serif;margin:0 0 10px;">
        ✍️ Instagram Caption — Copy &amp; Paste
      </p>
      <p style="color:#6B6560;font-size:11px;font-family:Arial,sans-serif;margin:0 0 12px;line-height:1.5;">
        Save a photo above, then paste this caption:
      </p>
      <textarea
        onclick="this.select()"
        readonly
        style="width:100%;box-sizing:border-box;height:260px;background:#F5EFE4;
               border:1px solid #DDD4C5;padding:14px;font-family:Georgia,serif;
               font-size:12px;color:#2C2C2C;line-height:1.75;resize:vertical;
               cursor:text;"
      >${instagramCaption.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
      <p style="color:#B5A99A;font-size:10px;font-family:Arial,sans-serif;margin:8px 0 0;">
        Tap the box to select all → copy → open Instagram → paste.
      </p>
    </div>

    <p style="color:#B5A99A;font-size:11px;font-family:Arial,sans-serif;margin-top:24px;">
      Approved at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET
    </p>
  </div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

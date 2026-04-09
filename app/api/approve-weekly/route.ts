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
                headers: { "User-Agent": "Mozilla/5.0 (compatible; StyleRefreshBot/1.0)" },
                redirect: "follow",
              });
              clearTimeout(timer);
              linkResults.push({ piece, brand, url: buyLink, ok: res.ok || res.status === 301 || res.status === 302, status: res.status });
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
          /* Teaser: piece names only — buy links stay members-only */
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

  const weekOf  = String(lookbook.weekOf ?? "this week");
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
    <p style="color:#B5A99A;font-size:11px;font-family:Arial,sans-serif;margin-top:24px;">
      Approved at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET
    </p>
  </div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

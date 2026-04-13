import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { searchBestProduct } from "@/lib/product-hunter";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/agent-product-hunter
   THE PRODUCT HUNTER — upgrades every search-page link in the current brief
   to a direct product URL (exact item, real reviews, best price).

   Can be triggered manually any time to upgrade the live brief.
   Also wired into run-curator (runs automatically after each new brief).
   Also wired into link-repair (runs before waterfall cascade on any break).

   Requires: SERPER_API_KEY environment variable.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 55;

type LookItem = { piece: string; brand: string; price: string; note: string; buyLink: string };
type Look     = { index: string; label: string; tagline: string; description: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[]; [key: string]: unknown };

type UpgradeRecord = {
  piece:      string;
  brand:      string;
  oldUrl:     string;
  newUrl:     string;
  improved:   boolean;
};

function buildUpgradeEmail(upgrades: UpgradeRecord[], weekOf: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
  const improved = upgrades.filter(u => u.improved);
  const unchanged = upgrades.filter(u => !u.improved);

  const rows = improved.map(u => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E8DDD0;font-size:12px;
                  font-family:Arial,sans-serif;color:#2C2C2C;">
        <strong>${u.piece}</strong><br/>
        <span style="color:#8A8580;font-size:10px;">${u.brand}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8DDD0;">
        <span style="display:inline-block;padding:2px 8px;background:#2d6a27;color:#fff;
                      font-size:9px;font-family:Arial,sans-serif;letter-spacing:0.1em;
                      text-transform:uppercase;border-radius:2px;">
          Direct product link
        </span><br/>
        <a href="${u.newUrl}" style="font-size:10px;color:#C4956A;word-break:break-all;">
          ${u.newUrl.slice(0, 70)}${u.newUrl.length > 70 ? "…" : ""}
        </a>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:24px 32px;">
    <p style="margin:0 0 4px;color:#C4956A;font-size:10px;letter-spacing:0.32em;
               text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Product Hunter
    </p>
    <h2 style="margin:4px 0 0;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      ${improved.length} shop link${improved.length !== 1 ? "s" : ""} upgraded to exact products
    </h2>
    <p style="margin:6px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Week of ${weekOf} · Members now see direct product pages, not search results
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 16px;font-size:13px;color:#4A4A4A;font-family:Arial,sans-serif;line-height:1.6;">
      ${improved.length} of ${upgrades.length} links were upgraded from search pages to direct product pages
      with real ratings and reviews. ${unchanged.length > 0 ? `${unchanged.length} could not be improved — search pages kept as fallback.` : "Every link is now a direct product."}
    </p>
    ${improved.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 12px;text-align:left;font-family:Arial,sans-serif;font-size:9px;
                    letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;
                    width:40%;">Item</th>
        <th style="padding:8px 12px;text-align:left;font-family:Arial,sans-serif;font-size:9px;
                    letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">
          Exact product link</th>
      </tr>
      ${rows}
    </table>` : ""}
  </td></tr>
  <tr><td style="padding:20px 32px 28px;">
    <p style="margin:0;font-size:11px;color:#B5A99A;font-family:Arial,sans-serif;line-height:1.6;">
      Powered by Serper Google Shopping · <a href="${siteUrl}" style="color:#C4956A;">stylebyellie.com</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const serperKey = process.env.SERPER_API_KEY?.trim();
  if (!serperKey) {
    return NextResponse.json({ skipped: true, reason: "SERPER_API_KEY not configured" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "Blob not configured" });
  }

  /* ── Load current brief ──────────────────────────────────────────── */
  let brief: Brief | null = null;
  let blobPath            = "";

  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

    if (!latest) return NextResponse.json({ skipped: true, reason: "No approved brief in Blob" });

    blobPath    = latest.pathname;
    const r     = await fetch(latest.url, { cache: "no-store" });
    if (!r.ok)  throw new Error(`Blob fetch ${r.status}`);
    brief       = await r.json() as Brief;
    if (!brief?.looks?.length) throw new Error("Brief has no looks");
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  /* ── Run Product Hunter on every item ───────────────────────────── */
  const upgrades:   UpgradeRecord[] = [];
  const patchedLooks: Look[]        = JSON.parse(JSON.stringify(brief.looks)) as Look[];

  for (let li = 0; li < patchedLooks.length; li++) {
    const look = patchedLooks[li];
    for (let ii = 0; ii < look.items.length; ii++) {
      const item = look.items[ii];

      console.log(`[product-hunter] Searching: "${item.piece}" by ${item.brand}`);
      const directUrl = await searchBestProduct(serperKey, item.piece, item.brand, item.price);

      if (directUrl && directUrl !== item.buyLink) {
        upgrades.push({
          piece:    item.piece,
          brand:    item.brand,
          oldUrl:   item.buyLink,
          newUrl:   directUrl,
          improved: true,
        });
        patchedLooks[li].items[ii].buyLink = directUrl;
      } else {
        upgrades.push({
          piece:    item.piece,
          brand:    item.brand,
          oldUrl:   item.buyLink,
          newUrl:   item.buyLink,
          improved: false,
        });
      }
    }
  }

  const improvedCount = upgrades.filter(u => u.improved).length;
  console.log(`[product-hunter] ${improvedCount}/${upgrades.length} links upgraded`);

  /* ── Save patched brief if any improvements made ────────────────── */
  if (improvedCount > 0) {
    try {
      const { put } = await import("@vercel/blob");
      const patched: Brief = { ...brief, looks: patchedLooks, productHunterAt: new Date().toISOString() };
      await put(blobPath, JSON.stringify(patched), {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log(`[product-hunter] Patched brief saved`);
    } catch (e) {
      console.error("[product-hunter] Blob save failed:", e);
    }

    /* ── Email owner ─────────────────────────────────────────────── */
    const resendKey   = process.env.RESEND_API_KEY?.trim();
    const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
    const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

    if (resendKey && notifyEmail) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    `Ellie Product Hunter <${fromEmail}>`,
        to:      notifyEmail,
        subject: `🎯 ${improvedCount} shop link${improvedCount !== 1 ? "s" : ""} upgraded to exact products — week of ${brief.weekOf}`,
        html:    buildUpgradeEmail(upgrades, brief.weekOf),
      }).catch(e => console.error("[product-hunter] Email failed:", e));
    }
  }

  return NextResponse.json({
    ok:       true,
    weekOf:   brief.weekOf,
    checked:  upgrades.length,
    upgraded: improvedCount,
    results:  upgrades.map(u => ({ piece: u.piece, improved: u.improved })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/link-repair
   Vercel Cron fires this every 6 hours around the clock.

   Every run:
     1. Loads the current approved brief from Vercel Blob
     2. Checks every shop link with a real GET request + HTML scan
     3. Any broken link runs through a 5-step waterfall:
          Step 1  Original link
          Step 2  Brand's own search URL (using verified patterns)
          Step 3  Shopbop search
          Step 4  Revolve search
          Step 5  Nordstrom (guaranteed fallback)
     4. If any links were repaired, patches the Blob file immediately
        so the dashboard shows the working link within seconds
     5. Emails owner ONLY when repairs were made (no spam when all links OK)

   This means broken links are auto-fixed within 6 hours of breaking —
   without any manual intervention.
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 55;

/* ─── Verified brand search URL patterns ─────────────────────────────── */
const BRAND_SEARCH_URLS: Record<string, (keywords: string) => string> = {
  "theory":         kw => `https://www.theory.com/search?q=${kw}`,
  "vince":          kw => `https://www.vince.com/search?q=${kw}`,
  "reformation":    kw => `https://www.thereformation.com/search?q=${kw}`,
  "anthropologie":  kw => `https://www.anthropologie.com/search?q=${kw}`,
  "everlane":       kw => `https://www.everlane.com/search?q=${kw}`,
  "mejuri":         kw => `https://mejuri.com/search?q=${kw}`,
  "tory burch":     kw => `https://www.toryburch.com/en-us/search?q=${kw}`,
  "adidas":         kw => `https://www.adidas.com/us/search?q=${kw}+women`,
  "baggu":          kw => `https://baggu.com/search?type=product&q=${kw}`,
  "free people":    kw => `https://www.freepeople.com/search?query=${kw}`,
  "cos":            kw => `https://www.cos.com/en_usd/search.html?q=${kw}`,
  "& other stories": kw => `https://www.stories.com/en_usd/search.html?q=${kw}`,
  "toteme":         kw => `https://toteme-studio.com/search?type=product&q=${kw}`,
  "jacquemus":      kw => `https://www.jacquemus.com/search?q=${kw}`,
  "a.p.c.":         kw => `https://www.apc.fr/us/search/?q=${kw}`,
  "ganni":          kw => `https://www.ganni.com/en-us/search?q=${kw}`,
  "isabel marant":  kw => `https://www.isabelmarant.com/en-us/search?q=${kw}`,
  "l'agence":       kw => `https://www.lagence.com/search?q=${kw}`,
  "frame":          kw => `https://www.frame-store.com/search?q=${kw}`,
  "rag & bone":     kw => `https://www.rag-bone.com/search?q=${kw}`,
  "rag and bone":   kw => `https://www.rag-bone.com/search?q=${kw}`,
  "club monaco":    kw => `https://www.clubmonaco.com/search?q=${kw}`,
  "kate spade":     kw => `https://www.katespade.com/search?q=${kw}`,
  "shopbop":        kw => `https://www.shopbop.com/s/search?q=${kw}+women`,
  "revolve":        kw => `https://www.revolve.com/r/Search.jsp?q=${kw}+women`,
  "saks":           kw => `https://www.saksfifthavenue.com/search?query=${kw}+women`,
  "nordstrom":      kw => `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kw}+women`,
};

/* ─── Error / empty page patterns ────────────────────────────────────── */
const EMPTY_PATTERNS = [
  /\b0\s+(?:results?|products?|items?|matches?)\b/i,
  /no\s+(?:results?|products?|items?)\s+(?:found|for|available)/i,
  /(?:sorry|oops)[^<]{0,60}(?:no|couldn.t|nothing|found|match)/i,
  /nothing\s+(?:found|matched|here)/i,
  /we\s+couldn.t\s+find/i,
  /your\s+search\s+(?:returned|found)\s+(?:no|0)/i,
  /no\s+items?\s+(?:match|found)/i,
];

const ERROR_PATTERNS = [
  /<title[^>]*>[^<]*(?:404|not\s+found|error|oops|page\s+not\s+found)[^<]*<\/title>/i,
  /<h1[^>]*>[^<]*(?:404|not\s+found|oops|error)[^<]*<\/h1>/i,
];

/* ─── Deep link check ─────────────────────────────────────────────────── */
async function deepCheck(url: string, ms = 9000): Promise<{ ok: boolean; reason: string }> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const res   = await fetch(url, {
      method:   "GET",
      signal:   ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(timer);

    if (res.status === 404)   return { ok: false, reason: "404 Not Found" };
    if (res.status >= 500)    return { ok: false, reason: `Server error ${res.status}` };
    if (res.status === 403)   return { ok: true,  reason: "Bot-protected — works in browser" };
    if (!res.ok)              return { ok: false, reason: `HTTP ${res.status}` };

    /* Read first 4 KB to detect empty/error pages */
    const reader  = res.body?.getReader();
    let   snippet = "";
    if (reader) {
      const dec = new TextDecoder();
      let   bytes = 0;
      while (bytes < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        snippet += dec.decode(value, { stream: true });
        bytes   += value.length;
      }
      reader.cancel().catch(() => {});
    }

    for (const p of ERROR_PATTERNS) {
      if (p.test(snippet)) return { ok: false, reason: "Error page detected" };
    }
    for (const p of EMPTY_PATTERNS) {
      if (p.test(snippet)) return { ok: false, reason: "Zero search results" };
    }

    return { ok: true, reason: "OK" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { ok: true, reason: "Slow server — assumed OK" };
    }
    return { ok: false, reason: msg.slice(0, 80) };
  }
}

/* ─── Waterfall cascade to working link ──────────────────────────────── */
async function cascadeLink(
  piece:   string,
  brand:   string,
  original: string,
): Promise<{ url: string; step: number; source: string }> {

  /* Build keyword string: "piece brand" → URL-encoded */
  const kw = `${piece} ${brand}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "+");

  /* Try brand's own search URL first (keeps brand match intact) */
  const brandKey  = brand.toLowerCase().trim();
  const brandFn   = BRAND_SEARCH_URLS[brandKey];
  const brandUrl  = brandFn ? brandFn(kw) : null;

  const candidates: Array<{ url: string; source: string }> = [
    { url: original,                                                             source: "Original" },
    ...(brandUrl && brandUrl !== original ? [{ url: brandUrl, source: `${brand} search` }] : []),
    { url: `https://www.shopbop.com/s/search?q=${kw}+women`,                   source: "Shopbop" },
    { url: `https://www.revolve.com/r/Search.jsp?q=${kw}+women`,               source: "Revolve" },
    { url: `https://www.ssense.com/en-us/women/search?q=${kw}`,                source: "SSENSE" },
    { url: `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kw}+women`, source: "Nordstrom" },
  ];

  for (let i = 0; i < candidates.length; i++) {
    const { url, source } = candidates[i];
    const check = await deepCheck(url, i === 0 ? 9000 : 7000);
    if (check.ok) {
      return { url, step: i + 1, source };
    }
    console.log(`[link-repair] Step ${i + 1} failed for "${piece}" (${source}): ${check.reason}`);
  }

  /* Nordstrom guaranteed fallback — should never reach here */
  return {
    url:    `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kw}+women`,
    step:   candidates.length,
    source: "Nordstrom (emergency)",
  };
}

/* ─── Types ───────────────────────────────────────────────────────────── */
type LookItem = { piece: string; brand: string; price: string; note: string; buyLink: string };
type Look     = { index: string; label: string; tagline: string; description: string; editorsNote: string; items: LookItem[] };
type Brief    = { weekOf: string; editorialLead: string; looks: Look[]; [key: string]: unknown };

type RepairRecord = {
  piece:        string;
  brand:        string;
  originalUrl:  string;
  repairedUrl:  string;
  step:         number;
  source:       string;
  failReason:   string;
};

/* ─── Handler ─────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "Blob not configured" });
  }

  /* ── Load current approved brief from Blob ──────────────────────── */
  let brief: Brief | null = null;
  let blobPath            = "";

  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const latest = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

    if (!latest) {
      return NextResponse.json({ skipped: true, reason: "No approved brief in Blob yet" });
    }

    blobPath = latest.pathname;
    const r  = await fetch(latest.url);
    if (!r.ok) throw new Error(`Blob fetch failed: ${r.status}`);
    const data = await r.json() as Brief;
    if (!data?.looks?.length) throw new Error("Brief has no looks");
    brief = data;
  } catch (err) {
    console.error("[link-repair] Could not load brief:", err);
    return NextResponse.json({ error: "Could not load approved brief" }, { status: 500 });
  }

  /* ── Check every shop link in parallel ─────────────────────────── */
  type IndexedItem = { lookIdx: number; itemIdx: number; item: LookItem };
  const allItems: IndexedItem[] = [];
  brief.looks.forEach((look, li) =>
    look.items.forEach((item, ii) => allItems.push({ lookIdx: li, itemIdx: ii, item }))
  );

  console.log(`[link-repair] Checking ${allItems.length} links in brief (week of ${brief.weekOf})…`);

  const checks = await Promise.all(
    allItems.map(({ item }) => deepCheck(item.buyLink))
  );

  /* ── Cascade any failures ────────────────────────────────────────── */
  const repairs: RepairRecord[] = [];

  const cascadeResults = await Promise.all(
    allItems.map(async ({ item }, idx) => {
      const check = checks[idx];
      if (check.ok) return null;

      console.log(`[link-repair] Broken: "${item.piece}" (${item.brand}) — ${check.reason}`);
      const cascade = await cascadeLink(item.piece, item.brand, item.buyLink);

      repairs.push({
        piece:       item.piece,
        brand:       item.brand,
        originalUrl: item.buyLink,
        repairedUrl: cascade.url,
        step:        cascade.step,
        source:      cascade.source,
        failReason:  check.reason,
      });

      return { lookIdx: allItems[idx].lookIdx, itemIdx: allItems[idx].itemIdx, newUrl: cascade.url };
    })
  );

  /* ── If nothing is broken, log and return ───────────────────────── */
  if (repairs.length === 0) {
    console.log(`[link-repair] All ${allItems.length} links healthy — no repairs needed`);
    return NextResponse.json({
      ok:       true,
      repaired: 0,
      checked:  allItems.length,
      weekOf:   brief.weekOf,
    });
  }

  /* ── Patch the brief with repaired links ────────────────────────── */
  const patchedLooks: Look[] = JSON.parse(JSON.stringify(brief.looks)) as Look[];
  for (const result of cascadeResults) {
    if (!result) continue;
    patchedLooks[result.lookIdx].items[result.itemIdx].buyLink = result.newUrl;
  }

  const patchedBrief: Brief = {
    ...brief,
    looks:      patchedLooks,
    repairedAt: new Date().toISOString(),
    repairCount: (Number(brief.repairCount ?? 0)) + repairs.length,
  };

  /* Save patched brief back to Blob */
  try {
    const { put } = await import("@vercel/blob");
    await put(blobPath, JSON.stringify(patchedBrief), {
      access:          "public",
      contentType:     "application/json",
      addRandomSuffix: false,
    });
    console.log(`[link-repair] Patched brief saved to Blob: ${blobPath}`);
  } catch (putErr) {
    console.error("[link-repair] Failed to save patched brief:", putErr);
  }

  /* ── Email owner with repair report ─────────────────────────────── */
  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";

  if (resendKey && notifyEmail) {
    const repairRows = repairs.map(r => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:12px;color:#2C2C2C;">
          <strong>${r.piece}</strong><br/>
          <span style="color:#8A8580;font-size:10px;">${r.brand}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:10px;color:#c0392b;">
          ${r.failReason}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #E8DDD0;">
          <span style="display:inline-block;padding:1px 6px;border-radius:2px;font-size:9px;
                        font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;
                        background:#2d6a27;color:#fff;margin-bottom:4px;">
            Fixed → Step ${r.step}: ${r.source}
          </span><br/>
          <a href="${r.repairedUrl}" style="font-size:10px;color:#C4956A;word-break:break-all;">${r.repairedUrl}</a>
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF5;max-width:600px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,#C4956A,#2d6a27,#C4956A);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:22px 32px;">
    <p style="margin:0 0 2px;color:#C4956A;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · Auto Link Repair
    </p>
    <h2 style="margin:6px 0 0;color:#2C2C2C;font-size:20px;font-weight:400;font-family:Georgia,serif;">
      🔧 ${repairs.length} broken link${repairs.length > 1 ? "s" : ""} auto-repaired
    </h2>
    <p style="margin:6px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Week of ${brief.weekOf} · Fixed automatically · No action needed
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px 0;">
    <p style="margin:0 0 12px;font-size:13px;color:#4A4A4A;font-family:Arial,sans-serif;line-height:1.6;">
      The 6-hour link monitor found ${repairs.length} broken shop link${repairs.length > 1 ? "s" : ""} and repaired
      ${repairs.length > 1 ? "them" : "it"} automatically. Members are already seeing the fixed links.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E8DDD0;">
      <tr style="background:#F5EFE4;">
        <th style="padding:8px 12px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Item</th>
        <th style="padding:8px 12px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">What broke</th>
        <th style="padding:8px 12px;text-align:left;font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#C4956A;border-bottom:1px solid #E8DDD0;">Fixed link</th>
      </tr>
      ${repairRows}
    </table>
  </td></tr>
  <tr><td style="padding:20px 32px 24px;">
    <p style="margin:0;font-size:12px;color:#8A8580;font-family:Arial,sans-serif;font-style:italic;">
      This monitor runs every 6 hours. You will only receive this email when repairs are made.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from:    `Ellie Monitor <${fromEmail}>`,
      to:      notifyEmail,
      subject: `🔧 ${repairs.length} shop link${repairs.length > 1 ? "s" : ""} auto-repaired — week of ${brief.weekOf}`,
      html,
    });
    console.log(`[link-repair] Repair email sent — ${repairs.length} fixes`);
  }

  return NextResponse.json({
    ok:       true,
    repaired: repairs.length,
    checked:  allItems.length,
    weekOf:   brief.weekOf,
    repairs:  repairs.map(r => ({ piece: r.piece, brand: r.brand, step: r.step, source: r.source })),
  });
}

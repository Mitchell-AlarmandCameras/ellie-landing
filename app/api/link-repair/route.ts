import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { searchBestProduct } from "@/lib/product-hunter";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/link-repair
   Vercel Cron fires this every 6 hours around the clock.

   Every run:
     1. Loads the current approved brief from Vercel Blob
     2. Checks every shop link with a real GET request + deep HTML scan
        — detects 404s, 5xx errors, bot blocks, empty results, homepage
          redirects, "page not found" body text, zero-result pages
     3. Banned brands (Baggu, Sézane, Madewell, J.Crew, ASOS, Zara, H&M,
        Sam Edelman) are auto-cascaded regardless of link status
     4. Brand/link destination mismatches are auto-cascaded
     5. Any broken link runs through an 8-step waterfall:
          Step 1  Original link          (skipped for banned brands)
          Step 2  Brand's own search URL (verified patterns)
          Step 3  Shopbop search
          Step 4  Revolve search
          Step 5  SSENSE search
          Step 6  Farfetch search
          Step 7  Saks Fifth Avenue search
          Step 8  Nordstrom search
          [Guaranteed] Nordstrom piece-only fallback — never returns 0
     6. If any links were repaired, patches the Blob file immediately
     7. Emails owner ONLY when repairs were made (no spam when all OK)
     + Checks: brief freshness, content quality, brand mismatch, hero images
═══════════════════════════════════════════════════════════════════════════ */

export const runtime     = "nodejs";
export const maxDuration = 55;

/* ─── Brands that consistently block bots or return unreliable links ─── */
const BANNED_BRANDS = new Set([
  "baggu",
  "shopbop",           /* search URLs return 404 externally */
  "sézane",
  "sezane",
  "madewell",
  "j.crew",
  "j crew",
  "asos",
  "zara",
  "h&m",
  "h and m",
  "sam edelman",
  "net-a-porter",
  "net a porter",
]);

/* ─── Verified brand search URL patterns ─────────────────────────────── */
const BRAND_SEARCH_URLS: Record<string, (keywords: string) => string> = {
  "theory":            kw => `https://www.theory.com/search?q=${kw}`,
  "vince":             kw => `https://www.vince.com/search?q=${kw}`,
  "reformation":       kw => `https://www.thereformation.com/search?q=${kw}`,
  "anthropologie":     kw => `https://www.anthropologie.com/search?q=${kw}`,
  "everlane":          kw => `https://www.everlane.com/search?q=${kw}`,
  "mejuri":            kw => `https://mejuri.com/search?q=${kw}`,
  "tory burch":        kw => `https://www.toryburch.com/en-us/search?q=${kw}`,
  "adidas":            kw => `https://www.adidas.com/us/search?q=${kw}+women`,
  "free people":       kw => `https://www.freepeople.com/search?query=${kw}`,
  "cos":               kw => `https://www.cos.com/en_usd/search.html?q=${kw}`,
  "& other stories":   kw => `https://www.stories.com/en_usd/search.html?q=${kw}`,
  "toteme":            kw => `https://toteme-studio.com/search?type=product&q=${kw}`,
  "jacquemus":         kw => `https://www.jacquemus.com/search?q=${kw}`,
  "a.p.c.":            kw => `https://www.apc.fr/us/search/?q=${kw}`,
  "ganni":             kw => `https://www.ganni.com/en-us/search?q=${kw}`,
  "isabel marant":     kw => `https://www.isabelmarant.com/en-us/search?q=${kw}`,
  "l'agence":          kw => `https://www.lagence.com/search?q=${kw}`,
  "frame":             kw => `https://www.frame-store.com/search?q=${kw}`,
  "rag & bone":        kw => `https://www.rag-bone.com/search?q=${kw}`,
  "rag and bone":      kw => `https://www.rag-bone.com/search?q=${kw}`,
  "club monaco":       kw => `https://www.clubmonaco.com/search?q=${kw}`,
  "kate spade":        kw => `https://www.katespade.com/search?q=${kw}`,
  "banana republic":   kw => `https://bananarepublic.gap.com/browse/search.do?searchText=${kw}`,
  "quince":            kw => `https://www.onequince.com/search?q=${kw}`,
  "staud":             kw => `https://www.staud.clothing/search?q=${kw}`,
  "ulla johnson":      kw => `https://ullajohnson.com/search?q=${kw}`,
  "veronica beard":    kw => `https://www.veronicabeard.com/search?q=${kw}`,
  "alice + olivia":    kw => `https://www.aliceandolivia.com/search?q=${kw}`,
  "equipment":         kw => `https://www.equipmentfr.com/search?q=${kw}`,
  "nanushka":          kw => `https://www.nanushka.com/search?q=${kw}`,
  "ganni":             kw => `https://www.ganni.com/en-us/search?q=${kw}`,
  "ba&sh":             kw => `https://us.ba-sh.com/search?q=${kw}`,
  "arket":             kw => `https://www.arket.com/en_usd/search.html?q=${kw}`,
  "massimo dutti":     kw => `https://www.massimodutti.com/en/search?searchTerm=${kw}`,
  "revolve":           kw => `https://www.revolve.com/r/Search.jsp?q=${kw}+women`,
  "saks":              kw => `https://www.saksfifthavenue.com/search?query=${kw}+women`,
  "nordstrom":         kw => `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kw}+women`,
};

/* ─── Retailers that render results via JavaScript (CSR/SPA).
   Our server-side HTML fetch only sees a JS shell — no product content.
   deepCheck skips HTML pattern scanning for these and trusts HTTP status only.
   The real protection is keyword simplification (see cascadeLink).
   NOTE: Shopbop removed — their /s/search URLs return 404 server-side. ── */
const CSR_RETAILERS = [
  "revolve.com",
  "ssense.com",
  "farfetch.com",
  "mytheresa.com",
];

/* ─── Error page patterns (title/heading signals) ─────────────────────── */
const ERROR_PATTERNS = [
  /<title[^>]*>[^<]*(?:404|not\s+found|error|oops|page\s+not\s+found|bad\s+gateway|503|502|access\s+denied|forbidden)[^<]*<\/title>/i,
  /<h1[^>]*>[^<]*(?:404|not\s+found|oops|error|access\s+denied|forbidden)[^<]*<\/h1>/i,
  /<h2[^>]*>[^<]*(?:404|page\s+not\s+found|something\s+went\s+wrong)[^<]*<\/h2>/i,
];

/* ─── Empty / zero-result page patterns ───────────────────────────────── */
const EMPTY_PATTERNS = [
  /\b0\s+(?:results?|products?|items?|matches?)\b/i,
  /no\s+(?:results?|products?|items?)\s+(?:found|for|available)/i,
  /(?:sorry|oops)[^<]{0,80}(?:no|couldn.t|nothing|found|match)/i,
  /nothing\s+(?:found|matched|here)/i,
  /we\s+couldn.t\s+find/i,
  /your\s+search\s+(?:returned|found)\s+(?:no|0)/i,
  /no\s+items?\s+(?:match|found)/i,
  /try\s+(?:a\s+)?different\s+(?:search|keyword|term)/i,
  /didn.t\s+find\s+(?:any|what|the)/i,
  /could\s+not\s+find/i,
  /showing\s+0\s+(?:of|results?|products?)/i,
  /\bno\s+matches?\b/i,
  /search\s+(?:returned|has)\s+no\s+results/i,
  /unfortunately.*(?:no|couldn.t|nothing)/i,
  /page\s+(does(n.t|\s+not)\s+exist|not\s+found)/i,
  /this\s+page\s+(doesn.t|does\s+not)\s+exist/i,
  /we\s+can.t\s+find\s+(that|this)\s+page/i,
  /looks\s+like.*page.*(?:moved|gone|removed)/i,
  /no\s+products?\s+(?:were\s+)?found/i,
  /hmm.*(?:no|nothing|couldn.t)/i,
];

/* ─── Deep link check ─────────────────────────────────────────────────── */
async function deepCheck(url: string, ms = 9000): Promise<{ ok: boolean; reason: string }> {
  /* CSR retailers render results in the browser via JS — the HTML our fetch
     receives is always a shell with no product content.  Skip HTML scanning
     for these and trust HTTP status only.  Keyword quality (see cascadeLink)
     is the guard against empty results on these sites. */
  const isCsr = CSR_RETAILERS.some(d => url.includes(d));

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const res   = await fetch(url, {
      method:   isCsr ? "HEAD" : "GET",   /* HEAD for CSR — much faster, no HTML needed */
      signal:   ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control":   "no-cache",
      },
    });
    clearTimeout(timer);

    if (res.status === 404)   return { ok: false, reason: "404 Not Found" };
    if (res.status === 410)   return { ok: false, reason: "410 Gone — item removed" };
    if (res.status >= 500)    return { ok: false, reason: `Server error ${res.status}` };
    if (res.status === 403)   return { ok: true,  reason: "Bot-protected — works in browser" };
    if (res.status === 429)   return { ok: true,  reason: "Rate-limited — works in browser" };
    if (!res.ok)              return { ok: false, reason: `HTTP ${res.status}` };

    /* CSR sites: if HTTP status is good, trust it — HTML would be useless */
    if (isCsr) return { ok: true, reason: `OK (CSR — HTTP ${res.status})` };

    /* Detect homepage redirect: URL had a search query but we ended up at root */
    const finalUrl = res.url ?? "";
    if (url.includes("?") || url.includes("/search")) {
      try {
        const reqPath   = new URL(url).pathname;
        const finalPath = new URL(finalUrl).pathname;
        if (reqPath.length > 2 && finalPath === "/") {
          return { ok: false, reason: "Redirected to homepage — search lost" };
        }
      } catch { /* URL parsing failed — ignore */ }
    }

    /* Read first 8 KB to detect empty/error pages on server-rendered sites */
    const reader  = res.body?.getReader();
    let   snippet = "";
    if (reader) {
      const dec = new TextDecoder();
      let   bytes = 0;
      while (bytes < 8192) {
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
  piece:    string,
  brand:    string,
  original: string,
  isBanned  = false,
): Promise<{ url: string; step: number; source: string }> {

  const brandKey = brand.toLowerCase().trim();

  /* ── Keyword variants ────────────────────────────────────────────────
     kwBranded  = "piece brand"  — for the brand's OWN search (filters to that brand)
     kwGeneric  = simplified piece description, NO brand name, max 4 words
                  Used for all multi-brand retailers (Shopbop, Revolve, Nordstrom…)
                  Shorter = broader = always returns results.
                  e.g. "Ivory structured blazer" → "ivory structured blazer"
                       "Bias-cut slip dress in champagne" → "slip dress champagne"
                       "Wide-leg black trousers" → "wide leg black trousers"
  ──────────────────────────────────────────────────────────────────── */
  const kwBranded = `${piece} ${brand}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "+");

  const kwGeneric = piece
    .toLowerCase()
    .replace(/\b(?:in|a|an|the|with|and|for|of)\b/g, " ")  /* strip filler words */
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)                                             /* max 4 words — broad enough to return results */
    .join("+");

  /* Brand's own search URL — uses branded keywords (skip for banned brands) */
  const brandFn  = !isBanned ? BRAND_SEARCH_URLS[brandKey] : undefined;
  const brandUrl = brandFn ? brandFn(kwBranded) : null;

  /* 8-step cascade.  Banned brands skip original URL entirely.
     Multi-brand retailer steps ALL use kwGeneric to guarantee search results. */
  const candidates: Array<{ url: string; source: string }> = [
    ...(!isBanned ? [{ url: original, source: "Original" }] : []),
    ...(brandUrl && brandUrl !== original ? [{ url: brandUrl, source: `${brand} search` }] : []),
    { url: `https://www.revolve.com/r/Search.jsp?q=${kwGeneric}+women`,                    source: "Revolve" },
    { url: `https://www.ssense.com/en-us/women/search?q=${kwGeneric}`,                     source: "SSENSE" },
    { url: `https://www.farfetch.com/shopping/women/search/items.aspx?q=${kwGeneric}`,     source: "Farfetch" },
    { url: `https://www.saksfifthavenue.com/search?query=${kwGeneric}+women`,              source: "Saks Fifth Avenue" },
    { url: `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kwGeneric}+women`, source: "Nordstrom" },
  ];

  for (let i = 0; i < candidates.length; i++) {
    const { url, source } = candidates[i];
    const check = await deepCheck(url, i === 0 && !isBanned ? 9000 : 7000);
    if (check.ok) {
      return { url, step: i + 1, source };
    }
    console.log(`[link-repair] Cascade step ${i + 1} failed for "${piece}" (${source}): ${check.reason}`);
  }

  /* Absolute last resort — Nordstrom with generic piece keywords.
     Nordstrom is server-rendered and always returns results for broad queries. */
  return {
    url:    `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kwGeneric}+women`,
    step:   candidates.length + 1,
    source: "Nordstrom (guaranteed fallback)",
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

  /* ── Brief freshness check ──────────────────────────────────────── */
  {
    const { blobs: allBriefs } = await import("@vercel/blob").then(m => m.list({ prefix: "ellie-approved/" }));
    const latestBlob = allBriefs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (latestBlob) {
      const daysOld = Math.floor((Date.now() - new Date(latestBlob.uploadedAt).getTime()) / 86_400_000);
      if (daysOld > 8) {
        console.warn(`[link-repair] ⚠️ Brief is ${daysOld} days old — curator may have failed`);
        /* Alert owner about stale brief */
        const resendKey   = process.env.RESEND_API_KEY?.trim();
        const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
        const fromEmail   = process.env.RESEND_FROM_EMAIL ?? "ellie@stylebyellie.com";
        if (resendKey && notifyEmail) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from:    `Ellie Monitor <${fromEmail}>`,
            to:      notifyEmail,
            subject: `⚠️ Stale brief alert — approved brief is ${daysOld} days old`,
            html: `<div style="font-family:Arial,sans-serif;padding:24px;background:#FDF0ED;border-left:4px solid #c0392b;max-width:560px;">
              <p style="margin:0 0 12px;font-size:13px;color:#c0392b;font-weight:bold;">The approved brief is ${daysOld} days old.</p>
              <p style="margin:0 0 12px;font-size:13px;color:#2C2C2C;line-height:1.7;">
                The Sunday AI curator should run every week and produce a new brief. Something may have gone wrong.
                Check Vercel → Cron Jobs → run-curator for errors, or manually trigger it at:<br/>
                <code style="background:#eee;padding:2px 6px;">yourdomain.com/api/run-curator</code> with your CRON_SECRET header.
              </p>
              <p style="margin:0;font-size:11px;color:#8A8580;">Detected by the 6-hour link repair monitor · The Style Refresh</p>
            </div>`,
          }).catch(() => {});
        }
      }
    }
  }

  /* ── Content quality check ───────────────────────────────────────── */
  const qualityIssues: string[] = [];
  for (const look of brief.looks) {
    for (const item of (look.items ?? [])) {
      if (!item.piece?.trim())   qualityIssues.push(`Missing piece name in look "${look.label}"`);
      if (!item.brand?.trim())   qualityIssues.push(`Missing brand in look "${look.label}" for "${item.piece}"`);
      if (!item.note?.trim())    qualityIssues.push(`Missing note in look "${look.label}" for "${item.piece}"`);
      if (!item.buyLink?.trim()) qualityIssues.push(`Missing buy link in look "${look.label}" for "${item.piece}"`);
    }
  }
  if (qualityIssues.length > 0) {
    console.warn(`[link-repair] ${qualityIssues.length} content quality issue(s):`, qualityIssues);
  }

  /* ── Brand / link destination mismatch check ─────────────────────── */
  const BRAND_DOMAINS: Record<string, string> = {
    "theory":          "theory.com",
    "vince":           "vince.com",
    "reformation":     "thereformation.com",
    "anthropologie":   "anthropologie.com",
    "everlane":        "everlane.com",
    "mejuri":          "mejuri.com",
    "tory burch":      "toryburch.com",
    "adidas":          "adidas.com",
    "free people":     "freepeople.com",
    "cos":             "cos.com",
    "toteme":          "toteme-studio.com",
    "jacquemus":       "jacquemus.com",
    "ganni":           "ganni.com",
    "isabel marant":   "isabelmarant.com",
    "frame":           "frame-store.com",
    "rag & bone":      "rag-bone.com",
    "rag and bone":    "rag-bone.com",
    "club monaco":     "clubmonaco.com",
    "kate spade":      "katespade.com",
    "l'agence":        "lagence.com",
    "banana republic": "bananarepublic.gap.com",
    "staud":           "staud.clothing",
    "nanushka":        "nanushka.com",
    "ba&sh":           "ba-sh.com",
  };
  const mismatchedItems: Array<{ piece: string; brand: string; url: string; expectedDomain: string }> = [];
  /* Build a set of pieces that need forced cascade due to mismatch */
  const forceCascadeByMismatch = new Set<string>();

  for (const look of brief.looks) {
    for (const item of (look.items ?? [])) {
      if (!item.buyLink || !item.brand) continue;
      const bk       = item.brand.toLowerCase().trim();
      const expected = BRAND_DOMAINS[bk];
      if (!expected) continue;
      if (!item.buyLink.includes(expected)) {
        mismatchedItems.push({ piece: item.piece, brand: item.brand, url: item.buyLink, expectedDomain: expected });
        forceCascadeByMismatch.add(`${item.piece}||${item.brand}`);
        console.warn(`[link-repair] Mismatch: "${item.piece}" (${item.brand}) links to ${item.buyLink} — expected ${expected}`);
      }
    }
  }
  if (mismatchedItems.length > 0) {
    console.warn(`[link-repair] ${mismatchedItems.length} brand/link mismatch(es) — will force cascade`);
  }

  /* ── Build per-item ban/mismatch flags and run checks in parallel ─── */
  console.log(`[link-repair] Checking ${allItems.length} links in brief (week of ${brief.weekOf})…`);

  const checks = await Promise.all(
    allItems.map(({ item }) => {
      const bk      = item.brand.toLowerCase().trim();
      const banned  = BANNED_BRANDS.has(bk);
      const forceKey = `${item.piece}||${item.brand}`;
      /* Banned brands and mismatched links → skip deepCheck, treat as broken */
      if (banned || forceCascadeByMismatch.has(forceKey)) {
        const reason = banned
          ? `Banned brand (${item.brand}) — auto-cascade`
          : `Brand/link mismatch — auto-cascade`;
        return Promise.resolve({ ok: false, reason });
      }
      return deepCheck(item.buyLink);
    })
  );

  /* ── Cascade any failures ────────────────────────────────────────── */
  const repairs: RepairRecord[] = [];

  const cascadeResults = await Promise.all(
    allItems.map(async ({ item }, idx) => {
      const check   = checks[idx];
      if (check.ok) return null;

      const bk      = item.brand.toLowerCase().trim();
      const banned  = BANNED_BRANDS.has(bk);

      console.log(`[link-repair] Broken: "${item.piece}" (${item.brand}) — ${check.reason}`);

      /* ── Try Serper first — find exact product before falling back to cascade ── */
      const serperKey = process.env.SERPER_API_KEY?.trim();
      if (serperKey) {
        const exactUrl = await searchBestProduct(serperKey, item.piece, item.brand, item.price);
        if (exactUrl && exactUrl !== item.buyLink) {
          console.log(`[link-repair] Serper found exact product for "${item.piece}": ${exactUrl}`);
          repairs.push({
            piece:       item.piece,
            brand:       item.brand,
            originalUrl: item.buyLink,
            repairedUrl: exactUrl,
            step:        0,
            source:      "Product Hunter (exact match)",
            failReason:  check.reason,
          });
          return { lookIdx: allItems[idx].lookIdx, itemIdx: allItems[idx].itemIdx, newUrl: exactUrl };
        }
      }

      const cascade = await cascadeLink(item.piece, item.brand, item.buyLink, banned);

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

  /* ── Hero image health check ─────────────────────────────────────── */
  let heroBroken = 0;
  try {
    const { list: listBlob } = await import("@vercel/blob");
    const { blobs: heroBlobs } = await listBlob({ prefix: "ellie-hero/" });
    const heroJson = heroBlobs.find(b => b.pathname === "ellie-hero/current.json");
    if (heroJson) {
      const r = await fetch(heroJson.url, { cache: "no-store" });
      if (r.ok) {
        const heroData = await r.json() as { images?: Array<{ url: string }> };
        if (heroData?.images?.length) {
          const heroChecks = await Promise.all(
            heroData.images.map(async (img) => {
              try {
                const ctrl = new AbortController();
                setTimeout(() => ctrl.abort(), 6000);
                const hRes = await fetch(img.url, { method: "HEAD", signal: ctrl.signal });
                return hRes.ok;
              } catch { return false; }
            })
          );
          heroBroken = heroChecks.filter(ok => !ok).length;
          if (heroBroken > 0) {
            console.warn(`[link-repair] ${heroBroken} hero image(s) returning errors`);
          }
        }
      }
    }
  } catch (heroErr) {
    console.error("[link-repair] Hero image check failed (non-fatal):", heroErr);
  }

  return NextResponse.json({
    ok:           repairs.length === 0,
    repaired:     repairs.length,
    checked:      allItems.length,
    weekOf:       brief.weekOf,
    heroBroken,
    qualityIssues: qualityIssues.length,
    brandMismatches: mismatchedItems.length,
    repairs:      repairs.map(r => ({ piece: r.piece, brand: r.brand, step: r.step, source: r.source })),
  });
}

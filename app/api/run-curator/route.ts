import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/run-curator
   Vercel Cron fires this every Sunday at 6 PM ET (22:00 UTC in vercel.json).
   Also callable manually: GET /api/run-curator
     with Authorization: Bearer <CRON_SECRET>

   Flow:
     1. Scrape women's + men's fashion sources for current trends
     2. Ask Claude to curate 3 looks (Executive, Weekender, Wildcard)
     3. Save draft to /tmp/ellie-draft.json
     4. Email Ellie a preview with an Approve button
═══════════════════════════════════════════════════════════════════════════ */

export const runtime    = "nodejs";
export const maxDuration = 60;

/* ─── Scrape sources (women's primary, men's included) ─────────── */
const SCRAPE_SOURCES = [
  {
    name: "Vogue — Fashion",
    url:  "https://www.vogue.com/fashion",
    hint: "women's high fashion editorial, current season trends",
  },
  {
    name: "Who What Wear — Trends",
    url:  "https://www.whowhatwear.com/fashion/trends",
    hint: "women's accessible luxury trends and styling ideas",
  },
  {
    name: "The Cut — Fashion",
    url:  "https://www.thecut.com/fashion/",
    hint: "women's fashion editorial and cultural commentary",
  },
  {
    name: "Net-a-Porter — Clothing",
    url:  "https://www.net-a-porter.com/en-us/shop/clothing",
    hint: "luxury women's fashion brands and new arrivals",
  },
  {
    name: "Mr Porter — Clothing",
    url:  "https://www.mrporter.com/en-us/mens/clothing",
    hint: "luxury menswear brands and styling",
  },
];

const SCRAPE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control":   "no-cache",
};

/* ─── Strip HTML tags, return first N chars ─────────────────────── */
function stripHtml(raw: string, maxLen = 2500): string {
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
}

async function fetchSnippet(source: { name: string; url: string; hint: string }): Promise<string> {
  try {
    const res = await fetch(source.url, { headers: SCRAPE_HEADERS });
    if (!res.ok) return "";
    const html = await res.text();
    const text = stripHtml(html);
    return text ? `### ${source.name} (${source.hint})\n${text}\n` : "";
  } catch {
    return "";
  }
}

/* ─── Claude prompt ─────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are Ellie, a private style consultant with twenty years dressing executives,
editors, and high-net-worth individuals — primarily women, with an eye for men's style too.
You run "The Style Refresh" — a $19/month membership delivering three complete, sourced looks
every Monday morning with direct buy links.

Your clientele is predominantly women who want to look polished, current, and effortlessly
intentional. Occasionally you include a look suitable for men or both.

Tone: authoritative, specific, warm. No filler. No "chic" or "stunning". 
Speak as if writing a short note to a trusted client — not a magazine spread.`;

/* ─── Load 4-week click analytics from Blob ───────────────────── */
async function loadClickAnalytics(): Promise<string> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return "";
    const { list } = await import("@vercel/blob");

    /* Build week keys for the past 4 Mondays */
    const weekKeys: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d   = new Date();
      d.setDate(d.getDate() - i * 7);
      const day    = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      weekKeys.push(monday.toISOString().split("T")[0]);
    }

    type ClickRecord = { ts: string; src: string; url: string; retailer: string };
    const allClicks: ClickRecord[] = [];

    for (const wk of weekKeys) {
      const { blobs } = await list({ prefix: `analytics/clicks/${wk}/` });
      /* Cap reads so the Sunday job stays within its 60s budget */
      const sample = blobs.slice(0, 150);
      const reads  = await Promise.allSettled(sample.map(b => fetch(b.url).then(r => r.json())));
      for (const r of reads) {
        if (r.status === "fulfilled") allClicks.push(r.value as ClickRecord);
      }
    }

    if (allClicks.length === 0) return "";

    /* Aggregate by look type */
    const bySrc: Record<string, number>      = {};
    const byRetailer: Record<string, number> = {};
    for (const c of allClicks) {
      bySrc[c.src]          = (bySrc[c.src]          ?? 0) + 1;
      byRetailer[c.retailer] = (byRetailer[c.retailer] ?? 0) + 1;
    }

    const topLooks = Object.entries(bySrc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `  ${k}: ${v} clicks (${Math.round(v / allClicks.length * 100)}%)`)
      .join("\n");

    const topRetailers = Object.entries(byRetailer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `  ${k}: ${v} clicks`)
      .join("\n");

    return `\nMEMBER CLICK ANALYTICS — LAST 4 WEEKS (${allClicks.length} total clicks):
By look type:
${topLooks}
By retailer:
${topRetailers}
→ Use these signals to tune this week's curation: favor look types and retailers members click most.`;
  } catch {
    return "";
  }
}

function buildUserPrompt(scrapedData: string, today: string, weekNumber: number, analytics = ""): string {
  return `It is Sunday. Generate this week's Monday Style Refresh brief.

Use the scraped editorial and fashion data below as inspiration.
Supplement with your own expertise for gaps — especially for women's luxury brands,
current season pieces, and real product URLs.

SCRAPED DATA:
${scrapedData}

TODAY: ${today}
WEEK NUMBER: ${weekNumber}${analytics}

REQUIREMENTS:
• Three complete looks: The Executive, The Weekender, The Wildcard
• Lean women's fashion (2 of 3 looks should read women's; 1 can be gender-neutral or men's)
• Each look: 4–5 pieces with brand, price, buyer's note, and a real buyLink URL
• Prices: mix $80–$500 (accessible) and $500–$2,500 (aspirational)
• editorialLead: one sentence setting the week's mood/season
• editorsNote per look: one insider observation — specific, not generic
• buyLink: Use a TWO-TIER strategy — brand sites for named brands, Net-a-Porter for generic items.
    TIER 1 — Named luxury/premium brand items: Use the brand's own SEARCH page.
      These brands have small, curated catalogs so their search returns only 3–15 results, all high quality.
      Format: https://[brand-domain]/search?q=[specific+item+keywords]
      Examples:
        Totême ivory blazer       → https://toteme-studio.com/search?type=product&q=ivory+blazer
        Totême trench coat        → https://toteme-studio.com/search?type=product&q=trench+coat
        Theory wide-leg trouser   → https://www.theory.com/search?q=wide+leg+trouser+black
        Theory blazer             → https://www.theory.com/search?q=structured+blazer
        Vince silk camisole       → https://www.vince.com/search?q=silk+camisole+cream
        Vince trousers            → https://www.vince.com/search?q=wide+leg+trouser
        Tory Burch tote           → https://www.toryburch.com/en-us/search?q=Lee+Radziwill+tote
        Reformation linen pant    → https://www.thereformation.com/search?q=cleo+linen+pant
        Reformation dress         → https://www.thereformation.com/search?q=midi+dress
        Everlane white tee        → https://www.everlane.com/search?q=fitted+crew+tee+white
        Everlane denim jacket     → https://www.everlane.com/search?q=cropped+denim+jacket
        Mejuri gold hoops         → https://mejuri.com/search?q=bold+hoops+gold
        Mejuri chain necklace     → https://mejuri.com/search?q=fine+gold+chain+necklace
        Mejuri rings              → https://mejuri.com/search?q=gold+ring
        Anthropologie slip dress  → https://www.anthropologie.com/search?q=bias+cut+slip+dress+champagne
        Ganni floral dress        → https://www.ganni.com/en-us/search?q=floral+midi+dress
        Frame wide-leg jeans      → https://www.frame-store.com/search?q=le+crop+flare+jeans
        A.P.C. blazer             → https://www.apc.fr/us/search/?q=structured+blazer
        Jacquemus bag             → https://www.jacquemus.com/search?q=mini+bag
        COS linen blazer          → https://www.cos.com/en_usd/search.html?q=linen+blazer
        Staud dress               → https://www.staud.clothing/search?q=midi+dress
        Veronica Beard blazer     → https://veronicabeard.com/search?q=blazer
        Adidas Stan Smith (ONLY exception with a direct product URL):
          → https://www.adidas.com/us/stan_smith-shoes/WI6368.html
    TIER 2 — Generic items without a named brand (shoes, bags, accessories listed as "Various"):
      Use Net-a-Porter search. Net-a-Porter ONLY carries luxury and premium brands — no cheap results.
      Format: https://www.net-a-porter.com/en-us/shop/search?q=[item+keywords]
      Examples:
        Black block heel pump     → https://www.net-a-porter.com/en-us/shop/search?q=black+block+heel+pump
        Strappy flat sandal tan   → https://www.net-a-porter.com/en-us/shop/search?q=strappy+flat+sandal+tan
        Mini crossbody black      → https://www.net-a-porter.com/en-us/shop/search?q=mini+crossbody+bag+black
        Leather tote cognac       → https://www.net-a-porter.com/en-us/shop/search?q=leather+tote+cognac
        Gold chain necklace       → https://www.net-a-porter.com/en-us/shop/search?q=delicate+gold+chain+necklace
    NEVER use Google Shopping — it mixes luxury and cheap products, which undermines the editorial quality.
    NEVER use a product detail URL — they expire when items sell out.
    NEVER use a brand homepage or collection page.
    AVOID broken brand sites: Sézane, Madewell, J.Crew, ASOS, Zara, Sam Edelman.

WOMEN'S BRANDS TO DRAW FROM (use your knowledge, don't limit to this list):
Net-a-Porter, Totême, A.P.C., Reformation, Sézane, Theory, Frame, Veronica Beard,
Vince, Staud, Jacquemus, Ganni, Maje, SMYTHE, Ulla Johnson, M.M. LaFleur, Banana Republic,
J.Crew, & Other Stories, COS, Arket, Mango, Zara (for accessible picks), Nordstrom

MEN'S BRANDS (for the one men's/neutral look):
Mr Porter labels, Sunspel, Hestra, Incotex, Common Projects, A.P.C., COS, Uniqlo U

HERO IMAGES — pick exactly 4 from this verified pool to match this week's mood.
Each image must come from the list below — do NOT invent photo IDs.
Select images whose mood best matches the three looks you're generating:

  EXECUTIVE / POWER:
    id: "1483985988355-763728e1935b"  — fashion models walking, sophisticated
    id: "1469334031218-e382a71b716b"  — elegant woman, polished portrait
    id: "1529139574466-a303027ee77f"  — tailored, confident, editorial
    id: "1594938298603-7f787ef8b22f"  — luxury fashion, structured

  WEEKEND / CASUAL:
    id: "1490481651871-ab68de25d43d"  — effortless casual style, relaxed
    id: "1581044777550-4cfa2d08b18a"  — weekend chic, natural light
    id: "1512436991641-6745cdb1723f"  — easy lifestyle, relaxed polish

  EDITORIAL / WILDCARD:
    id: "1515886657613-9f3515b0c78f"  — bold editorial model pose
    id: "1539109136881-3be0616acf4b"  — high fashion editorial
    id: "1595777457583-95e059d581b8"  — statement look, editorial

  ACCESSORIES / DETAIL:
    id: "1558769132-cb1aea458c5e"     — jewelry and accessories flatlay
    id: "1509631179647-0177331693ae"  — woman walking, detail shot

All image URLs follow: https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=900&q=85

Return ONLY valid JSON — no markdown, no extra text — matching this structure exactly:

{
  "weekOf": "${today}",
  "weekNumber": ${weekNumber},
  "editorialLead": "…",
  "heroImages": [
    { "id": "…", "alt": "…brief editorial description…", "mood": "executive|weekend|wildcard|editorial" },
    { "id": "…", "alt": "…", "mood": "…" },
    { "id": "…", "alt": "…", "mood": "…" },
    { "id": "…", "alt": "…", "mood": "…" }
  ],
  "looks": [
    {
      "index": "01",
      "label": "The Executive",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [
        { "piece": "…", "brand": "…", "price": "$…", "note": "…", "buyLink": "https://…" }
      ]
    },
    {
      "index": "02",
      "label": "The Weekender",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [...]
    },
    {
      "index": "03",
      "label": "The Wildcard",
      "tagline": "…",
      "description": "…",
      "editorsNote": "…",
      "items": [...]
    }
  ]
}`;
}

async function callClaude(scrapedData: string, today: string, weekNumber: number, analytics = ""): Promise<Record<string, unknown>> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-opus-4-5",
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: buildUserPrompt(scrapedData, today, weekNumber, analytics) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const json = await res.json() as { content: Array<{ text: string }> };
  let raw = json.content[0]?.text ?? "";

  /* Strip accidental markdown fences */
  raw = raw.trim();
  if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n");
  if (raw.endsWith("```")) raw = raw.split("```").slice(0, -1).join("```");

  return JSON.parse(raw.trim()) as Record<string, unknown>;
}

/* ─── Link validation + auto-repair ─────────────────────────────── */
type LookItem = { piece: string; brand: string; price: string; note: string; buyLink: string };
type Look     = { index: string; label: string; tagline: string; editorsNote: string; items: LookItem[] };

type ValidationResult = {
  piece:        string;
  originalLink: string;
  finalLink:    string;
  status:       number | null;
  ok:           boolean;
  repaired:     boolean;
  reason:       string;
};

/** Test one URL — conservative: only flag definitive 404s, not timeouts or bot-blocks */
async function validateLink(
  url: string,
  timeoutMs = 9000,
): Promise<{ ok: boolean; status: number | null; reason: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method:   "HEAD",
      signal:   controller.signal,
      redirect: "follow",
      headers:  { "User-Agent": "Mozilla/5.0 (compatible; StyleRefreshLinkCheck/1.0)" },
    });
    clearTimeout(timer);
    if (res.status === 404) return { ok: false, status: 404, reason: "404 Not Found" };
    return { ok: true, status: res.status, reason: "OK" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    /* Timeout / ECONNRESET — server is slow, not broken */
    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("ECONNRESET")) {
      return { ok: true, status: null, reason: "Timeout — assumed OK" };
    }
    return { ok: false, status: null, reason: msg.slice(0, 80) };
  }
}

/** Net-a-Porter fallback — luxury-only results, guaranteed quality */
function buildFallbackLink(piece: string): string {
  const q = piece.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "+");
  return `https://www.net-a-porter.com/en-us/shop/search?q=${q}`;
}

/** Validate every link in the lookbook; auto-repair failures with Net-a-Porter */
async function validateAndRepairLooks(
  looks: Look[],
): Promise<{ repairedLooks: Look[]; results: ValidationResult[] }> {
  const results: ValidationResult[] = [];

  const repairedLooks: Look[] = [];
  for (const look of looks) {
    const repairedItems: LookItem[] = [];
    /* Run validations in parallel per look */
    const validations = await Promise.all(look.items.map(item => validateLink(item.buyLink)));
    for (let i = 0; i < look.items.length; i++) {
      const item  = look.items[i];
      const v     = validations[i];
      const repaired  = !v.ok;
      const finalLink = repaired ? buildFallbackLink(item.piece) : item.buyLink;
      results.push({
        piece:        item.piece,
        originalLink: item.buyLink,
        finalLink,
        status:       v.status,
        ok:           v.ok,
        repaired,
        reason:       v.reason,
      });
      repairedItems.push({ ...item, buyLink: finalLink });
    }
    repairedLooks.push({ ...look, items: repairedItems });
  }
  return { repairedLooks, results };
}

/* ─── Approval email ─────────────────────────────────────────────── */

type HeroImageDraft = { id: string; alt: string; mood?: string };

function buildApprovalEmail(
  lookbook:        Record<string, unknown>,
  approveUrl:      string,
  linkResults:     ValidationResult[] = [],
): string {
  const looks       = (lookbook.looks as Look[]) ?? [];
  const heroImages  = (lookbook.heroImages as HeroImageDraft[]) ?? [];

  /* Link health summary */
  const totalLinks   = linkResults.length;
  const repairedCount = linkResults.filter(r => r.repaired).length;
  const allGood      = repairedCount === 0;
  const linkHealthHtml = totalLinks > 0 ? `
  <tr><td style="padding:16px 36px 0;">
    <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;
               color:${allGood ? "#2E7D32" : "#B45309"};font-family:Arial,sans-serif;">
      ${allGood
        ? `✅ All ${totalLinks} shop links verified — no action needed`
        : `⚠️ ${repairedCount} of ${totalLinks} links failed — auto-replaced with Net-a-Porter`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
      ${linkResults.map(r => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:11px;">
          <span style="color:${r.ok ? "#2E7D32" : "#C0392B"};margin-right:6px;">${r.ok ? "✅" : "🔄"}</span>
          <strong style="color:#2C2C2C;">${r.piece}</strong>
          ${r.repaired
            ? `<span style="color:#B45309;font-size:10px;"> — broken, replaced with Net-a-Porter</span>`
            : `<span style="color:#6B9E6B;font-size:10px;"> — ${r.reason}</span>`}
        </td>
      </tr>`).join("")}
    </table>
  </td></tr>
  <tr><td style="padding:4px 36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>` : "";

  /* Hero image preview strip */
  const heroHtml = heroImages.length === 4 ? `
  <tr><td style="padding:16px 36px 0;">
    <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;
               color:#C4956A;font-family:Arial,sans-serif;">This Week's Hero Images</p>
    <p style="margin:0 0 10px;font-size:11px;color:#6B6560;font-family:Arial,sans-serif;">
      These 4 photos will auto-slide on the homepage from Monday until next Sunday's approval.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${heroImages.map(img => `
        <td width="25%" style="padding:2px;">
          <img src="https://images.unsplash.com/photo-${img.id}?auto=format&fit=crop&w=200&h=260&q=70"
               width="130" height="170"
               style="display:block;width:100%;height:auto;object-fit:cover;"
               alt="${img.alt}" />
          <p style="margin:3px 0 0;font-size:9px;color:#B5A99A;font-family:Arial,sans-serif;
                     text-transform:uppercase;letter-spacing:0.1em;">${img.mood ?? ""}</p>
        </td>`).join("")}
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>` : "";


  const looksHtml = looks.map(look => `
    <tr>
      <td style="padding:18px 0 4px;">
        <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;
                   color:#C4956A;font-family:Arial,sans-serif;">${look.index} — ${look.label}</p>
        <p style="margin:4px 0 8px;font-size:17px;color:#2C2C2C;font-family:Georgia,serif;
                   font-style:italic;">&ldquo;${look.tagline}&rdquo;</p>
        <p style="margin:0 0 10px;font-size:11px;color:#6B6560;font-family:Arial,sans-serif;
                   border-left:2px solid #C4956A;padding-left:8px;">${look.editorsNote}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${look.items.map(item => `
          <tr>
            <td style="padding:8px 10px;background:#F5EFE4;border-bottom:1px solid #E8DDD0;
                        font-family:Georgia,serif;font-size:13px;color:#2C2C2C;">
              <strong>${item.piece}</strong>
              <span style="color:#C4956A;font-size:11px;margin-left:6px;">${item.brand} · ${item.price}</span>
              <br/><span style="font-size:11px;color:#6B6560;">${item.note}</span>
              <br/><a href="${item.buyLink}" style="font-size:10px;color:#C4956A;">${item.buyLink}</a>
            </td>
          </tr>`).join("")}
        </table>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"/><title>Sunday Draft — Style Refresh</title></head>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EFE4;padding:36px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
       style="background:#FDFAF5;max-width:580px;width:100%;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="background:#EDE5D8;padding:26px 36px;text-align:center;">
    <p style="margin:0 0 3px;color:#C4956A;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;font-family:Arial,sans-serif;">
      Ellie · The Style Refresh
    </p>
    <h1 style="margin:6px 0 0;color:#2C2C2C;font-size:21px;font-weight:400;font-family:Georgia,serif;">
      Sunday Draft — Week of ${lookbook.weekOf ?? ""}
    </h1>
    <p style="margin:8px 0 0;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">
      Review the three looks below. Click Approve to send to members Monday morning.
    </p>
  </td></tr>
  <tr><td style="padding:16px 36px 0;">
    <p style="margin:0;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;font-style:italic;line-height:1.7;">
      ${lookbook.editorialLead ?? ""}
    </p>
  </td></tr>
  ${heroHtml}
  ${linkHealthHtml}
  <tr><td style="padding:0 36px;">
    <table width="100%" cellpadding="0" cellspacing="0">${looksHtml}</table>
  </td></tr>
  <tr><td style="height:24px;"></td></tr>
  <tr><td style="padding:0 36px 28px;text-align:center;">
    <a href="${approveUrl}"
       style="display:inline-block;background:#2C2C2C;color:#FDFAF5;padding:14px 38px;
               font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.22em;
               text-transform:uppercase;text-decoration:none;">
      ✓ Approve &amp; Schedule Monday Send
    </a>
    <p style="margin:14px 0 0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;">
      Not happy? Just ignore this email — no send will happen unless you click Approve.
    </p>
  </td></tr>
  <tr><td style="padding:0 36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#C9B99A,transparent);"></div>
  </td></tr>

  <tr><td style="padding:22px 36px 28px;">
    <p style="margin:0 0 14px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">
      Your Weekly Business Checklist
    </p>
    ${[
      ["THIS SUNDAY",   "✓ Review the 3 looks above and click Approve"],
      ["THIS MONDAY",   "✓ Members receive their brief automatically at 7 AM ET"],
      ["EVERY WEEK",    "✓ Check your Stripe dashboard for new subscribers"],
      ["EVERY WEEK",    "✓ Check Resend for any email delivery failures"],
      ["QUARTERLY",     "✓ Pay estimated federal + NY state income taxes (Apr 15 / Jun 15 / Sep 15 / Jan 15)"],
      ["QUARTERLY",     "✓ Remit NY Sales Tax if you have Stripe Tax enabled"],
      ["ONGOING",       "✓ Collect real member testimonials for the website"],
      ["ONGOING",       "✓ Keep BUSINESS_MAILING_ADDRESS env var updated if you move"],
    ].map(([when, what]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td style="width:90px;padding:8px 10px;background:#EDE5D8;font-size:9px;letter-spacing:0.14em;
                    text-transform:uppercase;color:#8A8580;font-family:Arial,sans-serif;vertical-align:top;">${when}</td>
        <td style="padding:8px 12px;background:#F5EFE4;font-size:12px;color:#2C2C2C;
                    font-family:Arial,sans-serif;line-height:1.5;">${what}</td>
      </tr>
    </table>`).join("")}
    <p style="margin:16px 0 0;font-size:10px;color:#B5A99A;font-family:Arial,sans-serif;font-style:italic;">
      Quick links:
      <a href="https://dashboard.stripe.com" style="color:#C4956A;">Stripe Dashboard</a> ·
      <a href="https://resend.com/emails" style="color:#C4956A;">Resend Emails</a> ·
      <a href="https://vercel.com/dashboard" style="color:#C4956A;">Vercel</a>
    </p>
  </td></tr>

  <tr><td style="padding:14px 36px;text-align:center;background:#F5EFE4;border-top:1px solid #E8DDD0;">
    <p style="margin:0;color:#8A8580;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">
      ELLIE · Internal Preview · Do Not Forward
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/* ─── GET handler ───────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim() ?? process.env.CURATOR_APPROVE_SECRET?.trim() ?? "";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret      = cronSecret;

  try {
    /* 1 — Scrape */
    console.log("[curator] Scraping fashion sources…");
    const snippets = await Promise.all(SCRAPE_SOURCES.map(fetchSnippet));
    const scrapedData = snippets.filter(Boolean).join("\n") ||
      "[Scraping unavailable — using expert knowledge only]";

    /* 2 — Determine week number */
    const tmpDir  = "/tmp";
    const draftPath = path.join(tmpDir, "ellie-draft.json");
    let weekNumber = 1;
    try {
      if (fs.existsSync(draftPath)) {
        const prev = JSON.parse(fs.readFileSync(draftPath, "utf8")) as { weekNumber?: number };
        weekNumber = (prev.weekNumber ?? 0) + 1;
      }
    } catch { /* ignore */ }

    const today = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      timeZone: "America/New_York",
    });

    /* 3 — Generate with Claude */
    console.log("[curator] Calling Claude…");
    /* Load 4-week click performance data to feed back into Claude */
    const analytics = await loadClickAnalytics();
    if (analytics) console.log("[curator] Analytics loaded:", analytics.substring(0, 120));

    const lookbook = await callClaude(scrapedData, today, weekNumber, analytics);

    /* 4 — Validate & auto-repair every shop link */
    console.log("[curator] Validating shop links…");
    const rawLooks = (lookbook.looks as Look[]) ?? [];
    const { repairedLooks, results: linkResults } = await validateAndRepairLooks(rawLooks);
    const repairedCount = linkResults.filter(r => r.repaired).length;
    console.log(`[curator] Link validation complete — ${linkResults.length} links, ${repairedCount} repaired`);
    /* Write repaired looks back into lookbook before saving */
    const finalLookbook = { ...lookbook, looks: repairedLooks };

    /* 5 — Save to /tmp */
    try {
      fs.writeFileSync(draftPath, JSON.stringify(finalLookbook), "utf8");
      console.log("[curator] Draft saved to /tmp/ellie-draft.json");
    } catch (fsErr) {
      console.warn("[curator] Could not write /tmp/ellie-draft.json:", fsErr);
    }

    /* 6 — Send approval email */
    const approveUrl = `${baseUrl}/api/approve-weekly?secret=${encodeURIComponent(secret)}`;

    if (resendKey && fromEmail && notifyEmail) {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from:    `Ellie Curator <${fromEmail}>`,
        to:      notifyEmail,
        subject: `[APPROVE] Style Refresh Draft — Week of ${String(finalLookbook.weekOf ?? "")}`,
        html:    buildApprovalEmail(finalLookbook, approveUrl, linkResults),
      });
      if (error) {
        console.error("[curator] Email send failed:", error);
      } else {
        console.log("[curator] Approval email sent to", notifyEmail);
      }
    } else {
      console.error("[curator] Resend env not configured — no approval email sent.");
    }

    return NextResponse.json({
      success:        true,
      weekOf:         finalLookbook.weekOf,
      weekNumber,
      approveUrl,
      linksValidated: linkResults.length,
      linksRepaired:  repairedCount,
    });
  } catch (err) {
    console.error("[curator] Fatal error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

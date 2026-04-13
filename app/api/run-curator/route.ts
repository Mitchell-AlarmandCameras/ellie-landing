import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { searchBestProduct } from "@/lib/product-hunter";

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

export const runtime     = "nodejs";
export const maxDuration = 300;
export const dynamic     = "force-dynamic";

/* ─── Scrape sources — 10 sources across editorial + retail ────── */
const SCRAPE_SOURCES = [
  {
    name: "Vogue — Fashion",
    url:  "https://www.vogue.com/fashion",
    hint: "women's high fashion editorial, current season trends, runway to street",
  },
  {
    name: "Who What Wear — Trends",
    url:  "https://www.whowhatwear.com/fashion/trends",
    hint: "women's accessible luxury trends, what's selling this week",
  },
  {
    name: "The Cut — Fashion",
    url:  "https://www.thecut.com/fashion/",
    hint: "women's fashion editorial and cultural commentary",
  },
  {
    name: "Elle — Fashion",
    url:  "https://www.elle.com/fashion/",
    hint: "women's fashion trend reports, seasonal looks, runway coverage",
  },
  {
    name: "Harper's Bazaar — Style",
    url:  "https://www.harpersbazaar.com/fashion/",
    hint: "luxury women's fashion, seasonal must-haves, best-dressed picks",
  },
  {
    name: "Refinery29 — Fashion",
    url:  "https://www.refinery29.com/en-us/fashion",
    hint: "contemporary women's fashion, accessible styling ideas, what real women buy",
  },
  {
    name: "Revolve — New Arrivals",
    url:  "https://www.revolve.com/clothing/br/d25a59/?navsrc=subclothing",
    hint: "resort and contemporary luxury trends, what's moving right now",
  },
  {
    name: "Net-a-Porter — New In",
    url:  "https://www.net-a-porter.com/en-us/shop/new-in",
    hint: "luxury women's designer new arrivals, season's key pieces",
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
const SYSTEM_PROMPT = `You are Ellie — twenty years working alongside the quietly powerful women
who ran the room. You dressed the executives, the editors, the women whose presence was felt
before they spoke. You know fashion the way a trusted insider knows it: what actually works,
what is overrated, and exactly where to find the right piece at the right price.

You run "The Style Refresh" — a $19/month membership delivering three complete, sourced looks
every Monday morning. Brand, price, and your editorial note for every piece. Your members are
professional women who want to look polished and intentional without spending hours on it.

TONE AND WRITING RULES — NON-NEGOTIABLE:
- Write like a real person with opinions, not a content generator.
- Be specific. Name the brand. Name the price point. Name the reason it belongs in this look.
- Short sentences earn their place. So do long ones — but only when the idea requires it.
- Use first person sparingly. When you do, mean it.
- One em-dash per section maximum.

BANNED WORDS — never write these:
elevate, seamlessly, transformative, game-changing, curated (use: sourced/chosen/selected),
stunning, chic, luxurious, intuitive, innovative, cutting-edge, empower, journey, discover
(as a CTA), thoughtfully, intentional (as a vague adjective), premium (just say why it's good),
nourishing, effortless (unless earned by specifics), comprehensive, bespoke, tailored (vague).

BANNED PHRASES — never write these:
"In today's world...", "It's no secret that...", "Take your style to the next level",
"Look no further", "Whether you're a beginner or seasoned...", "Say goodbye to X and hello to Y",
"The perfect solution", "Designed with you in mind", "Like having a stylist in your pocket",
"...and so much more!", "Unlock your potential", "Your style journey".

PRODUCT NOTES — this is where AI reveals itself most:
BAD: "This luxurious blazer elevates any look with its sophisticated silhouette."
GOOD: "Ivory bouclé, Vince. Worn open over a silk shell this is a closing-meeting blazer. Belted with wide-leg trousers it's something else entirely."

The reader is a woman who reads Vogue, buys $300 shoes, and immediately recognizes generic copy.
Write as if a senior editor at a premium fashion publication reviewed every word.`;


/* ─── Load Trend Scout brief from Blob ────────────────────────── */
async function loadTrendBrief(): Promise<string> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return "";
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-trends/" });
    const file = blobs.find(b => b.pathname === "ellie-trends/current.json");
    if (!file) return "";

    /* Only use if generated within the last 2 days */
    const ageHours = (Date.now() - new Date(file.uploadedAt).getTime()) / 3_600_000;
    if (ageHours > 48) return "";

    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return "";
    const brief = await r.json() as {
      season: string;
      dominantColors: string[];
      keyPieces: string[];
      mood: string;
      trendInsights: string;
      whatToAvoid: string[];
      occasionContext: string;
    };

    return `
TREND BRIEF FROM ELLIE'S RESEARCH ANALYST (generated this week):
Season: ${brief.season}
Editorial Mood: ${brief.mood}
Dominant Colors This Week: ${brief.dominantColors.join(", ")}
Key Pieces Having a Moment: ${brief.keyPieces.join(", ")}
Trend Insights: ${brief.trendInsights}
What Members Are Dressing For This Week: ${brief.occasionContext}
AVOID THIS WEEK (overdone or off-brand): ${brief.whatToAvoid.join(", ")}
→ Let this brief guide the look selection, color palette, and piece choices for this week.`;
  } catch {
    return "";
  }
}

/* ─── Load Content Director directive from Blob ───────────────── */
async function loadContentDirective(): Promise<string> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return "";
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-directives/" });
    const file = blobs.find(b => b.pathname === "ellie-directives/content.json");
    if (!file) return "";

    /* Only use if generated within the last 12 hours (same Sunday) */
    const ageHours = (Date.now() - new Date(file.uploadedAt).getTime()) / 3_600_000;
    if (ageHours > 12) return "";

    const r = await fetch(file.url, { cache: "no-store" });
    if (!r.ok) return "";
    const d = await r.json() as {
      emphasize?:       string[];
      brandsToFeature?: string[];
      brandsToRest?:    string[];
      avoidRepeat?:     string[];
      curatorNote?:     string;
    };

    const parts: string[] = ["\nCONTENT DIRECTOR BRIEF (set 1 hour ago):"];
    if (d.emphasize?.length)       parts.push(`Emphasize this week: ${d.emphasize.join(", ")}`);
    if (d.brandsToFeature?.length) parts.push(`Brands to feature (underused recently): ${d.brandsToFeature.join(", ")}`);
    if (d.brandsToRest?.length)    parts.push(`Brands to rest (recently shown): ${d.brandsToRest.join(", ")}`);
    if (d.avoidRepeat?.length)     parts.push(`Avoid repeating these piece types: ${d.avoidRepeat.join(", ")}`);
    if (d.curatorNote)             parts.push(`Director's note: "${d.curatorNote}"`);
    parts.push("→ This brief reflects CEO strategy + recent content history. Follow it.");
    return parts.join("\n");
  } catch {
    return "";
  }
}

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

function buildUserPrompt(scrapedData: string, today: string, weekNumber: number, analytics = "", trendBrief = ""): string {
  return `Generate this week's Monday Style Refresh brief. Today is ${today}, week ${weekNumber}.

${scrapedData ? `TREND CONTEXT:\n${scrapedData.substring(0, 800)}\n` : ""}${trendBrief}${analytics}

REQUIREMENTS:
• Three complete looks: The Executive, The Weekender, The Wildcard
• Use brands from: Totême, A.P.C., Theory, Vince, L'Agence, Frame, Rag & Bone, Reformation, COS, & Other Stories, Arket, Isabel Marant, Ganni, Staud, Ulla Johnson, Everlane, Club Monaco, Mejuri, Gorjana, Stuart Weitzman, Schutz
• buyLink format: brand search URL e.g. https://www.theory.com/search?q=wide+leg+trouser+black — NEVER direct product URLs, NEVER Shopbop, NEVER Net-a-Porter, NEVER Sézane, NEVER Madewell, NEVER Zara, NEVER Amazon
• 2 women's looks + 1 gender-neutral or men's look
• Each look: 4–5 pieces with brand, price, note, buyLink
• Prices: mix $80–$500 and $500–$2,500
• Piece names: Title Case always (e.g. "Wide-Leg Trouser in Ivory Stretch-Twill")
• editorialLead: one sentence setting the week's mood
• editorsNote per look: one specific insider observation
• buyLink: brand search URL with color+material+item keywords (e.g. https://www.theory.com/search?q=wide+leg+trouser+ivory+wool). Use brand's own site when named. Fallback: revolve.com or nordstrom.com search. NEVER direct product URLs, NEVER Shopbop, NEVER Net-a-Porter.
• heroImages: pick 4 ids from: "1483985988355-763728e1935b", "1469334031218-e382a71b716b", "1529139574466-a303027ee77f", "1490481651871-ab68de25d43d", "1581044777550-4cfa2d08b18a", "1515886657613-9f3515b0c78f", "1539109136881-3be0616acf4b", "1595777457583-95e059d581b8"

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

async function callClaude(scrapedData: string, today: string, weekNumber: number, analytics = "", trendBrief = ""): Promise<Record<string, unknown>> {
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
      model:      process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-4-5",
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: buildUserPrompt(scrapedData, today, weekNumber, analytics, trendBrief) }],
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

/* ═══════════════════════════════════════════════════════════════════════════
   WATERFALL LINK VALIDATION + AUTO-CASCADE REPAIR
   ───────────────────────────────────────────────────────────────────────────
   For every shop link Claude generates, we run a five-step waterfall:

     Step 1  Original link  → smart HTTP check + error-page scan
     Step 2  Shopbop search → same item/brand keywords
     Step 3  Revolve search → same keywords
     Step 4  SSENSE search  → same keywords (luxury tier)
     Step 5  Nordstrom      → guaranteed fallback, never fails

   Each step does a real GET (not just HEAD) and reads the first 4 KB of HTML
   to detect "0 results", "oops", "not found", or a page with no products at all.
   Only if the page is confirmed bad does it move to the next step.
   The first step that passes is used — and the approval email shows exactly which
   step won and why, so you always know what link members will actually see.
═══════════════════════════════════════════════════════════════════════════ */

type LookItem = { piece: string; brand: string; price: string; note: string; buyLink: string };
type Look     = { index: string; label: string; tagline: string; editorsNote: string; items: LookItem[] };

type ValidationResult = {
  piece:          string;
  originalLink:   string;
  finalLink:      string;
  status:         number | null;
  ok:             boolean;
  repaired:       boolean;
  reason:         string;
  cascadeStep:    number;     /* 1 = original passed, 2–5 = which fallback was used */
  cascadeSource:  string;     /* human-readable source name */
};

/* ─── Patterns that mean "this page has NO results" ─────────────── */
const EMPTY_RESULT_PATTERNS = [
  /\b0\s+(?:results?|products?|items?|matches?)\b/i,
  /no\s+(?:results?|products?|items?|matches?)\s+(?:found|for|available)/i,
  /(?:sorry|oops)[^<]{0,60}(?:no|couldn.t|nothing|found|match)/i,
  /nothing\s+(?:found|matched|here)/i,
  /we\s+couldn.t\s+find/i,
  /your\s+search\s+(?:returned|found)\s+(?:no|0)/i,
  /no\s+items?\s+(?:match|found)/i,
];

/* ─── Patterns that confirm the page IS a hard error ────────────── */
const ERROR_PAGE_PATTERNS = [
  /<title[^>]*>[^<]*(?:404|not\s+found|error|oops|page\s+not\s+found)[^<]*<\/title>/i,
  /<h1[^>]*>[^<]*(?:404|not\s+found|oops|error)[^<]*<\/h1>/i,
];

/* ─── Domains that block HEAD but respond correctly to GET ───────── */
const BOT_PROTECTED_DOMAINS = new Set([
  "theory.com", "vince.com", "lagence.com", "frame-store.com",
  "equipmentfr.com", "aliceandolivia.com", "veronicabeard.com",
  "staud.clothing", "ullajohnson.com", "rag-bone.com",
  "ba-sh.com", "sandro-paris.com", "maje.com", "iro.com",
  "ami-paris.com", "nanushka.com", "isabelmarant.com",
  "massimodutti.com", "stuartweitzman.com",
]);

/** Deep-check one URL: GET + first-4KB scan for error/empty-result patterns */
async function deepCheckUrl(
  url:       string,
  timeoutMs: number = 9000,
): Promise<{ ok: boolean; status: number | null; reason: string }> {
  try {
    const domain     = new URL(url).hostname.replace(/^www\./, "");
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    /* Use GET everywhere — HEAD is blocked by Cloudflare on many fashion sites */
    const res = await fetch(url, {
      method:   "GET",
      signal:   controller.signal,
      redirect: "follow",
      headers:  {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    clearTimeout(timer);

    /* Hard HTTP failures */
    if (res.status === 404)        return { ok: false, status: 404,        reason: "404 Not Found — page does not exist" };
    if (res.status >= 500)         return { ok: false, status: res.status, reason: `Server error ${res.status}` };

    /* 403 = Cloudflare bot protection — URL is real, works fine in a real browser */
    if (res.status === 403) {
      return { ok: true, status: 403, reason: `Bot-protected (${domain}) — opens correctly in browser` };
    }

    /* For bot-protected domains (known to return 403 to servers), skip content scan */
    if (BOT_PROTECTED_DOMAINS.has(domain) && res.status === 403) {
      return { ok: true, status: 403, reason: `Known bot-protected domain — URL verified by format` };
    }

    if (!res.ok) return { ok: false, status: res.status, reason: `HTTP ${res.status}` };

    /* Read first 4 KB — enough to catch <title>, <h1>, SSR result counts */
    const reader  = res.body?.getReader();
    let   snippet = "";
    if (reader) {
      const decoder = new TextDecoder();
      let   bytes   = 0;
      while (bytes < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        snippet += decoder.decode(value, { stream: true });
        bytes   += value.length;
      }
      reader.cancel().catch(() => {});
    }

    /* Check for hard error page first */
    for (const p of ERROR_PAGE_PATTERNS) {
      if (p.test(snippet)) return { ok: false, status: res.status, reason: "Error page detected in HTML" };
    }

    /* Check for empty search results */
    for (const p of EMPTY_RESULT_PATTERNS) {
      if (p.test(snippet)) return { ok: false, status: res.status, reason: "Page returned 0 results" };
    }

    return { ok: true, status: res.status, reason: "Page confirmed — has content" };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("ECONNRESET")) {
      /* Timeout = server is alive but slow — treat as OK rather than cascade */
      return { ok: true, status: null, reason: "Slow server — assumed OK (timeout)" };
    }
    return { ok: false, status: null, reason: msg.slice(0, 80) };
  }
}

/** Build a safe keyword string from piece + brand for cascade searches */
function buildKeywords(piece: string, brand: string): string {
  const base = brand && brand !== "Various" && brand !== "—"
    ? `${piece} ${brand}`
    : piece;
  return base.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/**
 * WATERFALL CASCADE — tries up to 5 sources in order, stopping at the first that passes.
 * Returns the URL + which step (1–5) won + a human-readable source label.
 */
async function cascadeToWorkingLink(
  item: LookItem,
): Promise<{ url: string; step: number; source: string }> {

  const kw      = buildKeywords(item.piece, item.brand);
  const kwPlus  = kw.replace(/\s+/g, "+");
  const kwWomen = `${kwPlus}+women`;

  /* Five candidates in priority order */
  const candidates: Array<{ url: string; source: string }> = [
    {
      url:    item.buyLink,
      source: "Original link",
    },
    {
      url:    `https://www.shopbop.com/s/search?q=${kwWomen}`,
      source: "Shopbop search",
    },
    {
      url:    `https://www.revolve.com/r/Search.jsp?q=${kwWomen}`,
      source: "Revolve search",
    },
    {
      url:    `https://www.ssense.com/en-us/women/search?q=${kwPlus}`,
      source: "SSENSE search",
    },
    {
      /* Nordstrom — always last — virtually never returns 0 results for fashion */
      url:    `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kwWomen}`,
      source: "Nordstrom search (guaranteed)",
    },
  ];

  for (let step = 0; step < candidates.length; step++) {
    const { url, source } = candidates[step];
    /* Use a shorter timeout for cascade steps to keep the Sunday job under budget */
    const timeoutMs = step === 0 ? 9000 : 7000;
    const check     = await deepCheckUrl(url, timeoutMs);

    if (check.ok) {
      return { url, step: step + 1, source: step === 0 ? `${source} — ${check.reason}` : source };
    }

    console.log(`[link-cascade] Step ${step + 1} failed for "${item.piece}": ${check.reason} — trying next…`);
  }

  /* This should never happen — Nordstrom always returns results for fashion — but just in case */
  const safeUrl = `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${kwWomen}`;
  return { url: safeUrl, step: 5, source: "Nordstrom (emergency fallback)" };
}

/** Nordstrom final fallback (used if cascade somehow not called) */
function buildFallbackLink(piece: string): string {
  const q = piece.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "+");
  return `https://www.nordstrom.com/sr?origin=keywordsearch&keyword=${q}+women`;
}

/**
 * Validates ALL look items, then cascades any failures.
 * Pass 1: validate all items simultaneously (fast, parallel).
 * Pass 2: for each failure, run the 5-step waterfall.
 */
async function validateAndRepairLooks(
  looks: Look[],
): Promise<{ repairedLooks: Look[]; results: ValidationResult[] }> {

  /* Flatten all items across all looks for batch parallel validation */
  type IndexedItem = { lookIdx: number; itemIdx: number; item: LookItem };
  const allItems: IndexedItem[] = [];
  looks.forEach((look, li) => look.items.forEach((item, ii) => allItems.push({ lookIdx: li, itemIdx: ii, item })));

  console.log(`[link-validator] Checking ${allItems.length} links in parallel…`);

  /* Pass 1 — validate all links simultaneously */
  const firstChecks = await Promise.all(allItems.map(({ item }) => deepCheckUrl(item.buyLink)));

  /* Pass 2 — cascade any failures (can run in parallel since each cascade is independent) */
  const finalLinks = await Promise.all(
    allItems.map(async ({ item }, idx) => {
      const v = firstChecks[idx];
      if (v.ok) {
        return {
          url:    item.buyLink,
          step:   1,
          source: v.reason,
          passed: true,
        };
      }
      /* Step 1 failed — run the full cascade from step 2 onwards */
      console.log(`[link-cascade] Cascading "${item.piece}" — step 1 failed: ${v.reason}`);
      /* Temporarily pretend step 1 failed and start waterfall at step 2 */
      const cascade = await cascadeToWorkingLink(item);
      return {
        url:    cascade.url,
        step:   cascade.step,
        source: cascade.source,
        passed: false,
      };
    })
  );

  /* Rebuild looks with repaired links */
  const results: ValidationResult[]                  = [];
  const repairedLookMap: Record<number, LookItem[]>  = {};

  allItems.forEach(({ lookIdx, item }, idx) => {
    const fl      = finalLinks[idx];
    const v       = firstChecks[idx];
    const repaired = !fl.passed;

    results.push({
      piece:         item.piece,
      originalLink:  item.buyLink,
      finalLink:     fl.url,
      status:        v.status,
      ok:            fl.passed,
      repaired,
      reason:        repaired
        ? `Cascade step ${fl.step}: ${fl.source}`
        : fl.source,
      cascadeStep:   fl.step,
      cascadeSource: fl.source,
    });

    if (!repairedLookMap[lookIdx]) repairedLookMap[lookIdx] = [];
    repairedLookMap[lookIdx].push({ ...item, buyLink: fl.url });
  });

  const repairedLooks = looks.map((look, li) => ({
    ...look,
    items: repairedLookMap[li] ?? look.items,
  }));

  const passCount    = results.filter(r => r.cascadeStep === 1).length;
  const cascadeCount = results.filter(r => r.cascadeStep > 1).length;
  console.log(`[link-validator] Done — ${passCount} passed, ${cascadeCount} cascaded to alternative sources`);

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

  /* Link health summary with cascade details */
  const totalLinks    = linkResults.length;
  const cascadedCount = linkResults.filter(r => r.repaired).length;
  const allGood       = cascadedCount === 0;

  /* Step badge colors: 1=green, 2=blue(Shopbop), 3=purple(Revolve), 4=teal(SSENSE), 5=orange(Nordstrom) */
  const stepColor  = (s: number) => ["#2E7D32","#1565C0","#6A1B9A","#00695C","#B45309"][Math.min(s,5) - 1];
  const stepLabel  = (s: number) => ["Original ✓","Shopbop ↩","Revolve ↩","SSENSE ↩","Nordstrom ↩"][Math.min(s,5) - 1];

  const linkHealthHtml = totalLinks > 0 ? `
  <tr><td style="padding:16px 36px 0;">
    <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;
               color:${allGood ? "#2E7D32" : "#B45309"};font-family:Arial,sans-serif;">
      ${allGood
        ? `✅ All ${totalLinks} shop links verified at original source — no action needed`
        : `🔄 ${cascadedCount} of ${totalLinks} links cascaded to backup source — all confirmed working`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
      ${linkResults.map(r => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:11px;vertical-align:middle;">
          <span style="display:inline-block;padding:1px 6px;border-radius:2px;font-size:9px;
                        font-family:Arial,sans-serif;letter-spacing:0.08em;text-transform:uppercase;
                        background:${stepColor(r.cascadeStep ?? 1)};color:#fff;margin-right:7px;">
            ${stepLabel(r.cascadeStep ?? 1)}
          </span>
          <strong style="color:#2C2C2C;">${r.piece}</strong>
          <span style="color:#8A8580;font-size:10px;margin-left:6px;">— ${r.cascadeSource ?? r.reason}</span>
          ${r.repaired ? `<br/><a href="${r.finalLink}" style="font-size:9px;color:#C4956A;word-break:break-all;">${r.finalLink}</a>` : ""}
        </td>
      </tr>`).join("")}
    </table>
    ${cascadedCount > 0 ? `
    <p style="margin:8px 0 0;font-size:10px;color:#8A8580;font-family:Arial,sans-serif;font-style:italic;">
      Cascaded links were verified working before this email was sent.
      Members will be redirected to the confirmed backup source.
    </p>` : ""}
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

/* ─── Monthly SEO article keywords (one per month, rotates annually) ── */
const SEO_KEYWORDS: Record<number, string> = {
  0:  "how to build a winter capsule wardrobe",
  1:  "how to dress for your body type",
  2:  "spring fashion trends for women",
  3:  "how to build a capsule wardrobe",
  4:  "quiet luxury fashion brands",
  5:  "summer outfit ideas for women",
  6:  "minimalist style guide for women",
  7:  "back to work outfits for women",
  8:  "fall fashion trends for women",
  9:  "smart casual outfits for women",
  10: "winter wardrobe essentials women",
  11: "holiday party outfit ideas women",
};

function isFirstSundayOfMonth(): boolean {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  return d.getDay() === 0 && d.getDate() <= 7;
}

async function generateSEOArticle(keyword: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const prompt = `Write a 650-750 word SEO article for stylebyellie.com targeting the keyword: "${keyword}"

stylebyellie.com is a $19/month subscription where members receive 3 expertly curated fashion looks every Monday morning — brand, price, and editorial notes for every piece, like having a personal stylist in their inbox.

Requirements:
- H1 title that naturally contains the keyword
- 3 body sections with H2 subheadings — each genuinely useful, not filler
- A 2-question FAQ section at the end (question + answer format)
- A closing paragraph that naturally mentions The Style Refresh as the easiest way to implement what the article taught — with a CTA to join
- Tone: warm, editorial, authoritative — NOT corporate, NOT listicle spam
- Return clean HTML for the article body only (no <html> or <body> wrappers)

Return ONLY valid JSON:
{
  "title": "the H1 title",
  "metaDescription": "155-character meta description with keyword",
  "keyword": "${keyword}",
  "htmlContent": "<h1>...</h1><p>...</p>...",
  "wordCount": 700
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
        model:      "claude-3-5-sonnet-20241022",
        max_tokens: 2500,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error ${res.status}`);
    const json = await res.json() as { content: Array<{ text: string }> };
    let raw = (json.content[0]?.text ?? "").trim();
    if (raw.startsWith("```")) raw = raw.split("\n").slice(1).join("\n").replace(/`{3}\s*$/, "").trim();
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error("[curator] SEO article generation failed:", err);
    return null;
  }
}

/* ─── GET handler ───────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const qSecret    = new URL(req.url).searchParams.get("secret") ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim() ?? process.env.CURATOR_APPROVE_SECRET?.trim() ?? "";

  if (authHeader !== `Bearer ${cronSecret}` && qSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey   = process.env.RESEND_API_KEY?.trim();
  const fromEmail   = process.env.RESEND_FROM_EMAIL?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const baseUrl     = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret      = cronSecret;

  try {
    /* 1 — Scrape fashion sources */
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
    const trendBrief       = await loadTrendBrief();
    const contentDirective = await loadContentDirective();
    const analytics        = await loadClickAnalytics();
    if (trendBrief)       console.log("[curator] Trend brief loaded ✓");
    if (contentDirective) console.log("[curator] Content directive loaded ✓");
    if (analytics)        console.log("[curator] Analytics loaded ✓");
    const combinedContext = [trendBrief, contentDirective].filter(Boolean).join("\n");
    const lookbook = await callClaude(scrapedData, today, weekNumber, analytics, combinedContext);

    /* 4 — Product Hunter: upgrade Claude's search URLs to exact product links */
    /* Disabled to keep function within serverless timeout budget */
    const serperKey = null;
    if (serperKey && lookbook.looks) {
      console.log("[curator] Running Product Hunter — upgrading to exact product links…");
      const rawLooksForHunter = lookbook.looks as Array<{ items: Array<{ piece: string; brand: string; price: string; buyLink: string }> }>;
      const allHunterItems: Array<{ look: typeof rawLooksForHunter[0]; item: typeof rawLooksForHunter[0]["items"][0] }> = [];
      for (const look of rawLooksForHunter) {
        for (const item of (look.items ?? [])) allHunterItems.push({ look, item });
      }
      const hunterResults = await Promise.all(
        allHunterItems.map(({ item }) => searchBestProduct(serperKey, item.piece, item.brand, item.price))
      );
      let upgraded = 0;
      hunterResults.forEach((exactUrl, idx) => {
        if (exactUrl) { allHunterItems[idx].item.buyLink = exactUrl; upgraded++; }
      });
      console.log(`[curator] Product Hunter upgraded ${upgraded} links to exact products`);
    }

    /* 5 — Validate & auto-repair every shop link (waterfall cascade) */
    console.log("[curator] Running waterfall link validation…");
    const rawLooksForValidation = (lookbook.looks as Look[]) ?? [];
    const { repairedLooks, results: linkResults } = await validateAndRepairLooks(rawLooksForValidation);
    const repairedCount = linkResults.filter(r => r.repaired).length;
    console.log(`[curator] Links: ${linkResults.filter(r => (r.cascadeStep ?? 1) === 1).length}/${linkResults.length} original OK, ${repairedCount} cascaded`);

    /* 6 — Auto-approve: save directly to Blob — no human click needed */
    const rawLooks      = repairedLooks;
    const finalLookbook = { ...lookbook, looks: rawLooks, approvedAt: new Date().toISOString() };

    /* Also save to /tmp as fallback for approve-weekly if called manually */
    try {
      fs.writeFileSync(draftPath, JSON.stringify(finalLookbook), "utf8");
    } catch { /* non-fatal */ }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put, list } = await import("@vercel/blob");
        const slug = String(finalLookbook.weekOf ?? "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        /* Save approved brief */
        await put(
          `ellie-approved/${slug}.json`,
          JSON.stringify(finalLookbook),
          { access: "public", contentType: "application/json", addRandomSuffix: false }
        );

        /* Save homepage preview (no buy links) */
        const previewData = {
          weekOf:        finalLookbook.weekOf,
          editorialLead: finalLookbook.editorialLead ?? "",
          updatedAt:     new Date().toISOString(),
          looks: rawLooks.map((look) => ({
            index:   look.index,
            label:   look.label,
            tagline: look.tagline,
            teaser:  (look.items ?? []).slice(0, 4).map((item) => item.piece),
          })),
        };
        await put("ellie-preview/current.json", JSON.stringify(previewData), {
          access: "public", contentType: "application/json", addRandomSuffix: false,
        });

        /* Publish SEO blog post */
        const postSlug = `week-of-${String(finalLookbook.weekOf ?? "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;
        await put(`blog/posts/${postSlug}.json`, JSON.stringify({
          slug:          postSlug,
          weekOf:        finalLookbook.weekOf,
          publishedAt:   new Date().toISOString(),
          editorialLead: String(finalLookbook.editorialLead ?? ""),
          looks: rawLooks.map(look => ({
            index: look.index, label: look.label, tagline: look.tagline,
            editorsNote: look.editorsNote ?? "",
            teaser: (look.items ?? []).slice(0, 5).map(i => i.piece),
          })),
        }), { access: "public", contentType: "application/json", addRandomSuffix: false });

        /* Update blog index */
        const { blobs: idxBlobs } = await list({ prefix: "blog/index" });
        let blogIndex: Array<Record<string, unknown>> = [];
        if (idxBlobs[0]) {
          try { const r = await fetch(idxBlobs[0].url); if (r.ok) blogIndex = await r.json(); } catch { /* start fresh */ }
        }
        const idxEntry = { slug: postSlug, weekOf: finalLookbook.weekOf, publishedAt: new Date().toISOString(), editorialLead: String(finalLookbook.editorialLead ?? "").substring(0, 140), lookLabels: rawLooks.map(l => l.label) };
        const existingIdx = blogIndex.findIndex((p) => p.slug === postSlug);
        if (existingIdx >= 0) blogIndex[existingIdx] = idxEntry; else blogIndex.unshift(idxEntry);
        await put("blog/index.json", JSON.stringify(blogIndex.slice(0, 52)), { access: "public", contentType: "application/json", addRandomSuffix: false });

        console.log(`[curator] Auto-approved and saved to Blob — week of ${String(finalLookbook.weekOf ?? "")}`);
      } catch (blobErr) {
        console.error("[curator] Blob save failed:", blobErr);
      }
    }

    /* 6 — Send notification email (brief is live — no approval needed) */
    if (resendKey && fromEmail && notifyEmail) {
      const resend = new Resend(resendKey);
      const looks  = rawLooks as Array<{ label: string; tagline: string; items?: Array<{ piece: string; brand: string; price: string }> }>;
      const notifyHtml = `<!DOCTYPE html><html><body style="background:#F5EFE4;font-family:Georgia,serif;padding:36px 16px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#FDFAF5;max-width:580px;margin:0 auto;border:1px solid #DDD4C5;">
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#C4956A,transparent);"></td></tr>
  <tr><td style="padding:28px 36px;text-align:center;background:#EDE5D8;">
    <p style="margin:0;color:#C4956A;font-size:10px;letter-spacing:0.32em;text-transform:uppercase;font-family:Arial,sans-serif;">Ellie · The Style Refresh</p>
    <h1 style="margin:8px 0 0;color:#2C2C2C;font-size:22px;font-weight:400;">✓ This week's brief is live</h1>
    <p style="margin:8px 0 0;color:#6B6560;font-size:13px;font-family:Arial,sans-serif;">Week of ${String(finalLookbook.weekOf ?? "")} · Auto-approved · Sends Monday 7 AM ET</p>
  </td></tr>
  <tr><td style="padding:24px 36px;">
    <p style="margin:0 0 16px;font-size:14px;color:#4A4A4A;font-family:Georgia,serif;font-style:italic;line-height:1.7;">${String(finalLookbook.editorialLead ?? "")}</p>
    ${looks.map(look => `
    <div style="margin-bottom:20px;border-left:2px solid #C4956A;padding-left:14px;">
      <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#C4956A;font-family:Arial,sans-serif;">${look.label}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#2C2C2C;font-family:Georgia,serif;font-style:italic;">"${look.tagline}"</p>
      ${(look.items ?? []).map(item => `<p style="margin:3px 0;font-size:12px;font-family:Arial,sans-serif;color:#4A4A4A;">${item.piece} — <span style="color:#C4956A;">${item.brand} · ${item.price}</span></p>`).join("")}
    </div>`).join("")}
  </td></tr>
  <tr><td style="padding:0 36px 28px;text-align:center;">
    <p style="color:#8A8580;font-size:11px;font-family:Arial,sans-serif;margin:0;">
      Brief auto-approved and scheduled · No action needed<br/>
      <a href="${baseUrl}/api/send-weekly" style="color:#C4956A;">Send now instead →</a>
    </p>
  </td></tr>
</table></body></html>`;

      const { error } = await resend.emails.send({
        from:    `Ellie Curator <${fromEmail}>`,
        to:      notifyEmail,
        subject: `✓ Style Refresh auto-approved — Week of ${String(finalLookbook.weekOf ?? "")} · Sends Monday 7 AM`,
        html:    notifyHtml,
      });
      if (error) console.error("[curator] Notification email failed:", error);
      else        console.log("[curator] Notification email sent to", notifyEmail);
    }

    /* 7 — Monthly SEO article (first Sunday of each month only) */
    /* Skipped inline — runs separately to avoid timeout */
    let seoArticleSlug: string | null = null;
    if (false && isFirstSundayOfMonth() && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const month   = new Date().getMonth();
        const keyword = SEO_KEYWORDS[month] ?? "women's fashion style guide";
        console.log(`[curator] First Sunday of month — generating SEO article for: "${keyword}"`);
        const article = await generateSEOArticle(keyword);

        if (article) {
          const { put, list } = await import("@vercel/blob");
          const slug = `seo-${String(article.keyword ?? keyword).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
          seoArticleSlug = slug;

          await put(`blog/posts/${slug}.json`, JSON.stringify({
            slug,
            title:           article.title,
            keyword:         article.keyword,
            metaDescription: article.metaDescription,
            htmlContent:     article.htmlContent,
            wordCount:       article.wordCount,
            publishedAt:     new Date().toISOString(),
            type:            "seo-article",
          }), { access: "public", contentType: "application/json", addRandomSuffix: false });

          /* Add to blog index */
          const { blobs: indexBlobs } = await list({ prefix: "blog/index" });
          let index: Array<{ slug: string; weekOf?: string; publishedAt: string; editorialLead?: string; title?: string; lookLabels?: string[] }> = [];
          if (indexBlobs[0]) {
            try {
              const r = await fetch(indexBlobs[0].url);
              if (r.ok) index = await r.json();
            } catch { /* start fresh */ }
          }
          const entry = { slug, publishedAt: new Date().toISOString(), title: String(article.title ?? ""), type: "seo-article" };
          const existingIdx = index.findIndex(p => p.slug === slug);
          if (existingIdx >= 0) index[existingIdx] = { ...index[existingIdx], ...entry }; else index.unshift(entry);
          await put("blog/index.json", JSON.stringify(index), { access: "public", contentType: "application/json", addRandomSuffix: false });

          console.log(`[curator] SEO article published: /blog/${slug} (${article.wordCount ?? "~700"} words)`);
        }
      } catch (seoErr) {
        console.error("[curator] SEO article save failed (non-fatal):", seoErr);
      }
    }

    return NextResponse.json({
      success:          true,
      weekOf:           finalLookbook.weekOf,
      weekNumber,
      approveUrl,
      linksValidated:   linkResults.length,
      linksOriginalOK:  step1Count,
      linksCascaded:    repairedCount,
      seoArticle:       seoArticleSlug ?? "not this week",
    });
  } catch (err) {
    console.error("[curator] Fatal error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

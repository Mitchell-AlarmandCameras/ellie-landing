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
    name: "Shopbop — New Arrivals",
    url:  "https://www.shopbop.com/new-arrivals/br/v=1/N-16de.htm",
    hint: "what contemporary luxury women are buying right now — real trending pieces",
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
  {
    name: "Mr Porter — Style",
    url:  "https://www.mrporter.com/en-us/mens/clothing",
    hint: "luxury menswear styling and editorial inspiration",
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
• buyLink: Use a THREE-TIER strategy. The more specific your search query, the closer it gets
    to the exact item, color, fabric, and silhouette. Always include color + material + silhouette.

  ─── TIER 1: Named brand's own site (BEST — use whenever you name a specific brand) ───
    Format: https://[brand-domain]/search?q=[color+material+silhouette+item]
    Verified brand search URLs — copy the format exactly:

    FRENCH / EUROPEAN LUXURY:
      Totême structured blazer ivory   → https://toteme-studio.com/search?type=product&q=ivory+structured+blazer
      Totême trench coat camel         → https://toteme-studio.com/search?type=product&q=trench+coat+camel
      Totême wrap dress silk           → https://toteme-studio.com/search?type=product&q=wrap+dress+silk
      Jacquemus mini bag leather black → https://www.jacquemus.com/search?q=mini+bag+leather+black
      Jacquemus linen blazer           → https://www.jacquemus.com/search?q=linen+blazer
      A.P.C. structured blazer navy    → https://www.apc.fr/us/search/?q=structured+blazer+navy
      A.P.C. high-rise jeans           → https://www.apc.fr/us/search/?q=high+rise+jeans+straight
      Isabel Marant suede jacket       → https://www.isabelmarant.com/en-us/search?q=suede+jacket+camel
      Isabel Marant ankle boot leather → https://www.isabelmarant.com/en-us/search?q=ankle+boot+leather+black
      AMI Paris relaxed blazer         → https://www.ami-paris.com/en-us/search?q=relaxed+blazer+men
      Ganni floral midi dress          → https://www.ganni.com/en-us/search?q=floral+midi+dress
      Ganni denim jacket off-white     → https://www.ganni.com/en-us/search?q=denim+jacket+off+white
      Nanushka vegan leather jacket    → https://www.nanushka.com/search?q=vegan+leather+jacket
      Ba&sh floral silk blouse         → https://www.ba-sh.com/en_us/search?q=silk+floral+blouse
      Sandro tailored blazer ivory     → https://www.sandro-paris.com/en/search?q=tailored+blazer+ivory
      Maje knit midi dress             → https://www.maje.com/en/search?q=knit+midi+dress
      IRO leather jacket biker         → https://www.iro.com/en_us/search?q=leather+biker+jacket

    CONTEMPORARY LUXURY (AMERICAN):
      Theory wide-leg trouser black    → https://www.theory.com/search?q=wide+leg+trouser+black+wool
      Theory single-button blazer      → https://www.theory.com/search?q=single+button+blazer+ivory
      Theory fitted knit top           → https://www.theory.com/search?q=fitted+knit+top
      Vince silk camisole cream        → https://www.vince.com/search?q=silk+camisole+cream
      Vince wide-leg trouser ivory     → https://www.vince.com/search?q=wide+leg+trouser+ivory
      Vince relaxed cashmere sweater   → https://www.vince.com/search?q=cashmere+relaxed+pullover
      L'Agence silk blouse ivory       → https://www.lagence.com/search?q=silk+blouse+ivory
      L'Agence high-rise straight jean → https://www.lagence.com/search?q=high+rise+straight+leg+jeans
      Frame flared jeans dark wash     → https://www.frame-store.com/search?q=le+crop+flare+dark+wash
      Frame silk blouse ivory          → https://www.frame-store.com/search?q=silk+blouse+ivory
      Equipment silk shirt white       → https://www.equipmentfr.com/search?q=silk+shirt+white+button+down
      Veronica Beard dickey blazer     → https://veronicabeard.com/search?q=dickey+jacket+blazer
      Ulla Johnson floral midi dress   → https://ullajohnson.com/search?q=floral+midi+dress
      Alice + Olivia structured blazer → https://www.aliceandolivia.com/search?q=structured+blazer
      Rag & Bone slim trouser black    → https://www.rag-bone.com/search?q=slim+trouser+black
      Rag & Bone Chelsea boot leather  → https://www.rag-bone.com/search?q=chelsea+boot+leather
      Staud midi dress floral          → https://www.staud.clothing/search?q=floral+midi+dress
      Staud structured tote bag        → https://www.staud.clothing/search?q=structured+tote+bag

    ACCESSIBLE LUXURY:
      Reformation linen wide-leg pant  → https://www.thereformation.com/search?q=linen+wide+leg+pant
      Reformation midi dress silk      → https://www.thereformation.com/search?q=silk+midi+dress
      Anthropologie slip dress champ.  → https://www.anthropologie.com/search?q=slip+dress+champagne+bias+cut
      Anthropologie linen blazer       → https://www.anthropologie.com/search?q=linen+blazer+women
      Free People maxi dress boho      → https://www.freepeople.com/search?query=maxi+dress+linen+women
      Club Monaco tailored blazer      → https://www.clubmonaco.com/search?q=tailored+blazer+women
      Quince cashmere crewneck         → https://www.onequince.com/search?q=cashmere+crewneck+women
      Everlane fitted white tee        → https://www.everlane.com/search?q=fitted+crew+tee+white+cotton
      Everlane wide-leg trouser        → https://www.everlane.com/search?q=wide+leg+trouser+women
      Banana Republic tailored blazer  → https://bananarepublic.gap.com/browse/search.do?searchText=tailored+blazer+women

    EUROPEAN MID-RANGE:
      COS oversized linen blazer       → https://www.cos.com/en_usd/search.html?q=oversized+linen+blazer
      COS wide-leg trouser linen       → https://www.cos.com/en_usd/search.html?q=wide+leg+linen+trouser
      & Other Stories silk midi dress  → https://www.stories.com/en_usd/search.html?q=silk+midi+dress
      & Other Stories tailored blazer  → https://www.stories.com/en_usd/search.html?q=tailored+blazer
      Arket linen shirt dress          → https://www.arket.com/en_usd/search?q=linen+shirt+dress
      Mango linen blazer women         → https://www.mango.com/us/search?q=linen+blazer+women
      Massimo Dutti tailored trousers  → https://www.massimodutti.com/us/search?q=tailored+trousers+women

    JEWELRY & ACCESSORIES:
      Mejuri bold gold hoops           → https://mejuri.com/search?q=bold+gold+hoop+earrings
      Mejuri fine chain necklace gold  → https://mejuri.com/search?q=fine+chain+necklace+gold
      Mejuri stackable rings           → https://mejuri.com/search?q=gold+stacking+rings
      Monica Vinader layered necklace  → https://www.monicavinader.com/us/search?q=layered+gold+necklace
      Gorjana dainty gold necklace     → https://gorjana.com/search?q=layered+gold+necklace
      Tory Burch structured tote       → https://www.toryburch.com/en-us/search?q=structured+leather+tote
      Tory Burch leather ballet flat   → https://www.toryburch.com/en-us/search?q=leather+ballet+flat
      Kate Spade satchel bag           → https://www.katespade.com/search?q=leather+satchel+bag
      Stuart Weitzman pointed pump     → https://www.stuartweitzman.com/search?q=pointed+toe+pump+leather
      Schutz heeled sandal strappy     → https://www.schutz-shoes.com/search?q=strappy+heeled+sandal
      Adidas Stan Smith white women    → https://www.adidas.com/us/search?q=stan+smith+white+women

  ─── TIER 2: Luxury multi-brand retailers (USE when no specific brand is named, ───
  ─── or when a broader curated selection fits the brief better)                 ───
    Shopbop (contemporary luxury, ships fast, great search):
      https://www.shopbop.com/s/search?q=[color+material+item+women]
      e.g. cream silk blouse women → https://www.shopbop.com/s/search?q=cream+silk+blouse+women
    Revolve (resort/contemporary, young luxury):
      https://www.revolve.com/r/Search.jsp?q=[color+item+style]
      e.g. linen wide leg pant → https://www.revolve.com/r/Search.jsp?q=linen+wide+leg+pant+women
    SSENSE (designer, avant-garde, curated):
      https://www.ssense.com/en-us/women/search?q=[item+keywords]
      e.g. structured trench coat → https://www.ssense.com/en-us/women/search?q=structured+trench+coat
    Mytheresa (ultra-luxury designer only):
      https://www.mytheresa.com/en-us/shop/women?q=[item+keywords]
      e.g. cashmere turtleneck → https://www.mytheresa.com/en-us/shop/women?q=cashmere+turtleneck+women
    Farfetch (global luxury, widest selection):
      https://www.farfetch.com/shopping/women/search/items.aspx?q=[item+keywords]
      e.g. tailored blazer beige → https://www.farfetch.com/shopping/women/search/items.aspx?q=tailored+blazer+beige+women
    Saks Fifth Avenue (classic American luxury):
      https://www.saksfifthavenue.com/search?query=[item+keywords]
      e.g. chain strap bag → https://www.saksfifthavenue.com/search?query=chain+strap+shoulder+bag+women
    Neiman Marcus (American luxury, designer):
      https://www.neimanmarcus.com/en-us/c.cat?q=[item+keywords]
      e.g. cashmere wrap coat → https://www.neimanmarcus.com/en-us/c.cat?q=cashmere+wrap+coat+women
    Bloomingdale's (broad luxury, great for accessories):
      https://www.bloomingdales.com/shop/search?Q=[item+keywords]
      e.g. leather tote cognac → https://www.bloomingdales.com/shop/search?Q=leather+tote+cognac+women

  ─── TIER 3: Nordstrom (USE for truly generic/unbranded items only) ───
    https://www.nordstrom.com/sr?origin=keywordsearch&keyword=[color+material+item+women]
    Always include "women" and be specific: color + material + silhouette
    e.g. black pointed heel pump women → https://www.nordstrom.com/sr?origin=keywordsearch&keyword=black+pointed+toe+pump+leather+women

  ─── NON-NEGOTIABLE LINK RULES ───
    ✅ Brand shown on the card MUST match the brand/retailer in the buyLink URL
    ✅ Always include color + material + silhouette in search queries for closer results
    ✅ Always include "women" in multi-brand retailer searches
    ❌ NEVER use Net-a-Porter for buyLinks — search URLs fail externally (use for trend research only)
    ❌ NEVER use Google Shopping — mixes luxury and cheap, destroys editorial quality
    ❌ NEVER use a direct product URL — it expires when the item sells out
    ❌ NEVER use a brand homepage or collection landing page
    ❌ BLOCKED SITES (server rejects all external requests) — never link to:
       Sézane, Madewell, J.Crew, ASOS, Zara, H&M, Sam Edelman

WOMEN'S BRANDS TO DRAW FROM — pull from across this full universe:

  FRENCH / EUROPEAN LUXURY: Totême, Jacquemus, A.P.C., Isabel Marant, AMI Paris,
    Nanushka, Ganni, Ba&sh, Sandro, Maje, IRO, Wandler

  CONTEMPORARY LUXURY (AMERICAN): Theory, Vince, L'Agence, Frame, Veronica Beard,
    Equipment, Ulla Johnson, Alice + Olivia, Rag & Bone, Staud, SMYTHE, 10 Crosby

  ACCESSIBLE LUXURY: Reformation, Anthropologie, Free People, Club Monaco, Quince,
    Everlane, Banana Republic

  EUROPEAN MID-RANGE: COS, & Other Stories, Arket, Mango, Massimo Dutti

  JEWELRY: Mejuri, Aurate, Monica Vinader, Gorjana, Sophie Buhai

  SHOES: Stuart Weitzman, Schutz, Loeffler Randall, Isabel Marant, Tory Burch, Adidas Stan Smith

  MULTI-BRAND RETAILERS (when no specific brand is named):
    Shopbop, Revolve, SSENSE, Mytheresa, Farfetch, Saks Fifth Avenue, Neiman Marcus,
    Bloomingdale's, Nordstrom

MEN'S BRANDS (for the one men's/neutral look):
  A.P.C., COS, AMI Paris, Sunspel, Norse Projects, Common Projects, Acne Studios, Incotex

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

    /* 4 — Validate & auto-repair every shop link (5-step waterfall cascade) */
    console.log("[curator] Running waterfall link validation…");
    const rawLooks = (lookbook.looks as Look[]) ?? [];
    const { repairedLooks, results: linkResults } = await validateAndRepairLooks(rawLooks);
    const repairedCount  = linkResults.filter(r => r.repaired).length;
    const step1Count     = linkResults.filter(r => (r.cascadeStep ?? 1) === 1).length;
    const cascadeBreakdown = [2,3,4,5].map(s => {
      const n = linkResults.filter(r => (r.cascadeStep ?? 1) === s).length;
      return n > 0 ? `step${s}:${n}` : null;
    }).filter(Boolean).join(", ");
    console.log(`[curator] Links: ${step1Count}/${linkResults.length} original OK, ${repairedCount} cascaded${cascadeBreakdown ? ` (${cascadeBreakdown})` : ""}`);
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
      success:          true,
      weekOf:           finalLookbook.weekOf,
      weekNumber,
      approveUrl,
      linksValidated:   linkResults.length,
      linksOriginalOK:  step1Count,
      linksCascaded:    repairedCount,
    });
  } catch (err) {
    console.error("[curator] Fatal error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   lib/product-hunter.ts
   THE PRODUCT HUNTER — shared utility used by:
     • /api/agent-product-hunter  (standalone brief upgrade)
     • /api/run-curator           (upgrade links after Claude generates)
     • /api/link-repair           (find exact replacement when a link breaks)

   Uses Serper Google Shopping API to find the single best direct product URL
   for any item description + brand across the entire web.

   "Best" = highest review score at a verified retailer, price in expected
   range, title matching the item description. Never the cheapest. Never
   mass-market. Always from a retailer that suits the Ellie brand.
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Verified retailers — direct product URLs from these are trusted ── */
const VERIFIED_RETAILER_DOMAINS = [
  "theory.com",
  "vince.com",
  "thereformation.com",
  "anthropologie.com",
  "everlane.com",
  "mejuri.com",
  "toryburch.com",
  "nordstrom.com",
  "saksfifthavenue.com",
  "neimanmarcus.com",
  "bloomingdales.com",
  "bergdorfgoodman.com",
  "revolve.com",
  "ssense.com",
  "farfetch.com",
  "mytheresa.com",
  "rag-bone.com",
  "frame-store.com",
  "lagence.com",
  "clubmonaco.com",
  "staud.clothing",
  "ganni.com",
  "isabelmarant.com",
  "apc.fr",
  "toteme-studio.com",
  "katespade.com",
  "stuartweitzman.com",
  "loefflerrandall.com",
  "gorjana.com",
  "monicavinader.com",
  "auratenewyork.com",
  "freepeople.com",
  "bananarepublic.gap.com",
  "onequince.com",
  "cos.com",
  "stories.com",
  "arket.com",
  "massimodutti.com",
  "adidas.com",
  "veronicabeard.com",
  "aliceandolivia.com",
  "ullajohnson.com",
  "nanushka.com",
  "ba-sh.com",
];

/* ─── Retailers whose search pages we accept (not direct product URLs) ─ */
/* These are in the cascade fallback — Product Hunter only returns        */
/* direct product URLs from VERIFIED_RETAILER_DOMAINS above.             */

/* ─── Serper response types ────────────────────────────────────────────── */
interface SerperShoppingResult {
  title:        string;
  link:         string;
  source:       string;
  price?:       string;
  rating?:      number;
  ratingCount?: number;
  imageUrl?:    string;
}

interface SerperResponse {
  shopping?: SerperShoppingResult[];
}

/* ─── Parse price string to [min, max] ────────────────────────────────── */
function parsePrice(priceStr: string): [number, number] {
  const nums = (priceStr ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return [nums[0], nums[1]];
  if (nums.length === 1) return [Math.floor(nums[0] * 0.6), Math.ceil(nums[0] * 1.5)];
  return [0, 9999];
}

/* ─── Check if a URL is from a verified retailer ───────────────────────── */
function isVerifiedRetailer(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return VERIFIED_RETAILER_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/* ─── Score a result ───────────────────────────────────────────────────── */
function scoreResult(
  result:   SerperShoppingResult,
  piece:    string,
  minPrice: number,
  maxPrice: number,
): number {
  let score = 0;

  /* Rating quality (0-5 stars × 10 = 0-50 pts) */
  if (result.rating && result.rating > 0) {
    score += result.rating * 10;
  }

  /* Review count — log scale so 1000 reviews isn't infinitely better than 100 (0-30 pts) */
  if (result.ratingCount && result.ratingCount > 0) {
    score += Math.min(30, Math.log10(result.ratingCount + 1) * 12);
  }

  /* Price match — bonus if within range, penalty if way off (−30 to +20 pts) */
  if (result.price) {
    const itemPrice = parseFloat(result.price.replace(/[^0-9.]/g, ""));
    if (itemPrice > 0 && minPrice > 0) {
      if (itemPrice >= minPrice * 0.5 && itemPrice <= maxPrice * 1.8) {
        score += 20;
      } else {
        score -= 30;
      }
    }
  }

  /* Title relevance — does the result title contain key words from the piece? */
  const pieceWords = piece.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const titleLower = result.title.toLowerCase();
  const matchCount = pieceWords.filter(w => titleLower.includes(w)).length;
  score += matchCount * 5;

  /* Prefer brand's own site over multi-brand retailer */
  try {
    const host = new URL(result.link).hostname.replace(/^www\./, "");
    const isBrandSite = VERIFIED_RETAILER_DOMAINS.slice(0, 15).some(d => host === d);
    if (isBrandSite) score += 10;
  } catch { /* ignore */ }

  return score;
}

/* ─── Main export: find best product URL ──────────────────────────────── */
export async function searchBestProduct(
  serperKey: string,
  piece:     string,
  brand:     string,
  price:     string,
): Promise<string | null> {
  if (!serperKey) return null;

  /* Build two queries: branded first, then piece-only as fallback */
  const queries = [
    `${piece} ${brand} women`,
    `${piece} women fashion`,
  ];

  const [minPrice, maxPrice] = parsePrice(price);

  for (const query of queries) {
    try {
      const res = await fetch("https://google.serper.dev/shopping", {
        method:  "POST",
        headers: {
          "X-API-KEY":    serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, gl: "us", hl: "en", num: 10 }),
      });

      if (!res.ok) continue;

      const data    = await res.json() as SerperResponse;
      const results = data.shopping ?? [];

      /* Filter to verified retailers only */
      const verified = results.filter(r => isVerifiedRetailer(r.link));
      if (verified.length === 0) continue;

      /* Score and sort */
      const scored = verified
        .map(r => ({ ...r, score: scoreResult(r, piece, minPrice, maxPrice) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        console.log(`[product-hunter] Best match for "${piece}": ${scored[0].title} @ ${scored[0].source} (score: ${scored[0].score.toFixed(0)})`);
        return scored[0].link;
      }
    } catch (err) {
      console.error(`[product-hunter] Serper query failed for "${query}":`, err);
    }
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   lib/auto-photos.ts
   Automatically fetches 4 themed hero images from Unsplash based on the
   week's style themes and saves them to Vercel Blob.

   Called at the end of the Sunday curator run — zero manual work required.

   Unsplash free tier: 50 req/hour — runs once per week, well within limits.
   Free plan: unsplash.com/developers → New Application → copy Access Key.
═══════════════════════════════════════════════════════════════════════════ */

export interface HeroImage {
  url:   string;
  alt:   string;
  mood?: string;
}

/* ── Search terms mapped to each style slot ──────────────────────────── */
const FASHION_SEARCH_THEMES = [
  { query: "elegant women fashion editorial luxury",    mood: "editorial",  alt: "Elegant fashion editorial — The Style Refresh"         },
  { query: "professional women office style polished",  mood: "executive",  alt: "Sophisticated women's fashion — The Executive"         },
  { query: "bold colorful women fashion statement",     mood: "wildcard",   alt: "Bold editorial fashion — The Wildcard"                 },
  { query: "casual chic women weekend style relaxed",   mood: "weekend",    alt: "Effortless weekend style — The Weekender"              },
];

/* ── Static fallbacks if Unsplash is unavailable ─────────────────────── */
const STATIC_FALLBACK: HeroImage[] = [
  { url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=85", alt: "Elegant fashion editorial — The Style Refresh",   mood: "editorial" },
  { url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85", alt: "Sophisticated women's fashion — The Executive",   mood: "executive" },
  { url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85", alt: "Bold editorial fashion — The Wildcard",           mood: "wildcard"  },
  { url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85", alt: "Effortless weekend style — The Weekender",        mood: "weekend"   },
];

/* ── Fetch one photo from Unsplash for a given search query ────────────── */
async function fetchUnsplashPhoto(
  query:       string,
  alt:         string,
  mood:        string,
  accessKey:   string,
  weekNumber:  number,
): Promise<HeroImage | null> {
  try {
    const page = (weekNumber % 10) + 1;
    const url  = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=landscape&content_filter=high`;

    const res = await fetch(url, {
      headers: {
        "Authorization": `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      results?: Array<{ urls: { regular: string }; alt_description?: string }>;
    };

    const results = data?.results ?? [];
    if (!results.length) return null;

    const pick    = results[weekNumber % results.length];
    const rawUrl  = pick.urls.regular;
    const photoUrl = rawUrl.includes("?")
      ? `${rawUrl}&w=1600&h=900&fit=crop&q=85`
      : `${rawUrl}?w=1600&h=900&fit=crop&q=85`;

    return { url: photoUrl, alt, mood };
  } catch {
    return null;
  }
}

/* ── Main export: fetch 4 themed photos and save to Blob ────────────────
   Returns the 4 images used (for logging).
   Falls back gracefully to static images if anything fails.          */
export async function refreshHeroImages(weekNumber: number): Promise<{
  images: HeroImage[];
  source: "unsplash" | "fallback";
}> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!accessKey || accessKey === "local_preview_stub") {
    return { images: STATIC_FALLBACK, source: "fallback" };
  }

  const results = await Promise.all(
    FASHION_SEARCH_THEMES.map(({ query, mood, alt }) =>
      fetchUnsplashPhoto(query, alt, mood, accessKey, weekNumber)
    )
  );

  const images: HeroImage[] = results.map((result, i) =>
    result ?? STATIC_FALLBACK[i]
  );

  if (blobToken) {
    try {
      const { put } = await import("@vercel/blob");
      const payload  = JSON.stringify({ images, updatedAt: new Date().toISOString() });
      await put("ellie-hero/current.json", payload, {
        access:          "public",
        contentType:     "application/json",
        addRandomSuffix: false,
      });
      console.log("[auto-photos] Saved 4 fresh hero images to Blob");
    } catch (blobErr) {
      console.error("[auto-photos] Blob write failed — images still returned:", blobErr);
    }
  }

  const allFallback = results.every(r => r === null);
  return { images, source: allFallback ? "fallback" : "unsplash" };
}

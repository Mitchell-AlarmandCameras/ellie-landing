/* ═══════════════════════════════════════════════════════════════════════════
   lib/auto-photos.ts — The Style Refresh (Fashion)
   Fetches fresh hero + look-card images from Unsplash every week.
   Saves to ellie-hero/fashion-current.json (NOT shared with skincare).
   Called automatically at the end of every Sunday curator run.
═══════════════════════════════════════════════════════════════════════════ */

export interface HeroImage {
  url:   string;
  alt:   string;
  mood?: string;
}

/* ── 4 hero carousel themes (landscape, full-bleed) ─────────────────── */
const HERO_THEMES = [
  { query: "elegant women fashion editorial luxury",    mood: "editorial", alt: "Elegant fashion editorial — The Style Refresh"     },
  { query: "professional women office style polished",  mood: "executive", alt: "Sophisticated women's fashion — The Executive"     },
  { query: "bold colorful women fashion statement",     mood: "wildcard",  alt: "Bold editorial fashion — The Wildcard"             },
  { query: "casual chic women weekend style relaxed",   mood: "weekend",   alt: "Effortless weekend style — The Weekender"          },
];

/* ── 3 look-card themes (portrait, card-sized) ───────────────────────── */
const LOOK_THEMES = [
  { query: "executive women fashion power suit tailored polished", mood: "executive", alt: "The Executive — The Style Refresh" },
  { query: "casual chic women weekend outfit relaxed effortless",  mood: "weekend",   alt: "The Weekender — The Style Refresh" },
  { query: "bold statement fashion editorial women striking",       mood: "wildcard",  alt: "The Wildcard — The Style Refresh"  },
];

/* ── Static fallbacks ─────────────────────────────────────────────────── */
const HERO_FALLBACK: HeroImage[] = [
  { url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=85", alt: "Elegant fashion editorial — The Style Refresh",   mood: "editorial" },
  { url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85", alt: "Sophisticated women's fashion — The Executive",   mood: "executive" },
  { url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85", alt: "Bold editorial fashion — The Wildcard",           mood: "wildcard"  },
  { url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85", alt: "Effortless weekend style — The Weekender",        mood: "weekend"   },
];

const LOOK_FALLBACK: HeroImage[] = [
  { url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=400&q=80", alt: "The Executive — The Style Refresh",  mood: "executive" },
  { url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=400&q=80", alt: "The Weekender — The Style Refresh",  mood: "weekend"   },
  { url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&h=400&q=80", alt: "The Wildcard — The Style Refresh",   mood: "wildcard"  },
];

async function fetchUnsplashPhoto(
  query:      string,
  alt:        string,
  mood:       string,
  accessKey:  string,
  weekNumber: number,
  orientation: "landscape" | "portrait" = "landscape",
): Promise<HeroImage | null> {
  try {
    const page = (weekNumber % 10) + 1;
    const url  = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=${orientation}&content_filter=high`;
    const res  = await fetch(url, {
      headers: { "Authorization": `Client-ID ${accessKey}`, "Accept-Version": "v1" },
    });
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ urls: { regular: string } }> };
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

export async function refreshHeroImages(weekNumber: number): Promise<{
  images:     HeroImage[];
  lookImages: HeroImage[];
  source:     "unsplash" | "fallback";
}> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!accessKey || accessKey === "local_preview_stub") {
    return { images: HERO_FALLBACK, lookImages: LOOK_FALLBACK, source: "fallback" };
  }

  /* Fetch hero + look images in parallel */
  const [heroResults, lookResults] = await Promise.all([
    Promise.all(HERO_THEMES.map(t => fetchUnsplashPhoto(t.query, t.alt, t.mood, accessKey, weekNumber, "landscape"))),
    Promise.all(LOOK_THEMES.map(t => fetchUnsplashPhoto(t.query, t.alt, t.mood, accessKey, weekNumber + 1, "portrait"))),
  ]);

  const images:     HeroImage[] = heroResults.map((r, i) => r ?? HERO_FALLBACK[i]);
  const lookImages: HeroImage[] = lookResults.map((r, i) => r ?? LOOK_FALLBACK[i]);

  if (blobToken) {
    try {
      const { put } = await import("@vercel/blob");
      await put(
        "ellie-hero/fashion-current.json",
        JSON.stringify({ images, lookImages, updatedAt: new Date().toISOString() }),
        { access: "public", contentType: "application/json", addRandomSuffix: false },
      );
      console.log("[auto-photos] Fashion hero + look images saved to Blob");
    } catch (e) {
      console.error("[auto-photos] Blob write failed:", e);
    }
  }

  const allFallback = heroResults.every(r => r === null);
  return { images, lookImages, source: allFallback ? "fallback" : "unsplash" };
}

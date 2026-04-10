import { NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/hero-images
   Returns the 4 hero carousel images for the current week.
   - Reads from Vercel Blob: ellie-hero/current.json
   - Falls back to the 4 default editorial images if no Blob data
   - Updated every Sunday when Ellie approves the weekly brief
═══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HeroImage {
  url:   string;
  alt:   string;
  mood?: string;
}

const FALLBACK: HeroImage[] = [
  {
    url:  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=85",
    alt:  "Elegant fashion editorial — The Style Refresh",
    mood: "editorial",
  },
  {
    url:  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85",
    alt:  "Sophisticated women's fashion — The Executive",
    mood: "executive",
  },
  {
    url:  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85",
    alt:  "Bold editorial fashion — The Wildcard",
    mood: "wildcard",
  },
  {
    url:  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85",
    alt:  "Effortless weekend style — The Weekender",
    mood: "weekend",
  },
];

export async function GET() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ images: FALLBACK, source: "fallback" });
    }

    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-hero/" });
    const current = blobs.find(b => b.pathname === "ellie-hero/current.json");

    if (!current) {
      return NextResponse.json({ images: FALLBACK, source: "fallback" });
    }

    const res = await fetch(current.url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ images: FALLBACK, source: "fallback" });

    const data = await res.json() as { images?: HeroImage[] };
    if (data?.images?.length === 4) {
      return NextResponse.json({ images: data.images, source: "blob" });
    }

    return NextResponse.json({ images: FALLBACK, source: "fallback" });
  } catch {
    return NextResponse.json({ images: FALLBACK, source: "fallback" });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HeroImage { url: string; alt: string; mood?: string; }

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

export async function GET() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ images: HERO_FALLBACK, lookImages: LOOK_FALLBACK, source: "fallback" });
    }

    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-hero/" });
    /* Use fashion-specific key — never reads skincare photos */
    const current = blobs.find(b => b.pathname === "ellie-hero/fashion-current.json");

    if (!current) {
      return NextResponse.json({ images: HERO_FALLBACK, lookImages: LOOK_FALLBACK, source: "fallback" });
    }

    const res  = await fetch(current.url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ images: HERO_FALLBACK, lookImages: LOOK_FALLBACK, source: "fallback" });

    const data = await res.json() as { images?: HeroImage[]; lookImages?: HeroImage[] };
    const images     = data?.images?.length     === 4 ? data.images     : HERO_FALLBACK;
    const lookImages = data?.lookImages?.length === 3 ? data.lookImages : LOOK_FALLBACK;

    return NextResponse.json({ images, lookImages, source: "blob" });
  } catch {
    return NextResponse.json({ images: HERO_FALLBACK, lookImages: LOOK_FALLBACK, source: "fallback" });
  }
}

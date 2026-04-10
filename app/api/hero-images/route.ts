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
    url:  "https://images.unsplash.com/photo-1594938298603-7f787ef8b22f?auto=format&fit=crop&w=900&q=85",
    alt:  "Luxe tailored fashion editorial — The Style Refresh",
    mood: "executive",
  },
  {
    url:  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85",
    alt:  "Elevated street style editorial",
    mood: "editorial",
  },
  {
    url:  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=85",
    alt:  "Polished women's fashion — The Weekender",
    mood: "weekend",
  },
  {
    url:  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=900&q=85",
    alt:  "Luxury accessories and fine jewelry detail",
    mood: "accessories",
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

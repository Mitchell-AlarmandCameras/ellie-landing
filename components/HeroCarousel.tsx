"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════
   HeroCarousel — auto-sliding editorial image carousel for the hero.
   - Fades between 4 images every 4 seconds
   - Fetches weekly images from /api/hero-images (Vercel Blob)
   - Falls back to 4 curated Unsplash fashion photos if no Blob data
   - Silent, no controls, full-coverage — Net-a-Porter style
═══════════════════════════════════════════════════════════════════════ */

export interface HeroImage {
  url:   string;
  alt:   string;
  mood?: string;
}

/* ── Verified fallback pool — all 4 confirmed working in production ── */
const FALLBACK_IMAGES: HeroImage[] = [
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

const INTERVAL_MS = 4000;

export default function HeroCarousel() {
  const [images,  setImages]  = useState<HeroImage[]>(FALLBACK_IMAGES);
  const [current, setCurrent] = useState(0);
  const [fading,  setFading]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Fetch weekly images from Blob */
  useEffect(() => {
    fetch("/api/hero-images")
      .then(r => r.ok ? r.json() : null)
      .then((data: { images?: HeroImage[] } | null) => {
        if (data?.images?.length === 4) setImages(data.images);
      })
      .catch(() => { /* silently keep fallback */ });
  }, []);

  /* Auto-advance with fade */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % images.length);
        setFading(false);
      }, 600);
    }, INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length]);

  const img = images[current] ?? FALLBACK_IMAGES[0];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>

      {/* Images — cross-fade via opacity */}
      {images.map((image, i) => (
        <div
          key={image.url}
          style={{
            position:   "absolute",
            inset:      0,
            opacity:    i === current && !fading ? 1 : 0,
            transition: "opacity 0.8s ease-in-out",
            zIndex:     i === current ? 1 : 0,
          }}
        >
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 20%" }}
            priority={i === 0}
          />
        </div>
      ))}

      {/* Slide indicator dots — bottom center */}
      <div
        style={{
          position:  "absolute",
          bottom:    "32px",
          left:      "50%",
          transform: "translateX(-50%)",
          display:   "flex",
          gap:       "8px",
          zIndex:    4,
        }}
      >
        {images.map((_, i) => (
          <div
            key={i}
            style={{
              width:        i === current ? "22px" : "6px",
              height:       "3px",
              background:   i === current ? "rgba(253,250,245,0.95)" : "rgba(253,250,245,0.35)",
              transition:   "all 0.4s ease",
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      {/* Photo credit */}
      <div style={{ position: "absolute", bottom: "14px", right: "18px", zIndex: 4 }}>
        <p style={{
          margin: 0, color: "rgba(253,250,245,0.4)",
          fontSize: "8px", letterSpacing: "0.2em",
          textTransform: "uppercase", fontFamily: "Inter, sans-serif",
        }}>
          Photo: Unsplash
        </p>
      </div>
    </div>
  );
}

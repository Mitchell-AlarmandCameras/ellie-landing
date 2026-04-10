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

/* ── Verified fallback pool — used when Blob has no weekly images ── */
const FALLBACK_IMAGES: HeroImage[] = [
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
    <div
      style={{
        position:     "relative",
        width:        "100%",
        height:       "100%",
        minHeight:    "420px",
        overflow:     "hidden",
        background:   "var(--cream-dark)",
      }}
    >
      {/* Images — cross-fade via opacity */}
      {images.map((image, i) => (
        <div
          key={image.url}
          style={{
            position:   "absolute",
            inset:      0,
            opacity:    i === current && !fading ? 1 : i === current && fading ? 0 : 0,
            transition: "opacity 0.6s ease-in-out",
            zIndex:     i === current ? 1 : 0,
          }}
        >
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 44vw, 0px"
            style={{ objectFit: "cover", objectPosition: "center top" }}
            priority={i === 0}
          />
        </div>
      ))}

      {/* Slide indicator dots */}
      <div
        style={{
          position:       "absolute",
          bottom:         "48px",
          left:           "50%",
          transform:      "translateX(-50%)",
          display:        "flex",
          gap:            "6px",
          zIndex:         3,
        }}
      >
        {images.map((_, i) => (
          <div
            key={i}
            style={{
              width:        i === current ? "18px" : "6px",
              height:       "3px",
              background:   i === current ? "rgba(253,250,245,0.95)" : "rgba(253,250,245,0.4)",
              transition:   "all 0.4s ease",
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      {/* Caption */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          background: "linear-gradient(transparent, rgba(44,44,44,0.52))",
          padding:    "36px 18px 14px",
          zIndex:     3,
        }}
      >
        <p style={{
          margin:        0,
          color:         "rgba(253,250,245,0.65)",
          fontSize:      "9px",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          fontFamily:    "Inter, sans-serif",
        }}>
          Photo: Unsplash
        </p>
      </div>
    </div>
  );
}

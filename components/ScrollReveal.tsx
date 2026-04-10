"use client";

import { useEffect, useRef, ReactNode, CSSProperties } from "react";

type Direction = "up" | "left" | "right" | "none";

interface ScrollRevealProps {
  children:   ReactNode;
  delay?:     number;
  direction?: Direction;
  className?: string;
  threshold?: number;
}

/* ── Upgraded offsets — more travel distance = more cinematic reveal ── */
const OFFSETS: Record<Direction, string> = {
  up:    "translateY(60px) scale(0.97)",
  left:  "translateX(-56px) scale(0.97)",
  right: "translateX(56px) scale(0.97)",
  none:  "translateY(0) scale(1)",
};

export default function ScrollReveal({
  children,
  delay     = 0,
  direction = "up",
  className = "",
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      /* Longer duration + spring easing = premium, intentional feel */
      el.style.transition = [
        `opacity  0.85s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        `transform 0.85s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      ].join(", ");
      el.style.opacity   = "1";
      el.style.transform = "translateY(0) translateX(0) scale(1)";
    };

    /* Respect prefers-reduced-motion */
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.style.opacity   = "1";
      el.style.transform = "none";
      return;
    }

    /* Already in viewport on mount — reveal immediately */
    const rect   = el.getBoundingClientRect();
    const vh     = typeof window !== "undefined" ? window.innerHeight : 0;
    const inView = rect.top < vh && rect.bottom > 0 && rect.width > 0;
    if (inView) { reveal(); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal();
            observer.unobserve(el);
          }
        });
      },
      /* rootMargin: trigger slightly before fully in view for a smoother feel */
      { threshold: Math.min(threshold, 0.05), rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);

    /* Safety fallback — never leave content invisible */
    const safety = window.setTimeout(() => {
      const op = Number.parseFloat(window.getComputedStyle(el).opacity || "0");
      if (op < 0.99) {
        el.style.transition = "opacity 0.4s ease";
        el.style.opacity    = "1";
        el.style.transform  = "translateY(0) translateX(0) scale(1)";
      }
      observer.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
    };
  }, [delay, threshold]);

  const initialStyle: CSSProperties = {
    opacity:    0,
    transform:  OFFSETS[direction],
    willChange: "opacity, transform",
  };

  return (
    <div ref={ref} className={className} style={initialStyle}>
      {children}
    </div>
  );
}

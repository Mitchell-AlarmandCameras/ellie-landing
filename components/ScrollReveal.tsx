"use client";

import { useEffect, useRef, ReactNode, CSSProperties } from "react";

type Direction = "up" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  /** Delay before the animation starts (ms) */
  delay?: number;
  /** Direction the element enters from */
  direction?: Direction;
  /** Extra Tailwind / CSS classes on the wrapper */
  className?: string;
  /** How much of the element must be visible before triggering (0–1) */
  threshold?: number;
}

const OFFSETS: Record<Direction, string> = {
  up:    "translateY(32px)",
  left:  "translateX(-28px)",
  right: "translateX(28px)",
  none:  "translateY(0)",
};

export default function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  threshold = 0.14,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.style.transition = `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
      el.style.opacity = "1";
      el.style.transform = "translateY(0) translateX(0)";
    };

    // Respect prefers-reduced-motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    // If already in viewport on mount, show immediately (avoids invisible hero CTAs
    // when IntersectionObserver is slow or threshold never hits in edge browsers).
    const rect = el.getBoundingClientRect();
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    const inView = rect.top < vh && rect.bottom > 0 && rect.width > 0 && rect.height > 0;
    if (inView) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal();
            observer.unobserve(el);
          }
        });
      },
      { threshold: Math.min(threshold, 0.05), rootMargin: "80px 0px 80px 0px" }
    );

    observer.observe(el);

    // Safety: never leave content invisible if observer never fired (embedded browsers, etc.)
    const safety = window.setTimeout(() => {
      const op = Number.parseFloat(window.getComputedStyle(el).opacity || "0");
      if (op < 0.99) {
        el.style.transition = "opacity 0.4s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0) translateX(0)";
      }
      observer.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
    };
  }, [delay, threshold]);

  const initialStyle: CSSProperties = {
    opacity: 0,
    transform: OFFSETS[direction],
    willChange: "opacity, transform",
  };

  return (
    <div ref={ref} className={className} style={initialStyle}>
      {children}
    </div>
  );
}

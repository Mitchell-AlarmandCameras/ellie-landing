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

    // Respect prefers-reduced-motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.style.transition = `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
            el.style.opacity = "1";
            el.style.transform = "translateY(0) translateX(0)";
            observer.unobserve(el);
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
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

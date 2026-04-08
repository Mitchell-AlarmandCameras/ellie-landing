"use client";

import { useEffect, useState } from "react";
import WaitlistModal from "@/components/WaitlistModal";
import ScrollReveal from "@/components/ScrollReveal";

/* ─── Style Grid data ─────────────────────────────────────────── */
const styleCards = [
  {
    index: "01",
    label: "The Executive",
    tagline: "Command any room.",
    description:
      "Precision tailoring, authoritative colour blocking, and the accessories that signal you before you speak. Power is dressed, not declared.",
    items: [
      "Double-breasted navy blazer",
      "Slim charcoal trousers",
      "White point-collar shirt",
      "Cognac Oxford brogues",
      "Slim leather portfolio",
    ],
    accentBorder: "#000080",
    accentLabel: "#000080",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="1" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    index: "02",
    label: "The Weekender",
    tagline: "Effortless. Never casual.",
    description:
      "The art of looking undone while remaining impeccably considered. Relaxed silhouettes with refined texture — weekend dressing for those who know better.",
    items: [
      "Linen trousers in stone",
      "Oversized merino crewneck",
      "White leather low-top sneakers",
      "Minimal field watch",
      "Canvas tote — structured, not slouchy",
    ],
    accentBorder: "#D4AF37",
    accentLabel: "#b8952e",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1"    x2="12" y2="3"    />
        <line x1="12" y1="21"   x2="12" y2="23"   />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12"    x2="3" y2="12"    />
        <line x1="21" y1="12"   x2="23" y2="12"   />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    index: "03",
    label: "The Wildcard",
    tagline: "Wear the conversation.",
    description:
      "One deliberate risk, executed with precision. The piece that makes an outfit a statement — for those confident enough to stand apart.",
    items: [
      "Velvet blazer in midnight plum",
      "Tonal pleated trousers",
      "Statement signet ring",
      "Unlined suede loafers",
      "Pocket square: tied, never folded",
    ],
    accentBorder: "#9ca3af",
    accentLabel: "#6b7280",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

/* ─── Page ────────────────────────────────────────────────────── */
export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  /* Scroll listener — drives nav glassmorphism state */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <WaitlistModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="min-h-screen bg-white overflow-x-hidden">

        {/* ════════════════════════════════════════════════════════
            NAVIGATION — glassmorphism, scroll-aware
        ════════════════════════════════════════════════════════ */}
        <nav
          className={`fixed top-0 left-0 right-0 z-40 ${
            scrolled ? "nav-glass-scrolled" : "nav-glass"
          }`}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4">

            {/* Wordmark */}
            <span
              className="font-bold tracking-widest uppercase shrink-0"
              style={{
                fontFamily: "Playfair Display, serif",
                letterSpacing: "0.28em",
                color: "#000080",
                fontSize: "clamp(1rem, 4vw, 1.2rem)",
              }}
            >
              Ellie
            </span>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7">
              {[
                { label: "The Lore",  href: "#the-lore"  },
                { label: "This Week", href: "#this-week" },
                { label: "Apply",     href: "#apply"     },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-xs tracking-widest uppercase transition-colors duration-200"
                  style={{
                    letterSpacing: "0.2em",
                    color: "#9ca3af",
                    fontFamily: "Inter, sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#000080")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Nav CTA */}
            <button
              onClick={() => setModalOpen(true)}
              className="btn-gold shrink-0"
              style={{ padding: "0.55rem 1.1rem", fontSize: "0.68rem", minHeight: "38px" }}
            >
              <span className="hidden sm:inline">Apply for the&nbsp;</span>Inner Circle
            </button>
          </div>
        </nav>

        {/* ════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 pt-24 pb-20 text-center">

          {/* Decorative background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Top gold hairline */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)" }}
            />
            {/* Radial glows */}
            <div
              className="absolute -top-52 -right-52 rounded-full"
              style={{
                width: "min(36rem, 90vw)",
                height: "min(36rem, 90vw)",
                background: "radial-gradient(circle, rgba(0,0,128,0.055), transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-52 -left-52 rounded-full"
              style={{
                width: "min(36rem, 90vw)",
                height: "min(36rem, 90vw)",
                background: "radial-gradient(circle, rgba(212,175,55,0.045), transparent 70%)",
              }}
            />
            {/* Subtle grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,128,0.018) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,128,0.018) 1px, transparent 1px)
                `,
                backgroundSize: "72px 72px",
              }}
            />
          </div>

          {/* Hero content — no scroll reveal on hero itself (it's the LCP) */}
          <div className="relative z-10 max-w-2xl mx-auto w-full">

            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-7 sm:mb-9">
              <div
                className="h-px"
                style={{
                  width: "clamp(24px, 5vw, 48px)",
                  background: "linear-gradient(90deg, transparent, #D4AF37)",
                  opacity: 0.7,
                }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-widest shrink-0"
                style={{ color: "#D4AF37", letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
              >
                Private Membership
              </span>
              <div
                className="h-px"
                style={{
                  width: "clamp(24px, 5vw, 48px)",
                  background: "linear-gradient(90deg, #D4AF37, transparent)",
                  opacity: 0.7,
                }}
              />
            </div>

            {/* Headline
                ─ clamp tuned for iPhone SE (320px) → Galaxy S26 Ultra (412px) → desktop
                ─ 320px: clamp(1.65rem, 8.5vw, 4.25rem) → 8.5*3.2 = 27.2px, floor = 1.65rem = 26.4px → ~26px ✓
                ─ 390px: 8.5*3.9 = 33.15px → fits 3 lines cleanly
                ─ 412px: 8.5*4.12 = 35px → ideal Galaxy S26 size
                ─ 768px+: capped at 4.25rem = 68px                            */}
            <h1
              className="font-bold leading-tight mb-5 sm:mb-6"
              style={{
                fontFamily: "Playfair Display, serif",
                color: "#000080",
                fontSize: "clamp(1.65rem, 8.5vw, 4.25rem)",
                lineHeight: 1.17,
                letterSpacing: "-0.01em",
              }}
            >
              Ellie: The Industry&apos;s
              <br />
              Best-Kept Secret,
              {/* Gold shimmer on the payoff line */}
              <em
                className="not-italic block mt-1 text-gold-metallic"
                style={{ fontStyle: "normal" }}
              >
                Now Opening Her Private Lookbook.
              </em>
            </h1>

            {/* Gold rule */}
            <div className="gold-divider" />

            {/* Sub-headline */}
            <p
              className="text-gray-500 mt-5 mb-10 sm:mb-12 max-w-lg mx-auto leading-relaxed"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(1rem, 4vw, 1.2rem)",
                lineHeight: "1.82",
              }}
            >
              A weekly style intelligence briefing from a 20-year veteran
              consultant. Three curated looks. Considered guidance. Zero noise.
              Delivered every Monday morning.
            </p>

            {/* CTA cluster */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="btn-gold w-full sm:w-auto"
                style={{ minHeight: "52px", fontSize: "0.73rem" }}
              >
                Apply for the Inner Circle
              </button>
              <span
                className="text-gray-400 text-xs uppercase tracking-widest"
                style={{ letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
              >
                Membership is limited · Applications reviewed personally
              </span>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-scroll-pulse"
            aria-hidden="true"
          >
            <span
              className="text-xs uppercase tracking-widest text-gray-400"
              style={{ letterSpacing: "0.22em", fontFamily: "Inter, sans-serif" }}
            >
              Scroll
            </span>
            <div
              className="w-px h-10"
              style={{ background: "linear-gradient(to bottom, #D4AF37, transparent)" }}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            THE LORE
        ════════════════════════════════════════════════════════ */}
        <section id="the-lore" className="py-20 sm:py-28 px-5 sm:px-6" style={{ backgroundColor: "#000080" }}>
          <div className="max-w-4xl mx-auto">

            {/* Section header */}
            <ScrollReveal direction="up" threshold={0.2}>
              <div className="text-center mb-12 sm:mb-16">
                <span
                  className="text-xs font-semibold uppercase tracking-widest block mb-4"
                  style={{ color: "#D4AF37", letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
                >
                  The Lore
                </span>
                <div className="gold-divider" />
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-start">

              {/* Quote — enters from left */}
              <ScrollReveal direction="left" threshold={0.15}>
                <div className="relative">
                  <div
                    className="absolute -top-6 -left-2 select-none opacity-10 leading-none"
                    style={{
                      fontFamily: "Playfair Display, serif",
                      color: "#D4AF37",
                      fontSize: "clamp(5rem, 18vw, 9rem)",
                      lineHeight: 1,
                    }}
                    aria-hidden="true"
                  >
                    &ldquo;
                  </div>
                  <blockquote className="relative z-10">
                    <p
                      className="text-white leading-relaxed"
                      style={{
                        fontFamily: "Playfair Display, serif",
                        fontSize: "clamp(1.05rem, 4vw, 1.4rem)",
                        lineHeight: "1.78",
                      }}
                    >
                      For two decades, I&apos;ve stayed behind the scenes
                      dressing the elite. Now, I&apos;m opening my private
                      lookbook to you.{" "}
                      <em>No algorithms. Just style.</em>
                    </p>
                    <footer className="mt-7 flex items-center gap-4">
                      <div
                        className="h-px flex-1"
                        style={{ background: "linear-gradient(90deg, #D4AF37, transparent)" }}
                      />
                      <cite
                        className="not-italic text-sm tracking-widest uppercase"
                        style={{ color: "#D4AF37", letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
                      >
                        — Ellie
                      </cite>
                    </footer>
                  </blockquote>
                </div>
              </ScrollReveal>

              {/* Credentials — each stat staggers right */}
              <div className="space-y-7 sm:space-y-8">
                {[
                  {
                    number: "20",
                    unit: "Years",
                    desc: "Dressing executives, founders, and creative leaders across three continents.",
                    delay: 0,
                  },
                  {
                    number: "1,200+",
                    unit: "Clients",
                    desc: "From first-time CEOs to quiet old money — all with different bodies, the same desire to be remembered.",
                    delay: 120,
                  },
                  {
                    number: "0",
                    unit: "Algorithms",
                    desc: "Every recommendation is handpicked. No feeds. No trending. Just considered, lasting taste.",
                    delay: 240,
                  },
                ].map((stat) => (
                  <ScrollReveal key={stat.unit} direction="right" delay={stat.delay} threshold={0.1}>
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className="shrink-0 w-16 sm:w-20 text-right">
                        <span
                          className="block font-bold leading-none"
                          style={{
                            fontFamily: "Playfair Display, serif",
                            color: "#D4AF37",
                            fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
                          }}
                        >
                          {stat.number}
                        </span>
                        <span
                          className="text-xs uppercase tracking-widest opacity-70"
                          style={{ color: "#D4AF37", letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
                        >
                          {stat.unit}
                        </span>
                      </div>
                      <div
                        className="self-stretch w-px mt-1 shrink-0"
                        style={{ background: "rgba(212,175,55,0.2)" }}
                      />
                      <p
                        className="text-gray-300 leading-relaxed"
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: "clamp(0.95rem, 3.5vw, 1.05rem)",
                          lineHeight: "1.72",
                        }}
                      >
                        {stat.desc}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            STYLE GRID
        ════════════════════════════════════════════════════════ */}
        <section id="this-week" className="py-20 sm:py-28 px-5 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">

            {/* Section header */}
            <ScrollReveal direction="up" threshold={0.2}>
              <div className="text-center mb-12 sm:mb-16">
                <span
                  className="text-xs font-semibold uppercase tracking-widest block mb-3"
                  style={{ color: "#D4AF37", letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
                >
                  This Week&apos;s Blueprint
                </span>
                <h2
                  className="font-bold mb-4"
                  style={{
                    fontFamily: "Playfair Display, serif",
                    color: "#000080",
                    fontSize: "clamp(1.55rem, 5vw, 2.5rem)",
                  }}
                >
                  The Style Grid
                </h2>
                <div className="gold-divider" />
                <p
                  className="mt-5 text-gray-500 max-w-md mx-auto leading-relaxed"
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "clamp(0.95rem, 3.5vw, 1.1rem)",
                    lineHeight: "1.75",
                  }}
                >
                  Three distinct directions. One for every occasion this week.
                  Members receive the full sourced edition every Monday.
                </p>
              </div>
            </ScrollReveal>

            {/* Cards — staggered */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
              {styleCards.map((card, i) => (
                <ScrollReveal key={card.label} direction="up" delay={i * 130} threshold={0.1}>
                  <article
                    className="group relative bg-white border border-gray-100 p-6 sm:p-8 hover:shadow-xl transition-shadow duration-500 hover:-translate-y-1 transition-transform h-full"
                    style={{ borderTop: `2px solid ${card.accentBorder}` }}
                  >
                    {/* Ghost index */}
                    <span
                      className="absolute top-5 right-5 select-none font-bold leading-none"
                      style={{
                        fontFamily: "Playfair Display, serif",
                        fontSize: "clamp(2.5rem, 8vw, 4rem)",
                        color: "#000080",
                        opacity: 0.055,
                      }}
                      aria-hidden="true"
                    >
                      {card.index}
                    </span>

                    <div className="mb-4" style={{ color: card.accentBorder }}>
                      {card.icon}
                    </div>

                    <span
                      className="text-xs font-semibold uppercase tracking-widest block mb-1"
                      style={{ color: card.accentLabel, letterSpacing: "0.25em", fontFamily: "Inter, sans-serif" }}
                    >
                      {card.label}
                    </span>

                    <h3
                      className="font-bold mb-4"
                      style={{
                        fontFamily: "Playfair Display, serif",
                        color: "#000080",
                        fontSize: "clamp(1.05rem, 4vw, 1.2rem)",
                      }}
                    >
                      {card.tagline}
                    </h3>

                    {/* Gold accent rule */}
                    <div
                      className="h-px w-7 mb-5"
                      style={{ background: "linear-gradient(90deg, #b8952e, #D4AF37, #b8952e)" }}
                    />

                    <p
                      className="text-gray-500 mb-6 leading-relaxed"
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: "clamp(0.9rem, 3.5vw, 1rem)",
                        lineHeight: "1.82",
                      }}
                    >
                      {card.description}
                    </p>

                    <ul className="space-y-2.5">
                      {card.items.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <span
                            className="mt-[7px] shrink-0 rounded-full"
                            style={{ width: "4px", height: "4px", background: "#D4AF37", opacity: 0.85, flexShrink: 0 }}
                          />
                          <span
                            className="text-gray-600"
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "clamp(0.88rem, 3.2vw, 0.96rem)",
                              lineHeight: "1.62",
                            }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7 pt-5 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span
                        className="text-xs uppercase tracking-widest"
                        style={{ color: "#D4AF37", letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
                      >
                        Full sourcing for members →
                      </span>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            {/* CTA below grid */}
            <ScrollReveal direction="up" delay={200} threshold={0.2}>
              <div className="text-center mt-14 sm:mt-16">
                <p
                  className="text-gray-400 text-xs uppercase tracking-widest mb-5"
                  style={{ letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
                >
                  New blueprint drops every Monday
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-gold w-full sm:w-auto"
                  style={{ minHeight: "52px" }}
                >
                  Apply for the Inner Circle
                </button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            APPLY CTA BANNER
        ════════════════════════════════════════════════════════ */}
        <section
          id="apply"
          className="py-20 sm:py-24 px-5 sm:px-6 relative overflow-hidden"
          style={{ backgroundColor: "#000080" }}
        >
          {/* Texture grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)
              `,
              backgroundSize: "56px 56px",
            }}
            aria-hidden="true"
          />
          {/* Corner glows */}
          <div
            className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06), transparent 70%)", transform: "translate(-40%, -40%)" }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06), transparent 70%)", transform: "translate(40%, 40%)" }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl mx-auto text-center">
            <ScrollReveal direction="up" threshold={0.18}>
              <span
                className="text-xs font-semibold uppercase tracking-widest block mb-5"
                style={{ color: "#D4AF37", letterSpacing: "0.35em", fontFamily: "Inter, sans-serif" }}
              >
                Join the Waitlist
              </span>
              <h2
                className="font-bold text-white mb-5 leading-tight"
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: "clamp(1.7rem, 6vw, 3rem)",
                }}
              >
                A limited number of spots.
                <br />
                <span style={{ color: "#D4AF37" }}>Every one considered.</span>
              </h2>
              <div className="gold-divider mb-7" />
              <p
                className="text-gray-300 mb-10 leading-relaxed"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "clamp(1rem, 4vw, 1.2rem)",
                  lineHeight: "1.82",
                }}
              >
                Ellie reviews every application personally. Add your name to
                the list and you&apos;ll be first to know when the next spot opens.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-gold w-full sm:w-auto"
                style={{ minHeight: "52px" }}
              >
                Apply for the Inner Circle
              </button>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════ */}
        <footer className="bg-white border-t border-gray-100 py-10 sm:py-12 px-5 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              <span
                className="font-bold tracking-widest uppercase"
                style={{
                  fontFamily: "Playfair Display, serif",
                  letterSpacing: "0.25em",
                  color: "#000080",
                  fontSize: "clamp(1rem, 4vw, 1.15rem)",
                }}
              >
                Ellie
              </span>
              <p
                className="text-gray-400 text-sm text-center"
                style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "0.95rem" }}
              >
                Style intelligence for the considered few.
              </p>
              <div className="flex items-center gap-5 sm:gap-6">
                {["Privacy", "Terms", "Contact"].map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-xs uppercase tracking-widest transition-colors duration-200"
                    style={{ letterSpacing: "0.15em", fontFamily: "Inter, sans-serif", color: "#9ca3af" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#000080")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-7 border-t border-gray-50 text-center">
              <p
                className="text-xs text-gray-300 tracking-widest"
                style={{ letterSpacing: "0.15em", fontFamily: "Inter, sans-serif" }}
              >
                © {new Date().getFullYear()} Ellie. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

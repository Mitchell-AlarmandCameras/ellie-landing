"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WaitlistModal from "@/components/WaitlistModal";
import ScrollReveal from "@/components/ScrollReveal";
import HeroCarousel from "@/components/HeroCarousel";

/* ─── Look preview data (teaser only — full sourcing in VIP Room) */
const previews = [
  {
    index: "01",
    label: "The Executive",
    tagline: "Walk in and own the room.",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=300&q=80",
    description:
      "Power dressing, refined. Structured pieces that command attention without trying — the kind of outfit that closes deals before you speak.",
    teaser: [
      "Tailored blazer in ivory bouclé",
      "Wide-leg trousers in camel",
      "Silk blouse in champagne",
      "Block-heel pointed-toe pump",
    ],
  },
  {
    index: "02",
    label: "The Weekender",
    tagline: "Effortless. On purpose.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=300&q=80",
    description:
      "Weekend dressing for women who never actually switch off. Polished enough to be seen, comfortable enough to mean it.",
    teaser: [
      "Oversized linen shirt in ecru",
      "Straight-leg denim in mid-wash",
      "Leather tote in cognac",
      "White sneaker, low profile",
    ],
  },
  {
    index: "03",
    label: "The Wildcard",
    tagline: "This is the one they ask about.",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&h=300&q=80",
    description:
      "One deliberate statement, executed with precision. Not for everyone — but then, nothing worth wearing ever is.",
    teaser: [
      "Slip dress in chocolate satin",
      "Cropped leather jacket in black",
      "Gold chain mules",
      "Sculptural gold cuff",
    ],
  },
];

/* ─── Page ────────────────────────────────────────────────────── */
const testimonials = [
  {
    quote: "Monday used to be the hardest morning of the week. Now it's the one I actually look forward to — three complete looks in my inbox before I've finished my coffee, every item sourced and ready to buy.",
    name:  "The Monday Experience",
    city:  "What members tell us",
  },
  {
    quote: "I stopped spending three hours on Sunday nights trying to plan outfits for the week. The brief does it for me — and the pieces are better than anything I would have found on my own.",
    name:  "The Weekly Brief",
    city:  "What the membership delivers",
  },
  {
    quote: "Nothing goes out on Monday that hasn't been personally reviewed, approved, and considered. Every single week. No exceptions.",
    name:  "The Ellie Standard",
    city:  "The promise behind every brief",
  },
];

const faqs = [
  {
    q: "When do I get my first email?",
    a: "Your first Monday brief arrives within days of subscribing. If you join mid-week, you'll get the current week's edit on the very next Monday morning.",
  },
  {
    q: "Can I cancel before my next billing date?",
    a: "Yes — cancel anytime from the member dashboard or by emailing Ellie directly. No questions, no penalties, no 30-day notice required.",
  },
  {
    q: "What's in the VIP Room?",
    a: "The full archive of every Monday brief ever published — all looks, all buy links, active and searchable. New members get access the moment they subscribe.",
  },
  {
    q: "What if I don't love the picks one week?",
    a: "You won't love every single one — that's honest. But three looks means three chances, and the majority of members order from at least one look every week. Weeks you don't, you've still lost nothing.",
  },
  {
    q: "Is this real human curation or AI?",
    a: "Both, done right. AI researches current trends and sources options. Ellie reviews, edits, and approves every single brief before it reaches your inbox. You get the speed of technology and the judgment of twenty years' experience.",
  },
];

export default function Home() {
  const [modalOpen,        setModalOpen]        = useState(false);
  const [scrolled,         setScrolled]         = useState(false);
  const [checkoutLoading,  setCheckoutLoading]  = useState(false);
  const [checkoutError,    setCheckoutError]    = useState<string | null>(null);
  const [openFaq,          setOpenFaq]          = useState<number | null>(null);
  const [referralBanner,   setReferralBanner]   = useState<string | null>(null);
  const [referralCode,     setReferralCode]     = useState<string | null>(null);

  /* Live preview — replaces hardcoded cards once Blob is configured */
  const [activePreviews,  setActivePreviews]  = useState(previews);
  const [liveWeekOf,      setLiveWeekOf]      = useState<string | null>(null);
  const [editorialLead,   setEditorialLead]   = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Check for referral code in URL — show banner and store for checkout */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref    = params.get("ref");
    if (ref) {
      setReferralCode(ref);
      setReferralBanner("A friend referred you — you'll get 50% off your first month when you join today.");
      sessionStorage.setItem("ellie_ref", ref);
    } else {
      const stored = sessionStorage.getItem("ellie_ref");
      if (stored) setReferralCode(stored);
    }
  }, []);

  /* Fetch live curated preview from Vercel Blob (auto-updates every Monday) */
  useEffect(() => {
    fetch("/api/current-preview")
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        looks?: Array<{
          index: string; label: string; tagline: string;
          description: string; teaser: string[];
        }>;
        weekOf?: string;
        editorialLead?: string;
      } | null) => {
        if (data?.looks?.length === 3) {
          setActivePreviews(
            data.looks.map((look, i) => ({
              ...previews[i % previews.length],
              index:       look.index,
              label:       look.label,
              tagline:     look.tagline,
              description: look.description,
              teaser:      Array.isArray(look.teaser) ? look.teaser : previews[i % previews.length].teaser,
            }))
          );
        }
        if (data?.weekOf) setLiveWeekOf(data.weekOf);
        if (data?.editorialLead) setEditorialLead(data.editorialLead);
      })
      .catch(() => { /* network error — silently keep hardcoded fallback */ });
  }, []);

  /* Reset loading if user navigates back from Stripe checkout */
  useEffect(() => {
    const handler = () => setCheckoutLoading(false);
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
  }, []);

  const handleCheckout = async (plan: "monthly" | "annual" = "monthly") => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const body: Record<string, string> = { plan };
      const code = referralCode || sessionStorage.getItem("ellie_ref") || "";
      if (code) body.promoCode = code;
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutLoading(false);
      setCheckoutError(
        data.error ??
          "Checkout could not start. In Vercel → Production env, set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and NEXT_PUBLIC_BASE_URL, then redeploy."
      );
    } catch {
      setCheckoutLoading(false);
      setCheckoutError("Could not reach checkout. Check your connection and try again.");
    }
  };

  return (
    <>
      <WaitlistModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Referral banner (shown when ?ref=CODE in URL) ─────────── */}
      {referralBanner && (
        <div style={{
          background:  "#C4956A",
          color:       "#FDFAF5",
          padding:     "10px 20px",
          textAlign:   "center",
          fontFamily:  "Arial, sans-serif",
          fontSize:    "13px",
          lineHeight:  1.5,
          position:    "relative",
        }}>
          🎁 {referralBanner}
          <button
            onClick={() => setReferralBanner(null)}
            aria-label="Dismiss"
            style={{
              position:   "absolute",
              right:      "16px",
              top:        "50%",
              transform:  "translateY(-50%)",
              background: "none",
              border:     "none",
              color:      "#FDFAF5",
              fontSize:   "18px",
              cursor:     "pointer",
              lineHeight: 1,
            }}
          >×</button>
        </div>
      )}

      {checkoutError ? (
        <div
          className="fixed top-20 left-1/2 z-[60] max-w-lg w-[calc(100%-2rem)] -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg border text-left"
          style={{
            background:      "var(--cream)",
            borderColor:     "rgba(180, 60, 60, 0.35)",
            color:           "var(--charcoal)",
            fontFamily:      "Inter, sans-serif",
            fontSize:        "0.85rem",
            lineHeight:      1.45,
          }}
          role="alert"
        >
          <div className="flex justify-between gap-3 items-start">
            <span>{checkoutError}</span>
            <button
              type="button"
              className="shrink-0 opacity-60 hover:opacity-100 text-lg leading-none"
              onClick={() => setCheckoutError(null)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-screen overflow-x-hidden pb-24 md:pb-0" style={{ background: "var(--cream)" }}>

        {/* ════════════════════════════════════════════════════════
            NAVIGATION
        ════════════════════════════════════════════════════════ */}
        <nav className={`fixed top-0 left-0 right-0 z-50 ${scrolled ? "nav-glass-scrolled" : "nav-glass"}`}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">

            {/* Wordmark — clicks scroll to top */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex flex-col leading-none shrink-0 group"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              aria-label="Back to top"
            >
              <span
                className="transition-opacity group-hover:opacity-70"
                style={{
                  fontFamily:    "DM Serif Display, serif",
                  color:         "var(--charcoal)",
                  fontSize:      "1.1rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Ellie
              </span>
              <span
                className="transition-opacity group-hover:opacity-70"
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.68rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  marginTop:     "1px",
                }}
              >
                The Style Refresh
              </span>
            </button>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: "The Story",  href: "#the-story"  },
                { label: "This Week",  href: "#this-week"  },
                { label: "The Edit",   href: "/blog"       },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="uppercase tracking-widest transition-colors duration-200"
                  style={{ fontSize: "0.78rem", letterSpacing: "0.18em", color: "var(--warm-gray)", fontFamily: "Inter, sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--charcoal)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--warm-gray)")}
                >
                  {label}
                </a>
              ))}

              {/* VIP Room — goes to dashboard if logged in, login page if not */}
              <a
                href="/dashboard"
                className="uppercase tracking-widest transition-all duration-200"
                style={{
                  fontSize:      "0.74rem",
                  letterSpacing: "0.18em",
                  fontFamily:    "Inter, sans-serif",
                  fontWeight:    600,
                  color:         "var(--blush)",
                  border:        "1.5px solid var(--blush)",
                  padding:       "0.4rem 1rem",
                  whiteSpace:    "nowrap",
                }}
              >
                VIP Room
              </a>
            </div>

            {/* Nav CTA */}
            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={checkoutLoading}
              className="btn-primary shrink-0"
              style={{ padding: "0.55rem 1.25rem", fontSize: "0.67rem", minHeight: "38px" }}
              aria-label="Join Style Refresh for 19 dollars per month"
            >
              {checkoutLoading ? "Loading…" : "Join $19/mo"}
            </button>
          </div>
        </nav>

        {/* ════════════════════════════════════════════════════════
            HERO — full-screen background carousel
        ════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center">

          {/* Full-screen carousel background */}
          <HeroCarousel />

          {/* Dark gradient overlay — left heavy for text readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, rgba(18,14,10,0.78) 0%, rgba(18,14,10,0.52) 50%, rgba(18,14,10,0.18) 100%)",
              zIndex: 2,
            }}
            aria-hidden="true"
          />

          {/* Content — sits above overlay */}
          <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-10 pt-28 pb-20" style={{ zIndex: 3 }}>
            <div className="max-w-xl">

              {/* Eyebrow */}
              <ScrollReveal direction="up" delay={0}>
                <div className="flex items-center gap-3 mb-7">
                  <div className="h-px w-8" style={{ background: "rgba(196,149,106,0.7)" }} />
                  <span style={{
                    fontSize: "0.72rem", letterSpacing: "0.34em", textTransform: "uppercase",
                    fontFamily: "Inter, sans-serif", color: "rgba(196,149,106,0.9)",
                  }}>
                    Private Style Membership
                  </span>
                </div>
              </ScrollReveal>

              {/* Headline */}
              <ScrollReveal direction="up" delay={80}>
                <h1
                  className="font-bold leading-tight mb-6"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    color:      "#FDFAF5",
                    fontSize:   "clamp(2.6rem, 8vw, 5.2rem)",
                    lineHeight: "1.06",
                    textShadow: "0 2px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  Three looks.
                  <br />
                  <em className="not-italic" style={{ color: "#C4956A" }}>Every Monday.</em>
                  <br />
                  Ready to buy.
                </h1>
              </ScrollReveal>

              {/* Divider */}
              <ScrollReveal direction="up" delay={140}>
                <div style={{ width: "48px", height: "1px", background: "rgba(196,149,106,0.6)", margin: "0 0 28px" }} />
              </ScrollReveal>

              {/* Sub-headline */}
              <ScrollReveal direction="up" delay={200}>
                <p
                  className="mb-10 leading-relaxed hero-text"
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    color:      "rgba(253,250,245,0.85)",
                    fontSize:   "clamp(1.1rem, 3vw, 1.3rem)",
                    lineHeight: "1.85",
                    textShadow: "0 1px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  Three complete looks — sourced, styled, and ready to shop —
                  delivered to your inbox every Monday morning. Women&apos;s fashion,
                  curated personally by Ellie. Direct buy links to every single item.
                </p>
              </ScrollReveal>

              {/* CTA */}
              <ScrollReveal direction="up" delay={260}>
                <div className="flex flex-col items-start gap-4">
                  <button
                    type="button"
                    onClick={() => handleCheckout("monthly")}
                    disabled={checkoutLoading}
                    style={{
                      background:    "#C4956A",
                      color:         "#FDFAF5",
                      border:        "none",
                      padding:       "16px 36px",
                      fontFamily:    "Inter, sans-serif",
                      fontSize:      "0.75rem",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      cursor:        checkoutLoading ? "default" : "pointer",
                      opacity:       checkoutLoading ? 0.7 : 1,
                      minHeight:     "54px",
                    }}
                    aria-label="Join Style Refresh for 19 dollars per month"
                  >
                    {checkoutLoading ? "Preparing…" : "Start My Refresh — $19/mo"}
                  </button>
                  <p style={{
                    fontSize: "0.72rem", color: "rgba(253,250,245,0.55)",
                    letterSpacing: "0.06em", fontFamily: "Inter, sans-serif", lineHeight: 1.6,
                  }}>
                    7-day money-back guarantee · Cancel anytime · Secure checkout
                  </p>
                </div>
              </ScrollReveal>

            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-40">
              <div className="w-px animate-scroll-pulse" style={{ height: "32px", background: "rgba(253,250,245,0.6)" }} />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            THE STORY
        ════════════════════════════════════════════════════════ */}
        <section id="the-story" className="py-20 sm:py-28 px-5 sm:px-8 bg-white">
          <div className="max-w-4xl mx-auto">

            <ScrollReveal direction="up" threshold={0.15}>
              <div className="text-center mb-14">
                <span className="section-label block mb-4">The Story</span>
                <div className="sand-divider" />
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">

              <ScrollReveal direction="left" delay={0} threshold={0.12}>
                <div>
                  <h2
                    className="font-bold leading-tight mb-6"
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      color:      "var(--charcoal)",
                      fontSize:   "clamp(1.7rem, 5vw, 2.5rem)",
                      lineHeight: "1.2",
                    }}
                  >
                    Twenty years behind the scenes.
                    <br />
                    <em style={{ color: "var(--blush)" }}>Now open to you.</em>
                  </h2>
                  <div
                    className="h-px mb-7"
                    style={{ background: "linear-gradient(90deg, var(--sand-dark), transparent)", width: "72px" }}
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={100} threshold={0.12}>
                <div className="space-y-5">
                  <p
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    color:      "var(--charcoal-muted)",
                    fontSize:   "clamp(1.1rem, 3.5vw, 1.2rem)",
                    lineHeight: "1.9",
                  }}
                >
                  For two decades, I dressed the executives, the editors, and the
                    quietly powerful women who ran the room. The looks they wore
                    didn&apos;t come from scrolling feeds — they came from knowing
                    exactly where to look, what to buy, and how to wear it.
                  </p>
                  <p
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    color:      "var(--charcoal-muted)",
                    fontSize:   "clamp(1.1rem, 3.5vw, 1.2rem)",
                    lineHeight: "1.9",
                  }}
                >
                  Now I&apos;m opening the private lookbook.
                  </p>
                  <p
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    color:      "var(--charcoal-muted)",
                    fontSize:   "clamp(1.1rem, 3.5vw, 1.2rem)",
                    lineHeight: "1.9",
                  }}
                >
                  Not to the masses. To a small group of people who understand that
                    getting dressed well isn&apos;t about spending more — it&apos;s about
                    knowing <em>exactly</em> what to buy.
                  </p>
                  <p
                    style={{
                      fontFamily:    "DM Serif Display, serif",
                      color:         "var(--blush)",
                      fontSize:      "clamp(1.4rem, 4vw, 1.75rem)",
                      lineHeight:    "1",
                      marginTop:     "28px",
                      fontStyle:     "italic",
                      letterSpacing: "0.02em",
                    }}
                  >
                    — Ellie
                  </p>
                </div>
              </ScrollReveal>
            </div>

            {/* Three pillars */}
            <ScrollReveal direction="up" delay={150} threshold={0.1}>
              <div
                className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px"
                style={{ background: "var(--sand-border)" }}
              >
                {[
                  { num: "3",   label: "Complete looks",   sub: "per Monday brief"         },
                  { num: "52",  label: "Briefs per year",  sub: "never a missed Monday"     },
                  { num: "∞",   label: "Buy links",        sub: "every item, fully sourced" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white py-9 px-7 text-center"
                  >
                    <span
                      style={{
                        fontFamily: "DM Serif Display, serif",
                        color:      "var(--blush)",
                        fontSize:   "2.5rem",
                        lineHeight: "1",
                        display:    "block",
                        marginBottom: "8px",
                      }}
                    >
                      {item.num}
                    </span>
                    <span
                      style={{
                        fontFamily:    "Inter, sans-serif",
                        color:         "var(--charcoal)",
                    fontSize:      "0.8rem",
                    fontWeight:    500,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    display:       "block",
                  }}
                >
                  {item.label}
                    </span>
                    <span
                      style={{
                    fontFamily: "Inter, sans-serif",
                    color:      "var(--warm-gray)",
                    fontSize:   "0.76rem",
                    display:    "block",
                    marginTop:  "4px",
                      }}
                    >
                      {item.sub}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            WHAT THE MEMBERSHIP DELIVERS
        ════════════════════════════════════════════════════════ */}
        {true && <section className="py-20 sm:py-24 px-5 sm:px-8" style={{ background: "var(--cream)" }}>
          <div className="max-w-5xl mx-auto">
            <ScrollReveal direction="up" threshold={0.12}>
              <div className="text-center mb-12">
                <span className="section-label block mb-3">What This Delivers</span>
                <h2
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    color:      "var(--charcoal)",
                    fontSize:   "clamp(1.6rem, 5vw, 2.2rem)",
                    fontWeight: 400,
                    margin:     "0 0 16px",
                  }}
                >
                  Three things. Every single Monday.
                </h2>
                <div className="sand-divider" />
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <ScrollReveal key={t.name} direction="up" delay={i * 80} threshold={0.1}>
                  <div
                    className="flex flex-col justify-between h-full p-8"
                    style={{
                      background:   "var(--cream-dark)",
                      borderLeft:   "2px solid var(--blush)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        color:      "var(--charcoal-muted)",
                        fontSize:   "1.05rem",
                        lineHeight: "1.85",
                        fontStyle:  "italic",
                      }}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6">
                      <div
                        className="h-px mb-4"
                        style={{ background: "var(--sand-border)", width: "40px" }}
                      />
                      <p
                        style={{
                          fontFamily:    "Inter, sans-serif",
                          color:         "var(--charcoal)",
                          fontSize:      "0.8rem",
                          fontWeight:    600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {t.name}
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          color:      "var(--warm-gray)",
                          fontSize:   "0.74rem",
                          marginTop:  "2px",
                        }}
                      >
                        {t.city}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>}

        {/* ════════════════════════════════════════════════════════
            THIS WEEK'S PREVIEW
        ════════════════════════════════════════════════════════ */}
        <section
          id="this-week"
          className="py-20 sm:py-28 px-5 sm:px-8"
          style={{ background: "var(--cream-dark)" }}
        >
          <div className="max-w-6xl mx-auto">

            <ScrollReveal direction="up" threshold={0.12}>
              <div className="text-center mb-14">
                <span className="section-label block mb-2">
                  {liveWeekOf ? `Week of ${liveWeekOf}` : "This Week's Edit"}
                </span>
                <h2
                  className="font-bold"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    color:      "var(--charcoal)",
                    fontSize:   "clamp(1.6rem, 5vw, 2.4rem)",
                  }}
                >
                  Three looks. All sourced.
                </h2>

                {/* Live editorial lead from Claude — updates every Monday */}
                {editorialLead && (
                  <p
                    className="mt-5 mx-auto leading-relaxed"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      color:      "var(--charcoal-muted)",
                      fontSize:   "clamp(1.05rem, 3vw, 1.2rem)",
                      lineHeight: "1.85",
                      maxWidth:   "36rem",
                      fontStyle:  "italic",
                    }}
                  >
                    &ldquo;{editorialLead}&rdquo;
                  </p>
                )}

                <p
                  className="mt-4 mx-auto"
                  style={{
                    fontFamily:    "Inter, sans-serif",
                    color:         "var(--warm-gray)",
                    fontSize:      "0.8rem",
                    letterSpacing: "0.06em",
                    maxWidth:      "28rem",
                  }}
                >
                  Full buy links for every item are exclusive to VIP Room members.
                </p>
                <div className="sand-divider mt-6" />
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {activePreviews.map((card, i) => (
                <ScrollReveal
                  key={card.label}
                  direction={i === 0 ? "left" : i === 2 ? "right" : "up"}
                  delay={i * 120}
                  threshold={0.1}
                >
                  <article
                    className="bg-white relative group"
                    style={{ borderTop: "2px solid var(--sand-border)" }}
                  >
                    {/* Editorial photo at top of card */}
                    <div className="relative overflow-hidden" style={{ height: "200px" }}>
                      <Image
                        src={card.image}
                        alt={`${card.label} — The Style Refresh`}
                        fill
                        sizes="(min-width: 1024px) 30vw, 90vw"
                        style={{ objectFit: "cover", objectPosition: "center top", transition: "transform 0.5s ease" }}
                        className="group-hover:scale-105"
                      />
                      {/* Blush gradient overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(transparent 50%, rgba(44,44,44,0.35))" }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="p-7 sm:p-8">
                    {/* Ghost index — decorative, sits behind content */}
                    <span
                      className="absolute top-[206px] right-4 select-none font-bold leading-none pointer-events-none"
                      style={{
                        fontFamily: "DM Serif Display, serif",
                        fontSize:   "3.2rem",
                        color:      "var(--sand)",
                        lineHeight: "1",
                        opacity:    0.7,
                        zIndex:     0,
                      }}
                      aria-hidden="true"
                    >
                      {card.index}
                    </span>

                    <span
                    className="section-label block mb-2"
                    style={{ fontSize: "0.74rem" }}
                    >
                      {card.label}
                    </span>

                    <h3
                      className="font-bold mb-4"
                      style={{
                        fontFamily: "DM Serif Display, serif",
                        color:      "var(--charcoal)",
                        fontSize:   "1.1rem",
                        lineHeight: "1.3",
                      }}
                    >
                      {card.tagline}
                    </h3>

                    <div
                      className="h-px w-7 mb-5"
                      style={{ background: "linear-gradient(90deg, var(--blush), var(--sand-dark))" }}
                    />

                    <p
                      className="mb-6 leading-relaxed"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--charcoal-muted)",
                  fontSize:   "1.05rem",
                  lineHeight: "1.8",
                }}
              >
                {card.description}
                    </p>

                    {/* Teaser item list */}
                    <ul className="space-y-2.5 mb-6">
                      {card.teaser.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span
                            className="mt-[7px] shrink-0 rounded-full"
                            style={{ width: "3px", height: "3px", background: "var(--blush)", flexShrink: 0 }}
                          />
                          <span
                            style={{
                          fontFamily: "Inter, sans-serif",
                          color:      "var(--charcoal-light)",
                          fontSize:   "0.88rem",
                          lineHeight: "1.6",
                            }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Lock indicator — decorative only (not a control) */}
                    <div
                      className="flex items-center gap-2 pt-4 pointer-events-none select-none"
                      style={{ borderTop: "1px solid var(--sand-light)" }}
                    >
                      <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
                        <rect x="1" y="5.5" width="9" height="7" rx="1" stroke="var(--taupe)" strokeWidth="1.1" />
                        <path d="M3.5 5.5V3.5a2 2 0 014 0v2" stroke="var(--taupe)" strokeWidth="1.1" strokeLinecap="round" />
                        <circle cx="5.5" cy="9" r="1" fill="var(--blush)" />
                      </svg>
                      <span
                        style={{
                          fontFamily:    "Inter, sans-serif",
                          color:         "var(--taupe)",
                          fontSize:      "0.75rem",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        Buy links for members
                      </span>
                    </div>
                    </div>{/* end inner content div */}
                  </article>
                </ScrollReveal>
              ))}
            </div>

            {/* Cadence callout */}
            <ScrollReveal direction="up" delay={200} threshold={0.2}>
              <div className="text-center mt-12 flex flex-col items-center gap-2">
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{
                    color:         "var(--charcoal)",
                    letterSpacing: "0.2em",
                    fontFamily:    "Inter, sans-serif",
                    fontWeight:    700,
                  }}
                >
                  New edit drops every Monday
                </p>
                {liveWeekOf && (
                  <p style={{
                    fontFamily:    "Inter, sans-serif",
                    color:         "var(--blush)",
                    fontSize:      "0.72rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}>
                    Currently showing: Week of {liveWeekOf}
                  </p>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            JOIN SECTION
        ════════════════════════════════════════════════════════ */}
        <section
          id="join"
          className="py-20 sm:py-28 px-5 sm:px-8 relative overflow-hidden"
          style={{ background: "var(--charcoal)" }}
        >
          {/* Subtle grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(232,223,208,0.04) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(232,223,208,0.04) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-xl mx-auto text-center">
            <ScrollReveal direction="up" threshold={0.15}>

              <span className="section-label block mb-5" style={{ color: "var(--blush-light)" }}>
                The Membership
              </span>

              <h2
                className="font-bold leading-tight mb-5"
                style={{
                  fontFamily: "DM Serif Display, serif",
                  color:      "var(--cream)",
                  fontSize:   "clamp(1.8rem, 6vw, 3.2rem)",
                }}
              >
                One brief.
                <br />
                <em className="not-italic" style={{ color: "var(--blush-light)" }}>
                  Completely worth it.
                </em>
              </h2>

              <div className="sand-divider mb-8" style={{ opacity: 0.4 }} />

              <p
                className="mb-10 leading-relaxed"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "rgba(253,250,245,0.65)",
                  fontSize:   "clamp(1.1rem, 4vw, 1.25rem)",
                  lineHeight: "1.85",
                }}
              >
                Every Monday morning, three complete women&apos;s looks land in your inbox
                — sourced to the exact buy link, styled so you can wear it the same week.
                Less than a coffee a week.
              </p>

              {/* Value list */}
              <ul className="mb-10 inline-block text-left space-y-3">
                {[
                  "Three complete looks every Monday",
                  "Direct buy links to every item",
                  "Ellie&apos;s sourcing notes and recommendations",
                  "Access to the VIP Room lookbook archive",
                  "7-day money-back guarantee — no questions asked",
                  "Cancel anytime — no contracts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span style={{ color: "var(--blush)", marginTop: "3px" }} aria-hidden="true">✓</span>
                    <span
                      dangerouslySetInnerHTML={{ __html: item }}
                      style={{
                        fontFamily: "Inter, sans-serif",
                          color:      "rgba(253,250,245,0.75)",
                          fontSize:   "0.88rem",
                          lineHeight: "1.7",
                      }}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleCheckout("monthly")}
                disabled={checkoutLoading}
                className="btn-primary w-full sm:w-auto"
                style={{
                  background:  "var(--cream)",
                  color:       "var(--charcoal)",
                  borderColor: "var(--cream)",
                  minHeight:   "54px",
                  fontSize:    "0.75rem",
                  marginBottom: "16px",
                }}
              >
                {checkoutLoading ? "Preparing Checkout…" : "Start My Refresh — $19/mo"}
              </button>

              <p
                className="text-xs"
                style={{ color: "rgba(253,250,245,0.45)", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", lineHeight: 1.7 }}
              >
                Secure checkout via Stripe · Billed monthly · Cancel anytime
                <br />
                <span style={{ color: "rgba(196,149,106,0.8)" }}>Not satisfied within 7 days? Full refund. No questions.</span>
              </p>

              {/* Annual plan option */}
              <div
                style={{
                  marginTop:    "20px",
                  padding:      "14px 18px",
                  border:       "1px solid rgba(196,149,106,0.4)",
                  background:   "rgba(196,149,106,0.08)",
                  textAlign:    "center",
                }}
              >
                <p style={{
                  margin: "0 0 8px",
                  color: "rgba(253,250,245,0.7)",
                  fontSize: "11px",
                  fontFamily: "Arial, sans-serif",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}>
                  Best value
                </p>
                <button
                  type="button"
                  onClick={() => handleCheckout("annual")}
                  disabled={checkoutLoading}
                  style={{
                    background:    "transparent",
                    border:        "1px solid rgba(196,149,106,0.6)",
                    color:         "#C4956A",
                    padding:       "10px 28px",
                    fontFamily:    "Arial, sans-serif",
                    fontSize:      "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor:        checkoutLoading ? "default" : "pointer",
                    width:         "100%",
                  }}
                >
                  Annual Plan — $180/year
                </button>
                <p style={{
                  margin: "6px 0 0",
                  color:  "rgba(196,149,106,0.7)",
                  fontSize: "10px",
                  fontFamily: "Arial, sans-serif",
                }}>
                  Save $48 — equivalent to 2 months free
                </p>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="block mx-auto mt-4 text-xs underline underline-offset-4"
                style={{ color: "rgba(253,250,245,0.35)", fontFamily: "Inter, sans-serif" }}
              >
                Not ready? Join the waitlist instead
              </button>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FAQ
        ════════════════════════════════════════════════════════ */}
        <section className="py-20 sm:py-24 px-5 sm:px-8 bg-white">
          <div className="max-w-2xl mx-auto">
            <ScrollReveal direction="up" threshold={0.12}>
              <div className="text-center mb-12">
                <span className="section-label block mb-3">Questions</span>
                <h2
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    color:      "var(--charcoal)",
                    fontSize:   "clamp(1.6rem, 5vw, 2.2rem)",
                  }}
                >
                  Everything you need to know.
                </h2>
                <div className="sand-divider mt-6" />
              </div>
            </ScrollReveal>

            <div className="space-y-0">
              {faqs.map((faq, i) => (
                <ScrollReveal key={i} direction="up" delay={i * 50} threshold={0.05}>
                  <div style={{ borderBottom: "1px solid var(--sand-border)" }}>
                    <button
                      type="button"
                      className="w-full text-left flex items-center justify-between gap-4 py-5"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span
                        style={{
                          fontFamily:    "Inter, sans-serif",
                          color:         "var(--charcoal)",
                          fontSize:      "0.88rem",
                          fontWeight:    600,
                          letterSpacing: "0.04em",
                          lineHeight:    "1.5",
                        }}
                      >
                        {faq.q}
                      </span>
                      <span
                        style={{
                          color:      "var(--blush)",
                          fontSize:   "1.25rem",
                          lineHeight: "1",
                          flexShrink: 0,
                          transition: "transform 0.25s ease",
                          transform:  openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                          display:    "inline-block",
                        }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>

                    <div
                      style={{
                        maxHeight:  openFaq === i ? "300px" : "0px",
                        overflow:   "hidden",
                        transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    >
                      <p
                        className="pb-5"
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          color:      "var(--charcoal-muted)",
                          fontSize:   "1.05rem",
                          lineHeight: "1.85",
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════ */}
        <footer
          className="py-10 px-5 sm:px-8 border-t"
          style={{ background: "var(--cream)", borderColor: "var(--sand-border)" }}
        >
          <div className="max-w-6xl mx-auto flex flex-col gap-6">

            {/* Top row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
              {/* Wordmark */}
              <div className="flex flex-col items-center sm:items-start leading-none">
                <span
                  style={{
                    fontFamily:    "DM Serif Display, serif",
                    color:         "var(--charcoal)",
                    fontSize:      "1rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  Ellie
                </span>
                <span
                  style={{
                    fontFamily:    "Inter, sans-serif",
                    color:         "var(--blush)",
                    fontSize:      "0.58rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    marginTop:     "2px",
                  }}
                >
                  The Style Refresh
                </span>
              </div>

              <p
                className="text-center"
                style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.82rem" }}
              >
                Private style membership · Three looks every Monday
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {["The Story", "This Week", "Join"].map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase().replace(" ", "-")}`}
                    style={{
                      fontFamily:     "Inter, sans-serif",
                      color:          "var(--warm-gray)",
                      fontSize:       "0.78rem",
                      letterSpacing:  "0.15em",
                      textTransform:  "uppercase",
                      textDecoration: "none",
                      transition:     "color 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--charcoal)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--warm-gray)")}
                  >
                    {link}
                  </a>
                ))}
                <Link
                  href="/membership"
                  className="uppercase tracking-widest transition-colors"
                  style={{
                    fontFamily:     "Inter, sans-serif",
                    color:          "var(--warm-gray)",
                    fontSize:       "0.78rem",
                    letterSpacing:  "0.15em",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--charcoal)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--warm-gray)")}
                >
                  Membership
                </Link>
              </div>
            </div>

            {/* Legal row */}
            <div
              className="flex flex-col items-center gap-2 pt-3"
              style={{ borderTop: "1px solid var(--sand-border)" }}
            >
              {/* Affiliate disclosure — FTC required */}
              <p className="text-center" style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.68rem", maxWidth: "560px" }}>
                This site contains affiliate links. We may earn a small commission on purchases at no extra cost to you.
              </p>
              {/* Physical mailing address — CAN-SPAM required */}
              <p className="text-center" style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.68rem" }}>
                {process.env.NEXT_PUBLIC_MAILING_ADDRESS ?? "The Style Refresh · PO Box 1 · New York, NY 10001"}
              </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
              <p style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.74rem" }}>
                © {new Date().getFullYear()} The Style Refresh. All rights reserved.
              </p>
              {[
                { label: "The Edit",       href: "/blog"    },
                { label: "Contact",        href: "/contact" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    fontFamily:     "Inter, sans-serif",
                    color:          "var(--warm-gray)",
                    fontSize:       "0.74rem",
                    textDecoration: "none",
                    transition:     "color 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--charcoal)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--warm-gray)")}
                >
                  {label}
                </Link>
              ))}
            </div>
            </div>
          </div>
        </footer>

        {/* Mobile: fixed bottom bar with Join + Member Login */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          style={{
            background:     "rgba(253,250,245,0.96)",
            backdropFilter: "blur(12px)",
            borderColor:    "var(--sand-border)",
            boxShadow:      "0 -8px 32px rgba(44,44,44,0.06)",
          }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={checkoutLoading}
              className="btn-primary flex-1"
              style={{ minHeight: "48px", fontSize: "0.72rem" }}
              aria-label="Join Style Refresh for 19 dollars per month"
            >
              {checkoutLoading ? "Loading…" : "Join — $19/mo"}
            </button>
            <a
              href="/dashboard"
              style={{
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                minHeight:     "48px",
                padding:       "0 1.1rem",
                border:        "1.5px solid var(--blush)",
                color:         "var(--blush)",
                fontFamily:    "Inter, sans-serif",
                fontSize:      "0.68rem",
                fontWeight:    600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                whiteSpace:    "nowrap",
                textDecoration:"none",
              }}
            >
              VIP Room
            </a>
          </div>
        </div>

      </div>
    </>
  );
}

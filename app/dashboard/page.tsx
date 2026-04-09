import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { currentWeek, archiveWeeks } from "@/data/lookbook";
import ReferralButton from "@/components/ReferralButton";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "VIP Room | ELLIE — The Style Refresh",
  robots: { index: false, follow: false },
};

/* ═══════════════════════════════════════════════════════════════
   VIP ROOM — Server Component (cookie-gated)
═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const cookieStore  = cookies();
  const hasAccess    = cookieStore.get("ellie_access")?.value === "true";
  const customerId   = cookieStore.get("ellie_customer")?.value ?? "";

  if (!hasAccess) redirect("/login");

  const week       = currentWeek;
  const hasArchive = archiveWeeks.length > 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background:     "rgba(253,250,245,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom:   "1px solid var(--sand-border)",
          boxShadow:      "0 1px 0 rgba(201,185,154,0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-none">
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
                  fontSize:      "0.66rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginTop:     "1px",
                }}
              >
                The Style Refresh
              </span>
            </div>

            <div
              className="hidden sm:flex items-center px-2.5 py-1"
              style={{
                border:        "1px solid var(--sand-border)",
                background:    "var(--cream-dark)",
              }}
            >
              <span
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.68rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                }}
              >
                VIP Room
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href={`/api/billing-portal?cid=${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-widest transition-colors hidden sm:block hover:text-charcoal"
              style={{ fontSize: "0.78rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "var(--warm-gray)" }}
            >
              Manage Billing
            </a>
            <Link
              href="/"
              className="text-xs uppercase tracking-widest transition-colors hidden sm:block"
              style={{ fontSize: "0.78rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "var(--warm-gray)" }}
            >
              ← Site
            </Link>
            <a
              href="/api/logout"
              className="text-xs uppercase tracking-widest transition-colors"
              style={{ fontSize: "0.78rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "var(--blush)", border: "1px solid var(--blush)", padding: "0.3rem 0.8rem" }}
            >
              Log Out
            </a>
          </div>
        </div>
      </header>

      {/* ── Welcome banner ───────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20 px-5 sm:px-8 text-center relative overflow-hidden"
        style={{ background: "var(--cream-dark)", borderBottom: "1px solid var(--sand-border)" }}
      >
        {/* Subtle texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(201,185,154,0.07) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(201,185,154,0.07) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark))" }} />
            <span
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--blush)",
                fontSize:      "0.75rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontWeight:    500,
              }}
            >
              Week {week.weekNumber} · {week.weekOf}
            </span>
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, var(--sand-dark), transparent)" }} />
          </div>

          <h1
            className="font-bold leading-tight mb-5"
            style={{
              fontFamily: "DM Serif Display, serif",
              color:      "var(--charcoal)",
              fontSize:   "clamp(1.8rem, 5.5vw, 3rem)",
              lineHeight: "1.15",
            }}
          >
            You&apos;re in the{" "}
            <em className="not-italic" style={{ color: "var(--blush)" }}>VIP Room.</em>
          </h1>

          <div
            className="h-px w-12 mx-auto my-5"
            style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
          />

          <p
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color:      "var(--charcoal-muted)",
              fontSize:   "clamp(1.1rem, 3.5vw, 1.25rem)",
              lineHeight: "1.85",
              maxWidth:   "32rem",
              margin:     "0 auto",
            }}
          >
            {week.editorialLead}
          </p>
        </div>
      </section>

      {/* ── Lookbook — This Week's Brief ─────────────────────────── */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <span
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--blush)",
                fontSize:      "0.75rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                fontWeight:    500,
                display:       "block",
                marginBottom:  "10px",
              }}
            >
              Full Sourced Edition
            </span>
            <h2
              className="font-bold"
              style={{
                fontFamily: "DM Serif Display, serif",
                color:      "var(--charcoal)",
                fontSize:   "clamp(1.5rem, 4vw, 2.2rem)",
              }}
            >
              This Week&apos;s Blueprint
            </h2>
            <div
              className="h-px w-12 mx-auto mt-5"
              style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
            />
          </div>

          {/* Look cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-7">
            {week.looks.map((look) => (
              <article
                key={look.label}
                className="relative"
                style={{
                  border:    "1px solid var(--sand-border)",
                  borderTop: "2px solid var(--blush)",
                  background: "var(--cream)",
                }}
              >
                {/* Ghost index */}
                <span
                  className="absolute top-5 right-5 select-none font-bold leading-none"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    fontSize:   "4rem",
                    color:      "var(--cream-deep)",
                    lineHeight: "1",
                  }}
                  aria-hidden="true"
                >
                  {look.index}
                </span>

                <div className="p-7 sm:p-8">

                  {/* Label + tagline */}
                  <span
                    style={{
                      fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.74rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                  display:       "block",
                  marginBottom:  "6px",
                    }}
                  >
                    {look.label}
                  </span>

                  <h3
                    className="font-bold mb-3"
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      color:      "var(--charcoal)",
                      fontSize:   "1.15rem",
                      lineHeight: "1.3",
                    }}
                  >
                    {look.tagline}
                  </h3>

                  <div
                    className="h-px w-8 mb-5"
                    style={{ background: "linear-gradient(90deg, var(--blush), var(--sand-dark))" }}
                  />

                  <p
                    className="mb-7"
                    style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--charcoal-muted)",
                  fontSize:   "1.05rem",
                  lineHeight: "1.85",
                }}
              >
                {look.description}
                  </p>

                  {/* Sourced item list */}
                  <ul className="space-y-4 mb-7">
                    {look.items.map((item) => (
                      <li
                        key={item.piece}
                        className="pb-4"
                        style={{ borderBottom: "1px solid var(--sand-light, #F2ECE4)" }}
                      >
                        {/* Top row: piece name + buy button */}
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <span
                            className="font-medium"
                            style={{
                          fontFamily: "Inter, sans-serif",
                          color:      "var(--charcoal)",
                          fontSize:   "0.9rem",
                          lineHeight: "1.5",
                            }}
                          >
                            {item.piece}
                          </span>
                          <a
                            href={item.buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-buy shrink-0"
                            aria-label={`Shop ${item.piece} at ${item.brand}`}
                          >
                            Shop →
                          </a>
                        </div>

                        {/* Brand + price */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            style={{
                          fontFamily:    "Inter, sans-serif",
                          color:         "var(--warm-gray)",
                          fontSize:      "0.78rem",
                          letterSpacing: "0.08em",
                            }}
                          >
                            {item.brand}
                          </span>
                          <span style={{ color: "var(--sand-dark)", fontSize: "0.6rem" }}>·</span>
                          <span
                            style={{
                          fontFamily: "Inter, sans-serif",
                          color:      "var(--charcoal-muted)",
                          fontSize:   "0.78rem",
                          fontWeight: 500,
                            }}
                          >
                            {item.price}
                          </span>
                        </div>

                        {/* Ellie's note */}
                        <p
                          className="italic"
                          style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--warm-gray)",
                  fontSize:   "0.95rem",
                  lineHeight: "1.7",
                          }}
                        >
                          &ldquo;{item.note}&rdquo;
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Ellie's note callout */}
                  <div
                    className="p-4"
                    style={{
                      background:  "var(--cream-dark)",
                      borderLeft:  "2px solid var(--blush)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.72rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                  display:       "block",
                  marginBottom:  "6px",
                      }}
                    >
                      Ellie&apos;s Note
                    </span>
                    <p
                      className="italic"
                      style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--charcoal-muted)",
                  fontSize:   "1rem",
                  lineHeight: "1.75",
                      }}
                    >
                      {look.editorsNote}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Archive (shown only when archive has entries) ─────────── */}
      {hasArchive && (
        <section
          className="py-16 sm:py-20 px-5 sm:px-8"
          style={{ background: "var(--cream-dark)", borderTop: "1px solid var(--sand-border)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.74rem",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                  display:       "block",
                  marginBottom:  "8px",
                }}
              >
                Past Editions
              </span>
              <h2
                className="font-bold"
                style={{
                  fontFamily: "DM Serif Display, serif",
                  color:      "var(--charcoal)",
                  fontSize:   "clamp(1.4rem, 4vw, 1.9rem)",
                }}
              >
                The Archive
              </h2>
              <div
                className="h-px w-12 mx-auto mt-4"
                style={{ background: "linear-gradient(90deg, transparent, var(--sand-dark), transparent)" }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archiveWeeks.map((aw) => (
                <div
                  key={aw.weekOf}
                  className="bg-white p-6"
                  style={{ border: "1px solid var(--sand-border)" }}
                >
                  <span
                    style={{
                      fontFamily:    "Inter, sans-serif",
                  color:         "var(--blush)",
                  fontSize:      "0.72rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                }}
                  >
                    Week {aw.weekNumber}
                  </span>
                  <p
                    className="mt-1 font-bold"
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      color:      "var(--charcoal)",
                      fontSize:   "1.05rem",
                    }}
                  >
                    {aw.weekOf}
                  </p>
                  <p
                    className="mt-2 line-clamp-2"
                    style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--charcoal-muted)",
                  fontSize:   "1rem",
                  lineHeight: "1.7",
                    }}
                  >
                    {aw.editorialLead}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Coming Soon ───────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-18 px-5 sm:px-8"
        style={{ background: "white", borderTop: "1px solid var(--sand-border)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-center mb-8"
            style={{
              fontFamily:    "Inter, sans-serif",
              color:         "var(--warm-gray)",
              fontSize:      "0.65rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Coming for Members
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon:  "◫",
                title: "Style Archive",
                desc:  "Every brief from the past 52 weeks. Your complete style reference, always growing.",
              },
              {
                icon:  "◈",
                title: "Seasonal Lookbooks",
                desc:  "Curated collections by season — Spring/Summer and Fall/Winter editions for members only.",
              },
              {
                icon:  "◉",
                title: "Member Perks",
                desc:  "Exclusive discounts with Ellie's trusted retailers. Coming to members this season.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 relative overflow-hidden"
                style={{ border: "1px solid var(--sand-border)", background: "var(--cream)" }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.25), transparent)" }}
                />
                <div
                  className="text-2xl mb-4 select-none"
                  style={{ color: "var(--sand-dark)", opacity: 0.5 }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
                <h3
                  className="font-bold mb-2"
                  style={{ fontFamily: "DM Serif Display, serif", color: "var(--charcoal)", fontSize: "1.05rem" }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                  fontFamily: "Cormorant Garamond, serif",
                  color:      "var(--charcoal-muted)",
                  fontSize:   "1.05rem",
                  lineHeight: "1.75",
                  }}
                >
                  {item.desc}
                </p>
                <p
                  className="mt-4 text-xs uppercase tracking-widest"
                  style={{ color: "var(--taupe)", letterSpacing: "0.2em", fontFamily: "Inter, sans-serif" }}
                >
                  Coming soon
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Ellie ────────────────────────────────────────── */}
      <section className="py-12 px-5 sm:px-8" style={{ borderTop: "1px solid var(--sand-border)" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)", fontFamily: "Arial, sans-serif" }}>
            Need Help?
          </p>
          <h2 style={{ margin: "0 0 6px", fontFamily: "DM Serif Display, serif", fontSize: "1.4rem", color: "var(--charcoal)", fontWeight: 400 }}>
            Ask Ellie directly.
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--warm-gray)", fontFamily: "Georgia, serif", lineHeight: 1.7 }}>
            Billing question, missing brief, feedback — Ellie reads every message personally and responds within 24 hours.
          </p>
          <ContactForm compact />
        </div>
      </section>

      {/* ── Refer a Friend ───────────────────────────────────────── */}
      <section className="py-12 px-5 sm:px-8" style={{ background: "#EDE5D8", borderTop: "1px solid var(--sand-border)" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)", fontFamily: "Arial, sans-serif" }}>
            Refer a Friend
          </p>
          <h2 style={{ margin: "0 0 10px", fontFamily: "DM Serif Display, serif", fontSize: "1.5rem", color: "var(--charcoal)", fontWeight: 400 }}>
            Give 50% off. Keep good company.
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--warm-gray)", fontFamily: "Georgia, serif", lineHeight: 1.7 }}>
            Share your unique link with a friend. They get 50% off their first month — 
            and you get the satisfaction of sending someone something genuinely useful.
            No limit on referrals.
          </p>
          {customerId ? (
            <ReferralButton customerId={customerId} />
          ) : (
            <p style={{ fontSize: "12px", color: "var(--warm-gray)", fontFamily: "Arial, sans-serif" }}>
              Referral link available after your first billing cycle. Check back soon.
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="py-8 px-5 sm:px-8"
        style={{ background: "var(--cream)", borderTop: "1px solid var(--sand-border)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily:    "DM Serif Display, serif",
                color:         "var(--charcoal)",
                fontSize:      "0.95rem",
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
              fontSize:      "0.65rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop:     "2px",
              }}
            >
              The Style Refresh
            </span>
          </div>
          <p
            style={{ fontFamily: "Inter, sans-serif", color: "var(--warm-gray)", fontSize: "0.8rem" }}
          >
            VIP Room · Membership renews monthly
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center sm:justify-end">
            <Link
              href="/membership"
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--warm-gray)",
                fontSize:      "0.78rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Membership terms
            </Link>
            <a
              href={`/api/billing-portal?cid=${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--warm-gray)",
                fontSize:      "0.78rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Manage Subscription
            </a>
            <Link
              href="/"
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "var(--warm-gray)",
                fontSize:      "0.78rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Back to Site
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

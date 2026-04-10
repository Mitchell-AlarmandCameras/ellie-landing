import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { currentWeek, archiveWeeks, type WeeklyLookbook } from "@/data/lookbook";
import ReferralButton from "@/components/ReferralButton";
import ContactForm from "@/components/ContactForm";
import SaveButton from "@/components/SaveButton";

export const metadata: Metadata = {
  title: "VIP Room | ELLIE — The Style Refresh",
  robots: { index: false, follow: false },
};

/* Always server-render so the latest approved brief is always shown */
export const dynamic = "force-dynamic";

/* ── Fetch all 4 weekly hero images for VIP Room ──────────────────
   [0] = welcome header background
   [1] = The Executive card
   [2] = The Weekender card
   [3] = The Wildcard card
   Falls back to 4 curated Unsplash photos if no Blob data. */
const HERO_FALLBACKS = [
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
];

async function getHeroImages(): Promise<string[]> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return HERO_FALLBACKS;
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-hero/" });
    const current = blobs.find(b => b.pathname === "ellie-hero/current.json");
    if (!current) return HERO_FALLBACKS;
    const res = await fetch(current.url, { cache: "no-store" });
    if (!res.ok) return HERO_FALLBACKS;
    const data = await res.json() as { images?: Array<{ url: string }> };
    if (data?.images?.length === 4) return data.images.map(img => img.url);
    return HERO_FALLBACKS;
  } catch {
    return HERO_FALLBACKS;
  }
}

/* ── Fetch the latest approved brief from Vercel Blob ──────────────
   Falls back to the static lookbook.ts if no approved brief exists yet.
   This ensures the dashboard always matches what went out in Monday's email. */
async function getLiveWeek(): Promise<WeeklyLookbook> {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return currentWeek;

    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "ellie-approved/" });
    const approvedBlob = blobs
      .filter(b => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

    if (!approvedBlob) return currentWeek;

    const res  = await fetch(approvedBlob.url, { cache: "no-store" });
    if (!res.ok) return currentWeek;
    const data = await res.json() as WeeklyLookbook & { approvedAt?: string };

    /* Only use the Blob version if it's for a strictly NEWER week than the static lookbook.
       Parse both as dates — fall back to string compare if date parse fails.
       If equal or blob is older, the static lookbook (with manual fixes) wins. */
    const parseWeek = (s: string) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const blobDate   = parseWeek(data?.weekOf ?? "");
    const staticDate = parseWeek(currentWeek.weekOf ?? "");
    if (data?.looks?.length && blobDate > staticDate) return data as WeeklyLookbook;
  } catch {
    /* silently fall back */
  }
  return currentWeek;
}

/* ═══════════════════════════════════════════════════════════════
   VIP ROOM — Server Component (cookie-gated)
═══════════════════════════════════════════════════════════════ */
export default async function DashboardPage() {
  const cookieStore  = cookies();
  const hasAccess    = cookieStore.get("ellie_access")?.value === "true";
  const customerId   = cookieStore.get("ellie_customer")?.value ?? "";

  if (!hasAccess) redirect("/login");

  const week        = await getLiveWeek();
  const heroImages  = await getHeroImages();
  const hasArchive  = archiveWeeks.length > 0;

  return (
    <div className="min-h-screen vip-bg">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background:     "rgba(20,18,15,0.97)",
          backdropFilter: "blur(24px)",
          borderBottom:   "1px solid rgba(196,149,106,0.15)",
          boxShadow:      "0 1px 0 rgba(0,0,0,0.3)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">

          {/* Brand — clicking takes you home */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex flex-col leading-none group" style={{ textDecoration: "none" }} title="Back to homepage">
              <span
                className="transition-opacity group-hover:opacity-60"
                style={{
                  fontFamily:    "DM Serif Display, serif",
                  color:         "#FDFAF5",
                  fontSize:      "1rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Ellie
              </span>
              <span
                className="transition-opacity group-hover:opacity-60"
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "#C4956A",
                  fontSize:      "0.66rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginTop:     "1px",
                }}
              >
                The Style Refresh
              </span>
            </Link>

            <div
              className="hidden sm:flex items-center px-3 py-1"
              style={{
                border:     "1px solid rgba(196,149,106,0.4)",
                background: "rgba(196,149,106,0.08)",
              }}
            >
              <span
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "#C4956A",
                  fontSize:      "0.66rem",
                  letterSpacing: "0.28em",
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
              className="hidden sm:block uppercase tracking-widest transition-opacity hover:opacity-100"
              style={{ fontSize: "0.72rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "rgba(253,250,245,0.45)", opacity: 0.7 }}
            >
              Billing
            </a>
            <Link
              href="/bag"
              className="uppercase tracking-widest transition-all"
              style={{ fontSize: "0.72rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "rgba(253,250,245,0.7)", border: "1px solid rgba(253,250,245,0.2)", padding: "0.3rem 0.9rem" }}
            >
              My Edit ♡
            </Link>
            <a
              href="/api/logout"
              className="uppercase tracking-widest transition-all"
              style={{ fontSize: "0.72rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.15em", color: "#C4956A", border: "1px solid rgba(196,149,106,0.4)", padding: "0.3rem 0.9rem" }}
            >
              Log Out
            </a>
          </div>
        </div>
      </header>

      {/* ── Welcome banner ───────────────────────────────────────── */}
      <section
        className="py-20 sm:py-32 px-5 sm:px-8 text-center relative overflow-hidden"
        style={{ background: "#1A1714", borderBottom: "1px solid rgba(196,149,106,0.18)" }}
      >
        {/* Weekly editorial background photo */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:    `url(${heroImages[0]})`,
            backgroundSize:     "cover",
            backgroundPosition: "center 25%",
            opacity:            0.32,
          }}
        />
        {/* Vignette — lighter center so the photo actually reads */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: "radial-gradient(ellipse 120% 100% at 50% 40%, rgba(20,18,14,0.22) 0%, rgba(20,18,14,0.75) 60%, rgba(20,18,14,0.96) 100%)",
          }}
        />
        {/* Bottom fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          aria-hidden="true"
          style={{ background: "linear-gradient(transparent, #1E1B17)" }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10" style={{ background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.5))" }} />
            <span
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "#C4956A",
                fontSize:      "0.7rem",
                letterSpacing: "0.36em",
                textTransform: "uppercase",
                fontWeight:    500,
              }}
            >
              Current Edition
            </span>
            <div className="h-px w-10" style={{ background: "linear-gradient(90deg, rgba(196,149,106,0.5), transparent)" }} />
          </div>

          <h1
            className="font-bold leading-tight mb-6"
            style={{
              fontFamily: "DM Serif Display, serif",
              color:      "#FDFAF5",
              fontSize:   "clamp(2rem, 6vw, 3.4rem)",
              lineHeight: "1.1",
              textShadow: "0 2px 32px rgba(0,0,0,0.5)",
            }}
          >
            You&apos;re in the{" "}
            <em className="not-italic" style={{ color: "#C4956A" }}>VIP Room.</em>
          </h1>

          <div
            className="mx-auto my-6"
            style={{
              width:      "48px",
              height:     "1px",
              background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.6), transparent)",
            }}
          />

          <p
            style={{
              fontFamily: "Cormorant Garamond, serif",
              color:      "rgba(253,250,245,0.65)",
              fontSize:   "clamp(1.1rem, 3.5vw, 1.25rem)",
              lineHeight: "1.9",
              maxWidth:   "32rem",
              margin:     "0 auto",
              fontStyle:  "italic",
            }}
          >
            {week.editorialLead}
          </p>
        </div>
      </section>

      {/* ── Gold section divider ─────────────────────────────────── */}
      <div className="flex items-center justify-center gap-5 py-8 px-5" style={{ background: "#1E1B17" }} aria-hidden="true">
        <div className="flex-1 max-w-xs h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.25))" }} />
        <span style={{ color: "rgba(196,149,106,0.5)", fontSize: "0.55rem", letterSpacing: "0.5em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>This Week</span>
        <div className="flex-1 max-w-xs h-px" style={{ background: "linear-gradient(90deg, rgba(196,149,106,0.25), transparent)" }} />
      </div>

      {/* ── Lookbook — This Week's Brief ─────────────────────────── */}
      <section className="pb-16 sm:pb-24 px-5 sm:px-8" style={{ background: "#1E1B17" }}>
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <span
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "#C4956A",
                fontSize:      "0.7rem",
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                fontWeight:    500,
                display:       "block",
                marginBottom:  "12px",
              }}
            >
              Full Sourced Edition
            </span>
            <h2
              className="font-bold"
              style={{
                fontFamily: "DM Serif Display, serif",
                color:      "#FDFAF5",
                fontSize:   "clamp(1.5rem, 4vw, 2.2rem)",
              }}
            >
              This Week&apos;s Blueprint
            </h2>
            <div
              className="mx-auto mt-5"
              style={{ width: "48px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.5), transparent)" }}
            />
          </div>

          {/* Look cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8">
            {week.looks.map((look, cardIdx) => {
              const cardImg = heroImages[cardIdx + 1] ?? heroImages[0];
              return (
              <div key={look.label}>
                {/* Mobile-only numbered divider between cards */}
                {cardIdx > 0 && (
                  <div className="flex items-center gap-4 mb-10 lg:hidden" aria-hidden="true">
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.4))" }} />
                    <span style={{ fontFamily: "DM Serif Display, serif", color: "#C4956A", fontSize: "1rem", letterSpacing: "0.2em" }}>
                      {look.index}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(196,149,106,0.4), transparent)" }} />
                  </div>
                )}
              <article
                className="relative flex flex-col overflow-hidden"
                style={{
                  background:  "#252018",
                  border:      "1px solid rgba(196,149,106,0.22)",
                  borderTop:   "3px solid #C4956A",
                  boxShadow:   "0 -4px 24px rgba(196,149,106,0.12), 0 8px 48px rgba(0,0,0,0.55)",
                }}
              >
                {/* Editorial photo background — matches the look's mood */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  aria-hidden="true"
                  style={{
                    backgroundImage:    `url(${cardImg})`,
                    backgroundSize:     "cover",
                    backgroundPosition: "center top",
                    opacity:            0.13,
                  }}
                />
                {/* Dark overlay so text stays readable */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  aria-hidden="true"
                  style={{
                    background: "linear-gradient(180deg, rgba(37,32,24,0.55) 0%, rgba(37,32,24,0.92) 55%, #252018 100%)",
                  }}
                />
                {/* Ghost index — bottom-right, behind content */}
                <span
                  className="absolute bottom-4 right-5 select-none font-bold leading-none pointer-events-none"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    fontSize:   "3.5rem",
                    color:      "rgba(196,149,106,0.28)",
                    lineHeight: "1",
                    zIndex:     0,
                  }}
                  aria-hidden="true"
                >
                  {look.index}
                </span>

                <div className="p-7 sm:p-8 flex flex-col flex-1" style={{ position: "relative", zIndex: 1 }}>

                  {/* Label */}
                  <span
                    style={{
                      fontFamily:    "Inter, sans-serif",
                      color:         "#C4956A",
                      fontSize:      "0.7rem",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      fontWeight:    500,
                      display:       "block",
                      marginBottom:  "8px",
                    }}
                  >
                    {look.label}
                  </span>

                  <h3
                    className="font-bold mb-4"
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      color:      "#FDFAF5",
                      fontSize:   "1.2rem",
                      lineHeight: "1.3",
                    }}
                  >
                    {look.tagline}
                  </h3>

                  <div
                    className="mb-5"
                    style={{ width: "32px", height: "1px", background: "linear-gradient(90deg, #C4956A, rgba(196,149,106,0.2))" }}
                  />

                  <p
                    className="mb-7"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      color:      "rgba(253,250,245,0.6)",
                      fontSize:   "1.05rem",
                      lineHeight: "1.85",
                    }}
                  >
                    {look.description}
                  </p>

                  {/* Sourced item list */}
                  <ul className="space-y-4 mb-7 flex-1">
                    {look.items.map((item) => (
                      <li
                        key={item.piece}
                        className="pb-4"
                        style={{ borderBottom: "1px solid rgba(196,149,106,0.12)" }}
                      >
                        {/* Piece name + buttons */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span
                            style={{
                              fontFamily: "Inter, sans-serif",
                              color:      "#FDFAF5",
                              fontSize:   "0.88rem",
                              fontWeight: 500,
                              lineHeight: "1.5",
                            }}
                          >
                            {item.piece}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`/api/go?to=${encodeURIComponent(item.buyLink)}&src=dashboard&q=${encodeURIComponent(item.piece + " " + item.brand)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Shop ${item.piece} at ${item.brand}`}
                              className="vip-shop-btn"
                              style={{
                                display:        "inline-flex",
                                alignItems:     "center",
                                padding:        "0.35rem 0.85rem",
                                fontFamily:     "Inter, sans-serif",
                                fontSize:       "0.68rem",
                                letterSpacing:  "0.16em",
                                textTransform:  "uppercase",
                                color:          "#C4956A",
                                border:         "1px solid rgba(196,149,106,0.45)",
                                background:     "transparent",
                                textDecoration: "none",
                                whiteSpace:     "nowrap",
                              }}
                            >
                              Shop →
                            </a>
                            <SaveButton
                              item={{
                                piece:   item.piece,
                                brand:   item.brand,
                                price:   item.price,
                                note:    item.note,
                                buyLink: item.buyLink,
                                look:    look.label,
                                weekOf:  week.weekOf,
                              }}
                            />
                          </div>
                        </div>

                        {/* Brand */}
                        <span
                          style={{
                            fontFamily:    "Inter, sans-serif",
                            color:         "rgba(253,250,245,0.4)",
                            fontSize:      "0.74rem",
                            letterSpacing: "0.1em",
                            display:       "block",
                            marginBottom:  "6px",
                          }}
                        >
                          {item.brand}
                        </span>

                        {/* Ellie's note per item */}
                        <p
                          style={{
                            fontFamily: "Cormorant Garamond, serif",
                            color:      "rgba(253,250,245,0.45)",
                            fontSize:   "0.95rem",
                            lineHeight: "1.7",
                            fontStyle:  "italic",
                          }}
                        >
                          {item.note}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Ellie's editor note callout */}
                  <div
                    className="p-4 mt-auto"
                    style={{
                      background:  "rgba(196,149,106,0.07)",
                      borderLeft:  "2px solid rgba(196,149,106,0.5)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily:    "Inter, sans-serif",
                        color:         "#C4956A",
                        fontSize:      "0.68rem",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        fontWeight:    500,
                        display:       "block",
                        marginBottom:  "6px",
                      }}
                    >
                      Ellie&apos;s Note
                    </span>
                    <p
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        color:      "rgba(253,250,245,0.65)",
                        fontSize:   "1rem",
                        lineHeight: "1.75",
                        fontStyle:  "italic",
                      }}
                    >
                      {look.editorsNote}
                    </p>
                  </div>
                </div>
              </article>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Archive (shown only when archive has entries) ─────────── */}
      {hasArchive && (
        <section
          className="py-16 sm:py-20 px-5 sm:px-8"
          style={{ background: "#171410", borderTop: "1px solid rgba(196,149,106,0.1)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "#C4956A",
                  fontSize:      "0.7rem",
                  letterSpacing: "0.34em",
                  textTransform: "uppercase",
                  fontWeight:    500,
                  display:       "block",
                  marginBottom:  "10px",
                }}
              >
                Past Editions
              </span>
              <h2
                className="font-bold"
                style={{
                  fontFamily: "DM Serif Display, serif",
                  color:      "#FDFAF5",
                  fontSize:   "clamp(1.4rem, 4vw, 1.9rem)",
                }}
              >
                The Archive
              </h2>
              <div
                className="mx-auto mt-4"
                style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.5), transparent)" }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archiveWeeks.map((aw) => (
                <div
                  key={aw.weekOf}
                  className="p-6"
                  style={{
                    background: "#222018",
                    border:     "1px solid rgba(196,149,106,0.15)",
                    borderTop:  "1px solid rgba(196,149,106,0.3)",
                  }}
                >
                  <span
                    style={{
                      fontFamily:    "Inter, sans-serif",
                      color:         "#C4956A",
                      fontSize:      "0.68rem",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontWeight:    500,
                    }}
                  >
                    Week of
                  </span>
                  <p
                    className="mt-1 font-bold"
                    style={{
                      fontFamily: "DM Serif Display, serif",
                      color:      "#FDFAF5",
                      fontSize:   "1.05rem",
                    }}
                  >
                    {aw.weekOf}
                  </p>
                  <p
                    className="mt-2 line-clamp-2"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      color:      "rgba(253,250,245,0.5)",
                      fontSize:   "0.98rem",
                      lineHeight: "1.7",
                      fontStyle:  "italic",
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
        className="py-14 px-5 sm:px-8"
        style={{ background: "#1A1714", borderTop: "1px solid rgba(196,149,106,0.1)" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-center mb-8"
            style={{
              fontFamily:    "Inter, sans-serif",
              color:         "rgba(196,149,106,0.6)",
              fontSize:      "0.66rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
            }}
          >
            Coming for Members
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                title: "Style Archive",
                desc:  "Every brief from the past 52 weeks. Your complete style reference, always growing.",
              },
              {
                title: "Seasonal Lookbooks",
                desc:  "Curated collections by season — Spring/Summer and Fall/Winter editions for members only.",
              },
              {
                title: "Member Perks",
                desc:  "Exclusive discounts with Ellie's trusted retailers. Coming to members this season.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 relative overflow-hidden"
                style={{
                  background: "#222018",
                  border:     "1px solid rgba(196,149,106,0.12)",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(196,149,106,0.3), transparent)" }}
                  aria-hidden="true"
                />
                <h3
                  className="font-bold mb-3"
                  style={{ fontFamily: "DM Serif Display, serif", color: "#FDFAF5", fontSize: "1.05rem" }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    color:      "rgba(253,250,245,0.5)",
                    fontSize:   "1.02rem",
                    lineHeight: "1.75",
                  }}
                >
                  {item.desc}
                </p>
                <p
                  className="mt-5 uppercase"
                  style={{ color: "rgba(196,149,106,0.5)", letterSpacing: "0.22em", fontFamily: "Inter, sans-serif", fontSize: "0.66rem" }}
                >
                  Coming soon
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Ellie ────────────────────────────────────────── */}
      <section className="py-12 px-5 sm:px-8" style={{ background: "#171410", borderTop: "1px solid rgba(196,149,106,0.1)" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ margin: "0 0 5px", fontSize: "0.68rem", letterSpacing: "0.32em", textTransform: "uppercase", color: "#C4956A", fontFamily: "Inter, sans-serif" }}>
            Need Help?
          </p>
          <h2 style={{ margin: "0 0 8px", fontFamily: "DM Serif Display, serif", fontSize: "1.4rem", color: "#FDFAF5", fontWeight: 400 }}>
            Ask Ellie directly.
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: "1rem", color: "rgba(253,250,245,0.5)", fontFamily: "Cormorant Garamond, serif", lineHeight: 1.8 }}>
            Billing question, missing brief, feedback — Ellie reads every message personally and responds within 24 hours.
          </p>
          <ContactForm compact />
        </div>
      </section>

      {/* ── Refer a Friend ───────────────────────────────────────── */}
      <section className="py-12 px-5 sm:px-8" style={{ background: "#1A1714", borderTop: "1px solid rgba(196,149,106,0.1)" }}>
        <div className="max-w-2xl mx-auto">
          <p style={{ margin: "0 0 5px", fontSize: "0.68rem", letterSpacing: "0.32em", textTransform: "uppercase", color: "#C4956A", fontFamily: "Inter, sans-serif" }}>
            Refer a Friend
          </p>
          <h2 style={{ margin: "0 0 10px", fontFamily: "DM Serif Display, serif", fontSize: "1.5rem", color: "#FDFAF5", fontWeight: 400 }}>
            Give 50% off. Keep good company.
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: "1rem", color: "rgba(253,250,245,0.5)", fontFamily: "Cormorant Garamond, serif", lineHeight: 1.8 }}>
            Share your unique link with a friend. They get 50% off their first month —
            and you get the satisfaction of sending someone something genuinely useful.
            No limit on referrals.
          </p>
          {customerId ? (
            <ReferralButton customerId={customerId} />
          ) : (
            <p style={{ fontSize: "0.82rem", color: "rgba(253,250,245,0.35)", fontFamily: "Inter, sans-serif" }}>
              Referral link available after your first billing cycle. Check back soon.
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="py-8 px-5 sm:px-8"
        style={{ background: "#141210", borderTop: "1px solid rgba(196,149,106,0.12)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily:    "DM Serif Display, serif",
                color:         "#FDFAF5",
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
                color:         "#C4956A",
                fontSize:      "0.62rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginTop:     "2px",
              }}
            >
              The Style Refresh
            </span>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", color: "rgba(253,250,245,0.3)", fontSize: "0.76rem", letterSpacing: "0.06em" }}>
            VIP Room · Membership renews monthly
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center sm:justify-end">
            {[
              { label: "Membership Terms", href: "/membership" },
            ].map(l => (
              <Link
                key={l.label}
                href={l.href}
                style={{
                  fontFamily:    "Inter, sans-serif",
                  color:         "rgba(253,250,245,0.35)",
                  fontSize:      "0.72rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={`/api/billing-portal?cid=${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily:    "Inter, sans-serif",
                color:         "rgba(253,250,245,0.35)",
                fontSize:      "0.72rem",
                letterSpacing: "0.14em",
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
                color:         "rgba(196,149,106,0.6)",
                fontSize:      "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              ← Back to Site
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

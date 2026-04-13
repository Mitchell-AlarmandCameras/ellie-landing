import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Press & Media Kit — The Style Refresh by Ellie",
  description:
    "Media kit for The Style Refresh by Ellie — a private fashion membership delivering 3 expertly curated looks every Monday. Available for reviews, collaborations, and editorial coverage.",
};

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

const STORY_ANGLES = [
  {
    headline: "The subscription that replaced her stylist",
    pitch:
      "How Ellie — twenty years working alongside the executives and editors who defined what polished looks like — distilled her fashion expertise into a $19/month inbox experience, and why her members never open their closets on Sunday morning anymore.",
  },
  {
    headline: "AI-curated fashion, human-approved: the new model for personal style",
    pitch:
      "The Style Refresh uses Claude AI to scan every major fashion publication and retailer weekly, then routes everything through a human editor. The result: three looks, every Monday, that actually reflect what's happening in fashion right now.",
  },
  {
    headline: "Quiet luxury for the inbox era",
    pitch:
      "As the 'quiet luxury' aesthetic reshapes how women dress, The Style Refresh delivers editorial curation that prioritizes longevity over trend — making it the anti-fast-fashion subscription.",
  },
  {
    headline: "Less scrolling, better dressing",
    pitch:
      "Members report spending zero time on fashion discovery — they open one email on Monday morning, click a link, and dress. The Style Refresh makes the case that curation, not content, is what women actually want.",
  },
];

const WHAT_MEMBERS_GET = [
  "Three complete women's looks every Monday morning — every item named by brand and price",
  "Access to the VIP Room dashboard — a private lookbook that updates weekly",
  "Ellie's sourcing notes: why each piece was chosen, what it pairs with, who makes it best",
  "Brand and price for every item — no searching, no guessing",
  "A personal 'My Edit' saved items bag for ongoing style planning",
  "Referral program — members earn a free month for every friend who joins",
];

const PRESS_ASSETS = [
  { label: "Site screenshot — homepage hero", note: "Available on request" },
  { label: "VIP Room dashboard screenshot", note: "Available on request" },
  { label: "Sample Monday brief (full email)", note: "Available on request" },
  { label: "Founder bio photo", note: "Available on request" },
  { label: "Brand logo — horizontal (PNG, SVG)", note: "Available on request" },
];

export default function PressPage() {
  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(253,250,245,0.96)", borderBottom: "1px solid var(--sand-border)",
        padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "DM Serif Display, serif", fontSize: "1.05rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--charcoal)" }}>Ellie</span>
          <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.65rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--blush)", marginTop: "1px" }}>The Style Refresh</span>
        </Link>
        <Link
          href="/contact"
          style={{
            fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--cream)", background: "var(--charcoal)",
            padding: "0.5rem 1.2rem", textDecoration: "none",
          }}
        >
          Contact Press
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: "var(--charcoal)", padding: "72px 32px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(196,149,106,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: "760px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p style={{
            margin: "0 0 16px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem",
            letterSpacing: "0.34em", textTransform: "uppercase", color: "rgba(196,149,106,0.9)",
          }}>
            Press &amp; Media
          </p>
          <h1 style={{
            margin: "0 0 20px", fontFamily: "DM Serif Display, serif",
            color: "#FDFAF5", fontSize: "clamp(2rem, 6vw, 3.4rem)",
            fontWeight: 400, lineHeight: 1.1,
          }}>
            The Style Refresh
            <br />
            <em style={{ color: "#C4956A", fontStyle: "normal" }}>by Ellie.</em>
          </h1>
          <div style={{ width: "48px", height: "1px", background: "rgba(196,149,106,0.6)", margin: "0 0 24px" }} />
          <p style={{
            margin: 0, fontFamily: "Cormorant Garamond, serif",
            color: "rgba(253,250,245,0.75)", fontSize: "clamp(1.05rem, 3vw, 1.2rem)", lineHeight: 1.85,
            maxWidth: "560px",
          }}>
            A private fashion membership delivering three complete, sourced-to-the-buy-link
            looks every Monday morning. Built for women who want a personal stylist, not another
            app to scroll.
          </p>
        </div>
      </section>

      {/* ── The product in one sentence ──────────────────────────── */}
      <section style={{ background: "var(--cream-dark)", padding: "56px 32px", borderBottom: "1px solid var(--sand)" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
          {[
            { stat: "$19/mo", label: "Membership price", sub: "Less than a coffee a week" },
            { stat: "3 looks", label: "Every Monday morning", sub: "Every item by brand and price" },
            { stat: "7 days", label: "Free trial", sub: "No charge until day 8" },
            { stat: "24/7", label: "AI + human curation", sub: "Claude scans, Ellie approves" },
          ].map(({ stat, label, sub }) => (
            <div key={label} style={{
              background: "#FDFAF5", border: "1px solid var(--sand-border)",
              borderTop: "3px solid var(--blush)", padding: "20px 18px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "DM Serif Display, serif", fontSize: "2rem", color: "var(--charcoal)", marginBottom: "6px" }}>{stat}</div>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--blush)", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: "0.75rem", color: "var(--warm-gray)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 32px" }}>

        {/* ── Story angles ───────────────────────────────────────── */}
        <section style={{ padding: "56px 0 0" }}>
          <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)" }}>
            Story Angles
          </p>
          <h2 style={{ margin: "0 0 32px", fontFamily: "DM Serif Display, serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", color: "var(--charcoal)", fontWeight: 400 }}>
            Ways to cover The Style Refresh
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {STORY_ANGLES.map((a) => (
              <div key={a.headline} style={{
                background: "var(--cream-dark)", border: "1px solid var(--sand-border)",
                borderLeft: "3px solid var(--blush)", padding: "20px 22px",
              }}>
                <p style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", fontSize: "1rem", color: "var(--charcoal)", fontWeight: 600, lineHeight: 1.4 }}>
                  &ldquo;{a.headline}&rdquo;
                </p>
                <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: "0.82rem", color: "var(--warm-gray)", lineHeight: 1.7 }}>
                  {a.pitch}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What members get ───────────────────────────────────── */}
        <section style={{ padding: "56px 0 0" }}>
          <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)" }}>
            The Membership
          </p>
          <h2 style={{ margin: "0 0 28px", fontFamily: "DM Serif Display, serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", color: "var(--charcoal)", fontWeight: 400 }}>
            What members receive
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
            {WHAT_MEMBERS_GET.map((item) => (
              <li key={item} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ color: "var(--blush)", marginTop: "3px", flexShrink: 0 }}>✦</span>
                <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.88rem", color: "var(--charcoal-muted)", lineHeight: 1.7 }}>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Sample brief offer ─────────────────────────────────── */}
        <section style={{ padding: "56px 0 0" }}>
          <div style={{ background: "var(--charcoal)", padding: "32px 36px" }}>
            <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(196,149,106,0.9)" }}>
              For Reviewers &amp; Collaborators
            </p>
            <h2 style={{ margin: "0 0 16px", fontFamily: "DM Serif Display, serif", fontSize: "1.6rem", color: "#FDFAF5", fontWeight: 400 }}>
              Free 3-month membership for press and creators
            </h2>
            <p style={{ margin: "0 0 24px", fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "rgba(253,250,245,0.75)", lineHeight: 1.8 }}>
              We offer a complimentary 3-month membership to journalists, bloggers, and content
              creators who want to experience The Style Refresh firsthand before writing about it.
              No positive review required — just honest. We also provide a custom referral link
              so any signups from your audience are tracked and credited.
            </p>
            <Link
              href="/contact"
              style={{
                display: "inline-block", background: "#C4956A", color: "#FDFAF5",
                padding: "14px 32px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem",
                letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none",
              }}
            >
              Request Press Membership
            </Link>
          </div>
        </section>

        {/* ── Press assets ───────────────────────────────────────── */}
        <section style={{ padding: "56px 0 0" }}>
          <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)" }}>
            Media Assets
          </p>
          <h2 style={{ margin: "0 0 24px", fontFamily: "DM Serif Display, serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", color: "var(--charcoal)", fontWeight: 400 }}>
            Available on request
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {PRESS_ASSETS.map((a) => (
              <div key={a.label} style={{
                background: "var(--cream-dark)", border: "1px solid var(--sand-border)",
                padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "12px",
              }}>
                <span style={{ color: "var(--blush)", fontSize: "1rem", marginTop: "1px" }}>▸</span>
                <div>
                  <p style={{ margin: "0 0 2px", fontFamily: "Arial, sans-serif", fontSize: "0.82rem", color: "var(--charcoal)", fontWeight: 600 }}>{a.label}</p>
                  <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: "0.75rem", color: "var(--warm-gray)" }}>{a.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ────────────────────────────────────────────── */}
        <section style={{ padding: "56px 0" }}>
          <div style={{ background: "var(--cream-dark)", border: "1px solid var(--sand-border)", padding: "32px 36px" }}>
            <p style={{ margin: "0 0 6px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--blush)" }}>
              Press Contact
            </p>
            <h2 style={{ margin: "0 0 16px", fontFamily: "DM Serif Display, serif", fontSize: "1.6rem", color: "var(--charcoal)", fontWeight: 400 }}>
              Get in touch
            </h2>
            <p style={{ margin: "0 0 20px", fontFamily: "Arial, sans-serif", fontSize: "0.88rem", color: "var(--charcoal-muted)", lineHeight: 1.75 }}>
              For editorial requests, review memberships, brand partnerships, or media inquiries,
              reach out directly. We respond within 24 hours.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link
                href="/contact"
                style={{
                  display: "inline-block", background: "var(--charcoal)", color: "var(--cream)",
                  padding: "12px 28px", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
                  letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none",
                }}
              >
                Send a Press Message →
              </Link>
              <Link
                href={SITE_URL}
                style={{
                  display: "inline-block", background: "transparent",
                  border: "1px solid var(--blush)", color: "var(--blush)",
                  padding: "12px 28px", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
                  letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none",
                }}
              >
                View the site →
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--sand)", background: "var(--cream-dark)",
        padding: "28px 32px", textAlign: "center",
      }}>
        <p style={{ margin: "0 0 4px", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--blush)" }}>
          The Style Refresh by Ellie
        </p>
        <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: "0.75rem", color: "var(--warm-gray)" }}>
          {process.env.BUSINESS_MAILING_ADDRESS ?? "3811 Ditmars Blvd #2278 · Astoria, NY 11105"}
          {" · "}
          <Link href={SITE_URL} style={{ color: "var(--blush)", textDecoration: "none" }}>stylebyellie.com</Link>
        </p>
      </footer>

    </div>
  );
}

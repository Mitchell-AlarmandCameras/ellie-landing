import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Capsule Wardrobe Guide for Women 2026 — Build Yours in 10 Pieces | The Style Refresh",
  description:
    "Ellie's complete capsule wardrobe guide for women. 10 timeless pieces that create 30+ outfits. No trends, no waste — just a wardrobe that works every single day.",
  keywords: [
    "capsule wardrobe women",
    "capsule wardrobe guide 2026",
    "how to build a capsule wardrobe",
    "minimalist wardrobe women",
    "10 piece wardrobe",
    "timeless fashion women",
    "wardrobe essentials women",
    "capsule wardrobe basics",
    "women's fashion subscription",
    "personal stylist online",
  ],
  openGraph: {
    title: "Capsule Wardrobe Guide for Women 2026 — Build Yours in 10 Pieces",
    description:
      "10 timeless pieces that create 30+ outfits. Ellie's complete capsule wardrobe guide — no trends, no waste.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capsule Wardrobe Guide for Women 2026",
    description: "10 timeless pieces that create 30+ outfits. Ellie's complete guide.",
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Capsule Wardrobe Guide for Women 2026 — Build Yours in 10 Pieces",
  description:
    "A complete guide to building a capsule wardrobe from personal stylist Ellie — 10 timeless pieces that work across every occasion.",
  author: { "@type": "Person", name: "Ellie", url: SITE_URL },
  publisher: {
    "@type": "Organization",
    name: "The Style Refresh",
    url: SITE_URL,
  },
  mainEntityOfPage: `${SITE_URL}/capsule-wardrobe`,
};

const pieces = [
  {
    num: "01",
    name: "The Tailored Blazer",
    detail:
      "The single most versatile piece in any capsule. One blazer in a neutral — charcoal, camel, or ivory — elevates every other item you own. Wear it over a dress, with trousers, or thrown over jeans on weekends.",
    brands: "Vince · Theory · J.Crew",
  },
  {
    num: "02",
    name: "The White Shirt",
    detail:
      "Crisp, fitted, tucked in or left open over a tank. The white shirt is the most photographed piece in fashion for a reason — it never fails. Poplin for structure, linen for summer.",
    brands: "Equipment · Everlane · Banana Republic",
  },
  {
    num: "03",
    name: "The Straight-Leg Trouser",
    detail:
      "High-rise, straight-leg, structured fabric. Not a skinny jean, not palazzo pants — a trouser. Pairs with every top in this list and works from morning meetings to dinner.",
    brands: "Veronica Beard · Vince Camuto · Banana Republic",
  },
  {
    num: "04",
    name: "The Dark Wash Jean",
    detail:
      "One pair of dark indigo straight-leg or slim-straight jeans. The bridge between smart and casual. Dressed up with heels and a silk shell — dressed down with a white tee and loafers.",
    brands: "Frame · AG Jeans · Madewell",
  },
  {
    num: "05",
    name: "The Silk Shell",
    detail:
      "A fitted silk or silk-look cami in bone, cream, or champagne. Layers under blazers, tucks into trousers, and works alone on warmer days. Twelve outfits from one piece.",
    brands: "Equipment · Joie · WAYF at Nordstrom",
  },
  {
    num: "06",
    name: "The Cashmere Knit",
    detail:
      "Mid-weight, relaxed-but-not-oversized. Cashmere bridges every season and every occasion. This is the piece that makes a jeans-and-trouser wardrobe feel finished.",
    brands: "Naadam · Vince · Brunello Cucinelli",
  },
  {
    num: "07",
    name: "The Midi Dress",
    detail:
      "One fluid, midi-length dress in a solid neutral or subtle print. Wear alone with sandals in summer. Layer the blazer over it in fall. The most effort-free outfit in the capsule.",
    brands: "Reformation · Vince · Theory",
  },
  {
    num: "08",
    name: "The Trench Coat",
    detail:
      "Classic double-breasted in tan or camel. Not a puffer, not a parka — a trench. It goes over everything in this list and signals intention instantly. A good trench is a 20-year investment.",
    brands: "Burberry · London Fog · Banana Republic",
  },
  {
    num: "09",
    name: "The Leather Flat",
    detail:
      "A pointed-toe or round-toe flat in black or tan leather. The shoe that goes with literally everything — trousers, jeans, dresses, skirts. Loafers or ballet flats both work.",
    brands: "Sam Edelman · Loeffler Randall · Toteme",
  },
  {
    num: "10",
    name: "The Statement Piece",
    detail:
      "One intentional item that shows your personality. A printed silk skirt, a textured bouclé coat, a bold wide-leg trouser. Just one — the statement works because everything around it stays quiet.",
    brands: "Curated fresh every Monday in the brief",
  },
];

const faqs = [
  {
    q: "How many outfits can you make from a 10-piece capsule wardrobe?",
    a: "Realistically 30–40 outfits with strategic pairing. The key is ensuring every piece works with at least 3 others — which is exactly how this list is built.",
  },
  {
    q: "What colors work best for a capsule wardrobe?",
    a: "Neutrals first: black, white, ivory, camel, charcoal, navy. Add one accent color that works with all your neutrals. Everything should mix and match without thinking.",
  },
  {
    q: "How often should you refresh a capsule wardrobe?",
    a: "The core 10 pieces are timeless — you replace them when they wear out, not when trends change. Add 1–2 seasonal pieces each spring and fall to keep things current without cluttering.",
  },
  {
    q: "Is a capsule wardrobe the same as minimalist fashion?",
    a: "Related but different. Minimalism is about owning less. A capsule wardrobe is about owning intentionally — every piece earns its place through versatility. You can have a 50-piece wardrobe and still run on capsule principles.",
  },
  {
    q: "How does The Style Refresh help with my capsule wardrobe?",
    a: "Every Monday I publish three complete looks built from capsule principles — pieces that are versatile and quality-forward. Members get exact brand and price for every item.",
  },
];

export default function CapsuleWardrobePage() {
  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav style={{
        background: "#2C2C2C", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "52px",
      }}>
        <Link href="/" style={{
          color: "#FDFAF5", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.28em", textTransform: "uppercase", textDecoration: "none",
        }}>
          ← Ellie · The Style Refresh
        </Link>
        <Link href="/#join" style={{
          background: "#C4956A", color: "#FDFAF5", padding: "8px 18px",
          fontFamily: "Arial, sans-serif", fontSize: "10px", letterSpacing: "0.2em",
          textTransform: "uppercase", textDecoration: "none",
        }}>
          Join $19/mo
        </Link>
      </nav>

      {/* Hero */}
      <header style={{
        background: "#EDE5D8", padding: "64px 24px 52px", textAlign: "center",
        borderBottom: "1px solid #DDD4C5",
      }}>
        <p style={{
          margin: "0 0 14px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.38em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          Free Guide — Ellie · The Style Refresh
        </p>
        <h1 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "38px", fontWeight: 400, lineHeight: 1.25 }}>
          The Capsule Wardrobe Guide
        </h1>
        <p style={{
          margin: "0 auto 24px", maxWidth: "560px", color: "#4A4A4A",
          fontSize: "17px", lineHeight: 1.8, fontStyle: "italic",
        }}>
          Ten pieces. Thirty outfits. Zero decisions every morning.
          This is the wardrobe architecture that actually works.
        </p>
        <div style={{
          width: "48px", height: "1px", margin: "0 auto 24px",
          background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
        }} />
        <p style={{
          margin: "0 auto", maxWidth: "520px", color: "#6B6560",
          fontSize: "14px", lineHeight: 1.75, fontFamily: "Arial, sans-serif",
        }}>
          Most wardrobes are full of pieces that don&apos;t talk to each other.
          A capsule wardrobe solves this at the root — every piece is chosen
          to work with every other piece. The result is more outfit options with fewer items.
        </p>
      </header>

      {/* Pieces */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "56px 24px" }}>
        {pieces.map((piece, i) => (
          <article key={i} style={{
            background: "#FDFAF5", border: "1px solid #DDD4C5",
            marginBottom: "20px", overflow: "hidden",
          }}>
            <div style={{
              background: "#EDE5D8", padding: "16px 24px",
              display: "flex", alignItems: "baseline", gap: "14px",
            }}>
              <span style={{
                color: "#C4956A", fontFamily: "Arial, sans-serif", fontSize: "11px",
                letterSpacing: "0.3em", textTransform: "uppercase", flexShrink: 0,
              }}>
                {piece.num}
              </span>
              <h2 style={{ margin: 0, color: "#2C2C2C", fontSize: "19px", fontWeight: 400 }}>
                {piece.name}
              </h2>
            </div>
            <div style={{ padding: "18px 24px" }}>
              <p style={{ margin: "0 0 12px", color: "#2C2C2C", fontSize: "15px", lineHeight: 1.8 }}>
                {piece.detail}
              </p>
              <p style={{
                margin: 0, fontSize: "12px", color: "#6B6560", fontStyle: "italic",
                lineHeight: 1.65, borderLeft: "2px solid #C4956A", paddingLeft: "10px",
              }}>
                Brands to consider: {piece.brands}
              </p>
            </div>
          </article>
        ))}

        {/* Quote block */}
        <div style={{
          background: "#2C2C2C", padding: "32px 28px", marginBottom: "40px",
        }}>
          <p style={{
            margin: "0 0 12px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            The Capsule Rule
          </p>
          <p style={{ margin: 0, color: "#FDFAF5", fontSize: "17px", lineHeight: 1.8, fontStyle: "italic" }}>
            &ldquo;Before you buy anything new, ask if it works with at least three things
            you already own. If it doesn&apos;t, it doesn&apos;t belong in a capsule wardrobe.&rdquo;
          </p>
          <p style={{
            margin: "14px 0 0", color: "#8A8580", fontSize: "11px",
            fontFamily: "Arial, sans-serif", letterSpacing: "0.1em",
          }}>
            — Ellie
          </p>
        </div>

        {/* FAQ */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "22px", fontWeight: 400 }}>
            Capsule wardrobe questions, answered
          </h2>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: "#FDFAF5", border: "1px solid #DDD4C5",
              padding: "18px 22px", marginBottom: "10px",
            }}>
              <p style={{ margin: "0 0 8px", color: "#2C2C2C", fontSize: "14px", fontWeight: 700, fontFamily: "Arial, sans-serif" }}>
                {faq.q}
              </p>
              <p style={{ margin: 0, color: "#4A4A4A", fontSize: "14px", lineHeight: 1.75 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <div style={{
          background: "#EDE5D8", border: "1px solid #DDD4C5",
          padding: "40px 32px", textAlign: "center",
        }}>
          <p style={{
            margin: "0 0 8px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            Keep your capsule current
          </p>
          <h2 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "24px", fontWeight: 400 }}>
            The weekly brief — $19/month
          </h2>
          <p style={{
            margin: "0 auto 28px", maxWidth: "460px", color: "#4A4A4A",
            fontSize: "14px", lineHeight: 1.75,
          }}>
            Every Monday — three complete capsule-friendly looks with every piece and every price.
            No searching. No guessing. Just the edit.
          </p>
          <Link href="/#join" style={{
            display: "inline-block", background: "#C4956A", color: "#FDFAF5",
            padding: "14px 42px", fontFamily: "Arial, sans-serif", fontSize: "11px",
            letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
          }}>
            Start My Refresh — $19/mo
          </Link>
          <p style={{
            margin: "12px 0 0", color: "#8A8580", fontSize: "11px",
            fontFamily: "Arial, sans-serif",
          }}>
            Cancel anytime · Secure checkout via Stripe
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: "#1A1A1A", padding: "24px", textAlign: "center" }}>
        <p style={{ margin: 0, color: "#5A5550", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          © {new Date().getFullYear()} The Style Refresh &nbsp;·&nbsp;
          <Link href="/style-guide" style={{ color: "#8A8580", textDecoration: "none" }}>Style Guide</Link>
          &nbsp;·&nbsp;
          <Link href="/blog" style={{ color: "#8A8580", textDecoration: "none" }}>The Edit</Link>
          &nbsp;·&nbsp;
          <Link href="/privacy" style={{ color: "#8A8580", textDecoration: "none" }}>Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

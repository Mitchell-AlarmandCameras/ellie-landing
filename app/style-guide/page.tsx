import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The 5-Piece Formula — Free Style Guide for Women | The Style Refresh",
  description:
    "Ellie's free guide to building a complete, effortless wardrobe with just five " +
    "versatile pieces. Used by 20+ years of private clients. No fluff — just the edit that works.",
  keywords: [
    "women's style guide",
    "personal stylist tips",
    "capsule wardrobe guide",
    "how to dress better women",
    "curated fashion subscription",
    "5 piece wardrobe formula",
    "weekly fashion curation",
    "women's fashion subscription",
    "personal stylist online",
    "direct buy links fashion",
  ],
  openGraph: {
    title: "The 5-Piece Formula — Free Style Guide for Women",
    description:
      "Ellie's free guide to building a complete, effortless wardrobe with just five versatile pieces.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The 5-Piece Formula — Free Style Guide for Women",
    description: "Ellie's free guide to building a complete, effortless wardrobe with just five versatile pieces.",
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "The 5-Piece Formula: How to Build a Complete, Effortless Wardrobe",
  description:
    "A free guide from Ellie — 20 years of private styling distilled into five versatile pieces that form the foundation of any great wardrobe.",
  author: { "@type": "Person", name: "Ellie", url: SITE_URL },
  step: [
    { "@type": "HowToStep", name: "The Foundation Blazer", text: "One tailored blazer in a neutral — charcoal, camel, or ivory. It elevates every other piece you own." },
    { "@type": "HowToStep", name: "The Column Trouser", text: "A clean, high-rise straight-leg in a structured fabric. Not a skinny jean — a trouser. This is the single most overlooked piece." },
    { "@type": "HowToStep", name: "The Silk Shell", text: "A fitted silk or silk-like shell in bone, cream, or your best neutral. It layers under everything and works alone." },
    { "@type": "HowToStep", name: "The Cashmere Knit", text: "One mid-weight cashmere or fine-knit sweater. Relaxed but refined. This piece bridges every season." },
    { "@type": "HowToStep", name: "The Statement Piece", text: "One intentional piece that reflects your personal style — a printed skirt, a textured coat, a bold trouser. Just one. The rest stays neutral." },
  ],
};

const steps = [
  {
    num: "01",
    name: "The Foundation Blazer",
    detail:
      "One tailored blazer in a neutral — charcoal, camel, or ivory. " +
      "Not trendy. Not cropped. Classic single-breasted or double. " +
      "This is the piece that makes everything you already own look intentional.",
    note: "Ellie's pick: Vince or Theory for the tailoring. Worn open over a silk shell for Monday meetings, belted with trousers for dinners.",
  },
  {
    num: "02",
    name: "The Column Trouser",
    detail:
      "A clean, high-rise straight-leg in a structured fabric — crepe, wool, or ponte. " +
      "Not skinny jeans. Not wide-leg palazzo. A trouser. " +
      "This single piece is the most overlooked item in every client's closet.",
    note: "Ellie's pick: Banana Republic or Vince Camuto for value. Veronica Beard if you're building long-term.",
  },
  {
    num: "03",
    name: "The Silk Shell",
    detail:
      "A fitted silk or silk-look cami or tank in bone, cream, or your best neutral. " +
      "It layers under the blazer, tucks into the trouser, and works alone on weekends. " +
      "One piece, twelve outfits.",
    note: "Ellie's pick: Equipment or Joie silk. If budget is a factor, WAYF at Nordstrom is a near-match.",
  },
  {
    num: "04",
    name: "The Cashmere Knit",
    detail:
      "One mid-weight cashmere or fine-knit sweater — relaxed but not oversized. " +
      "This is your bridge piece. Every season, every occasion, every decade.",
    note: "Ellie's pick: Naadam for honest cashmere at a fair price. Brunello Cucinelli if you're ready for a forever piece.",
  },
  {
    num: "05",
    name: "The Statement Piece",
    detail:
      "One intentional item that shows your personality — a printed silk skirt, " +
      "a textured bouclé coat, a bold wide-leg trouser. Just one. " +
      "The statement works because everything around it stays quiet.",
    note: "Ellie's pick: This is where trend pieces belong — in a limited role. I curate exactly this piece every single week in the Monday brief.",
  },
];

export default function StyleGuidePage() {
  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Nav ── */}
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

      {/* ── Hero ── */}
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
          The 5-Piece Formula
        </h1>
        <p style={{
          margin: "0 auto 24px", maxWidth: "560px", color: "#4A4A4A",
          fontSize: "17px", lineHeight: 1.8, fontStyle: "italic",
        }}>
          Twenty years of private styling, distilled into five versatile pieces
          that form the foundation of any effortless wardrobe.
        </p>
        <div style={{
          width: "48px", height: "1px", margin: "0 auto 24px",
          background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
        }} />
        <p style={{
          margin: "0 auto", maxWidth: "500px", color: "#6B6560",
          fontSize: "14px", lineHeight: 1.75, fontFamily: "Arial, sans-serif",
        }}>
          Most women have full closets and nothing to wear. The problem isn't volume —
          it's architecture. These five pieces are the structure everything else hangs on.
        </p>
      </header>

      {/* ── Steps ── */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "56px 24px" }}>
        {steps.map((step, i) => (
          <article key={i} style={{
            background: "#FDFAF5", border: "1px solid #DDD4C5",
            marginBottom: "24px", overflow: "hidden",
          }}>
            <div style={{ background: "#EDE5D8", padding: "18px 24px", display: "flex", alignItems: "baseline", gap: "14px" }}>
              <span style={{
                color: "#C4956A", fontFamily: "Arial, sans-serif", fontSize: "11px",
                letterSpacing: "0.3em", textTransform: "uppercase", flexShrink: 0,
              }}>
                {step.num}
              </span>
              <h2 style={{ margin: 0, color: "#2C2C2C", fontSize: "20px", fontWeight: 400 }}>
                {step.name}
              </h2>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "15px", lineHeight: 1.8 }}>
                {step.detail}
              </p>
              <p style={{
                margin: 0, fontSize: "12px", color: "#6B6560", fontStyle: "italic",
                lineHeight: 1.65, borderLeft: "2px solid #C4956A", paddingLeft: "10px",
              }}>
                {step.note}
              </p>
            </div>
          </article>
        ))}

        {/* ── Tip block ── */}
        <div style={{
          background: "#2C2C2C", padding: "32px 28px", marginBottom: "32px",
        }}>
          <p style={{
            margin: "0 0 12px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            The Rule
          </p>
          <p style={{ margin: 0, color: "#FDFAF5", fontSize: "17px", lineHeight: 1.8, fontStyle: "italic" }}>
            &ldquo;Buy less, buy right. One perfect blazer outperforms a closet full of options.
            The goal isn&rsquo;t more clothes — it&rsquo;s fewer decisions, better outcomes.&rdquo;
          </p>
          <p style={{
            margin: "14px 0 0", color: "#8A8580", fontSize: "11px",
            fontFamily: "Arial, sans-serif", letterSpacing: "0.1em",
          }}>
            — Ellie
          </p>
        </div>

        {/* ── How the weekly brief works ── */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "22px", fontWeight: 400 }}>
            How the Monday Brief works
          </h2>
          {[
            {
              q: "What do I get every week?",
              a: "Three complete looks — a professional look, a casual weekend look, and an elevated evening look. Each look includes every piece styled together with brand, exact price, and a direct link to buy.",
            },
            {
              q: "How are looks selected?",
              a: "I personally review the week's fashion landscape — editorial coverage, retail arrivals, season transitions — and curate three complete outfits that work together. Nothing algorithmic. No sponsored placements.",
            },
            {
              q: "What does \"direct buy links\" mean?",
              a: "Every piece in every look has one link that goes directly to that item on the retailer's site — the right color, the right style. Not a search page. Not a Pinterest board. The exact product.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. Your membership is month-to-month through Stripe. Cancel from your member dashboard in 30 seconds — no emails, no hold music.",
            },
          ].map((faq, i) => (
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

        {/* ── CTA ── */}
        <div style={{
          background: "#EDE5D8", border: "1px solid #DDD4C5",
          padding: "40px 32px", textAlign: "center",
        }}>
          <p style={{
            margin: "0 0 8px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            Put it into practice
          </p>
          <h2 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "24px", fontWeight: 400 }}>
            Get the weekly brief — $19/month
          </h2>
          <p style={{
            margin: "0 auto 28px", maxWidth: "440px", color: "#4A4A4A",
            fontSize: "14px", lineHeight: 1.75,
          }}>
            Every Monday I publish three complete looks — every piece, every price,
            every direct buy link. This is the 5-piece formula in motion, curated fresh each week.
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

      {/* ── Footer ── */}
      <footer style={{
        background: "#1A1A1A", padding: "24px", textAlign: "center",
      }}>
        <p style={{ margin: 0, color: "#5A5550", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          © {new Date().getFullYear()} The Style Refresh &nbsp;·&nbsp;
          <Link href="/blog" style={{ color: "#8A8580", textDecoration: "none" }}>The Edit</Link>
          &nbsp;·&nbsp;
          <Link href="/privacy" style={{ color: "#8A8580", textDecoration: "none" }}>Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" style={{ color: "#8A8580", textDecoration: "none" }}>Terms</Link>
        </p>
      </footer>
    </div>
  );
}

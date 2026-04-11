import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Dress Better as a Woman — 8 Rules That Actually Work | The Style Refresh",
  description:
    "Ellie's 8 styling rules for women who want to look more polished, put-together, and intentional — without spending more money or time getting dressed.",
  keywords: [
    "how to dress better as a woman",
    "how to look more put together",
    "women's style tips",
    "how to dress more stylish",
    "how to look polished",
    "styling tips for women",
    "how to dress well women",
    "personal stylist tips online",
    "women's fashion advice",
    "how to build a stylish wardrobe",
  ],
  openGraph: {
    title: "How to Dress Better as a Woman — 8 Rules That Actually Work",
    description:
      "8 styling rules from personal stylist Ellie — look more polished and intentional without spending more money.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Dress Better as a Woman — 8 Rules That Actually Work",
    description: "8 styling rules that actually work — from personal stylist Ellie.",
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Dress Better as a Woman — 8 Rules That Actually Work",
  description:
    "Personal stylist Ellie shares 8 practical rules for dressing better, looking more polished, and building a wardrobe that works every day.",
  author: { "@type": "Person", name: "Ellie", url: SITE_URL },
  step: [
    { "@type": "HowToStep", name: "Fix the fit first", text: "No brand, price, or trend matters more than fit. One well-fitting piece outperforms ten that don't." },
    { "@type": "HowToStep", name: "Dress for the silhouette, not the trend", text: "Trends change every season. Your silhouette — the proportion of your outfit — creates the impression that lasts." },
    { "@type": "HowToStep", name: "Own fewer, better pieces", text: "A wardrobe full of average pieces produces average outfits. Fewer, quality pieces give you more options." },
    { "@type": "HowToStep", name: "Neutrals first, color second", text: "Build your wardrobe on neutrals so everything mixes. Add color as accents — one piece per outfit maximum." },
    { "@type": "HowToStep", name: "Shoes define the outfit", text: "The same jeans and blazer reads completely differently in loafers vs. sneakers vs. heels. Shoes are the finishing decision." },
    { "@type": "HowToStep", name: "Tuck or half-tuck something", text: "A half-tuck instantly creates waist definition and shows intention. It's the one-second move that changes everything." },
    { "@type": "HowToStep", name: "Never skip the third piece", text: "A great outfit usually has three layers of interest — top, bottom, and one more: a blazer, a belt, a bag, a scarf. Two pieces look unfinished." },
    { "@type": "HowToStep", name: "Edit before you shop", text: "Before buying anything new, remove something old. A curated closet is easier to dress from than a full one." },
  ],
};

const rules = [
  {
    num: "01",
    rule: "Fix the fit first",
    detail:
      "No brand, price point, or trend matters more than how something fits. An expensive dress that doesn't fit reads cheaper than a $40 piece that's been tailored. Before you buy anything new, ask: does this fit my shoulders, my waist, my inseam — exactly? A good tailor costs $20–40 and turns good clothes into great ones.",
    takeaway: "Takeaway: Try one piece you already own to a tailor. The transformation will change how you shop forever.",
  },
  {
    num: "02",
    rule: "Dress for the silhouette, not the trend",
    detail:
      "Trends change every six months. Your silhouette — the proportional relationship between your top half and bottom half — creates an impression that lasts the entire day. Wide leg trouser? Balance it with a fitted top. Oversized blazer? Tuck in the shirt and slim the bottom. Every great outfit is a silhouette decision first.",
    takeaway: "Takeaway: Before leaving the house, stand back and look at the shape of your outfit in the mirror. Not the pieces — the shape.",
  },
  {
    num: "03",
    rule: "Own fewer, better pieces",
    detail:
      "A closet full of average pieces produces average outfits no matter how many you own. Ten high-quality, versatile pieces give you more options than forty that don't work together. The goal isn't minimalism — it's intentionality. Every piece should earn its space by working with at least three other things you own.",
    takeaway: "Takeaway: Before your next purchase, remove one piece from your closet. One in, one out.",
  },
  {
    num: "04",
    rule: "Neutrals first, color second",
    detail:
      "Build the foundation of your wardrobe in neutrals — black, white, ivory, charcoal, camel, navy. These pieces mix effortlessly with everything, which means more outfit combinations from fewer items. Add color as a single accent per outfit. One color statement, supported by neutrals, reads as style. Multiple color statements read as noise.",
    takeaway: "Takeaway: Next time you shop, ask yourself if the piece works with at least three neutrals you already own.",
  },
  {
    num: "05",
    rule: "Shoes define the entire outfit",
    detail:
      "The same jeans and blazer reads completely differently in white sneakers, pointed-toe flats, loafers, or heeled mules. Shoes aren't just the finishing touch — they're the statement. If an outfit isn't working, change the shoes before you change the clothes. Most styling problems are shoe problems.",
    takeaway: "Takeaway: Try your current outfit with three different shoe choices. You'll see the difference immediately.",
  },
  {
    num: "06",
    rule: "Tuck or half-tuck something",
    detail:
      "A full tuck creates a clean, polished line. A half-tuck (just the front) creates effortless intention. Both show waist definition and signal that the outfit was considered — not just grabbed. An untucked shirt or blouse, unless it's a structured shirt-dress, usually reads as unfinished. This is the single fastest way to look more put together.",
    takeaway: "Takeaway: Try a half-tuck on a piece you normally leave out. Takes three seconds.",
  },
  {
    num: "07",
    rule: "Never skip the third piece",
    detail:
      "A jeans-and-top combination is two pieces. A polished outfit usually has three layers of visual interest: top, bottom, and one more element — a blazer, a structured bag, a belt at the waist, a silk scarf, a statement shoe. The third piece is what transforms an outfit from \"getting dressed\" to \"I got dressed.\"",
    takeaway: "Takeaway: Lay out your outfit and identify your third piece before you leave.",
  },
  {
    num: "08",
    rule: "Edit before you shop",
    detail:
      "Before buying anything new, remove something. A curated closet of 40 pieces is infinitely easier to dress from than a crowded one of 150. Every time you bring something in, something with less versatility, quality, or fit should leave. This forces intention on every purchase and keeps your wardrobe in a state where everything in it can actually be worn.",
    takeaway: "Takeaway: Spend 15 minutes this weekend removing the five pieces you never reach for. You'll immediately see your wardrobe more clearly.",
  },
];

const faqs = [
  {
    q: "How can I dress better without buying new clothes?",
    a: "Fit first — get one piece tailored. Then try new combinations: blazer with things you've never tried it with, tuck pieces you normally leave out, swap shoes on existing outfits. Most wardrobes have untapped outfits hiding in them.",
  },
  {
    q: "What's the fastest way to look more put together?",
    a: "Fix the fit and add a third piece. A half-tuck and a blazer turn any outfit from 'fine' to 'intentional' in under 30 seconds.",
  },
  {
    q: "How do I find my personal style?",
    a: "Start by editing, not adding. Remove everything you feel 'meh' in. What's left is your style. Build from there — that's the wardrobe that actually reflects who you are.",
  },
  {
    q: "How does The Style Refresh help me dress better?",
    a: "Every Monday you get three complete looks with every piece, price, and direct buy link. Each look applies these principles — fit, silhouette, third piece, the right shoe. It's styling delivered to your inbox so you never start from scratch.",
  },
];

export default function HowToDressPage() {
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
          How to Dress Better as a Woman
        </h1>
        <p style={{
          margin: "0 auto 24px", maxWidth: "560px", color: "#4A4A4A",
          fontSize: "17px", lineHeight: 1.8, fontStyle: "italic",
        }}>
          Eight rules. No new clothes required for most of them.
          Just a different way of seeing what you already have.
        </p>
        <div style={{
          width: "48px", height: "1px", margin: "0 auto 24px",
          background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
        }} />
        <p style={{
          margin: "0 auto", maxWidth: "520px", color: "#6B6560",
          fontSize: "14px", lineHeight: 1.75, fontFamily: "Arial, sans-serif",
        }}>
          After twenty years of private styling, I&apos;ve seen the same patterns in every client&apos;s wardrobe.
          The problems aren&apos;t about money or trend access — they&apos;re about a handful of principles
          that no one ever teaches directly. These are those principles.
        </p>
      </header>

      {/* Rules */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "56px 24px" }}>
        {rules.map((item, i) => (
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
                {item.num}
              </span>
              <h2 style={{ margin: 0, color: "#2C2C2C", fontSize: "19px", fontWeight: 400 }}>
                {item.rule}
              </h2>
            </div>
            <div style={{ padding: "18px 24px" }}>
              <p style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "15px", lineHeight: 1.8 }}>
                {item.detail}
              </p>
              <p style={{
                margin: 0, fontSize: "12px", color: "#6B6560", fontStyle: "italic",
                lineHeight: 1.65, borderLeft: "2px solid #C4956A", paddingLeft: "10px",
              }}>
                {item.takeaway}
              </p>
            </div>
          </article>
        ))}

        {/* Quote */}
        <div style={{
          background: "#2C2C2C", padding: "32px 28px", marginBottom: "40px",
        }}>
          <p style={{
            margin: "0 0 12px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            The Style Rule
          </p>
          <p style={{ margin: 0, color: "#FDFAF5", fontSize: "17px", lineHeight: 1.8, fontStyle: "italic" }}>
            &ldquo;Getting dressed well isn&apos;t about having more options.
            It&apos;s about making fewer decisions — because you already know every piece works.&rdquo;
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
            Questions about dressing better
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
            Put these rules to work every week
          </p>
          <h2 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "24px", fontWeight: 400 }}>
            The weekly brief — $19/month
          </h2>
          <p style={{
            margin: "0 auto 28px", maxWidth: "460px", color: "#4A4A4A",
            fontSize: "14px", lineHeight: 1.75,
          }}>
            Every Monday — three complete looks built on these exact principles.
            Every piece, every price, every direct buy link. The thinking done for you.
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
          <Link href="/capsule-wardrobe" style={{ color: "#8A8580", textDecoration: "none" }}>Capsule Wardrobe</Link>
          &nbsp;·&nbsp;
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

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Women's Fashion Subscription — Weekly Style Curation | The Style Refresh",
  description:
    "The Style Refresh is a private weekly fashion subscription for women. Three complete looks, every item by brand and price, personal curation — every Monday for $19/month.",
  keywords: [
    "women's fashion subscription",
    "fashion subscription box women",
    "weekly style subscription",
    "personal stylist subscription",
    "curated fashion newsletter",
    "fashion curation service",
    "online personal stylist women",
    "monthly fashion subscription",
    "style subscription service",
    "best fashion subscription 2026",
  ],
  openGraph: {
    title: "Women's Fashion Subscription — Weekly Style Curation | The Style Refresh",
    description:
      "Three complete looks, every item by brand and price, personal curation — every Monday for $19/month. Private membership. Cancel anytime.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Women's Fashion Subscription — The Style Refresh",
    description: "Three complete looks every Monday. Every item by brand and price. $19/month. Cancel anytime.",
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "The Style Refresh — Weekly Fashion Subscription",
  description:
    "A private weekly fashion subscription delivering three complete, curated looks every Monday morning — every item named by brand and price.",
  url: `${SITE_URL}/fashion-subscription`,
  brand: { "@type": "Brand", name: "The Style Refresh" },
  offers: {
    "@type": "Offer",
    price: "19.00",
    priceCurrency: "USD",
    priceValidUntil: "2027-01-01",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/#join`,
  },
};

const differences = [
  {
    label: "Personal curation, not an algorithm",
    detail:
      "Every look is reviewed and approved by a human stylist before it lands in your inbox. Not AI-generated, not trend-aggregated, not sponsored. Curated.",
  },
  {
    label: "Three complete looks — not single pieces",
    detail:
      "Each Monday you get three full outfits: a professional look, a casual weekend look, and an elevated evening look. Every piece in every look is styled together intentionally.",
  },
  {
    label: "Brand and price — not a mood board",
    detail:
      "Every piece is named by brand and exact price. Search the brand directly and you'll find it — the right color, the right style. Not a vague inspiration board. Actual, sourced pieces.",
  },
  {
    label: "Private membership — no ads, no sponsors",
    detail:
      "Members pay $19/month. That's it. No affiliate pressure, no sponsored looks, no brand deals. The curation is honest because the business model doesn't depend on anything else.",
  },
  {
    label: "Weekly, not quarterly",
    detail:
      "Not a quarterly box, not a seasonal lookbook. Every single Monday, fresh. Fashion moves fast — so does the brief.",
  },
  {
    label: "Cancel in 30 seconds",
    detail:
      "No emails, no hold music, no \"are you sure?\" loops. Cancel from your member dashboard instantly. Month-to-month, always.",
  },
];

const compares = [
  { feature: "Frequency", us: "Every Monday", them: "Quarterly or monthly" },
  { feature: "Content", us: "3 complete looks", them: "Single pieces or mood boards" },
  { feature: "Sourcing", us: "Brand + price for every item", them: "Mood boards or vague inspiration" },
  { feature: "Curation", us: "Human stylist, reviewed weekly", them: "Algorithm or trend aggregation" },
  { feature: "Ads / sponsors", us: "None — member-funded only", them: "Often ad-supported" },
  { feature: "Price", us: "$19/month", them: "$30–150+/month" },
  { feature: "Cancel", us: "Instant from dashboard", them: "Email or call required" },
];

const faqs = [
  {
    q: "What exactly do I get with a Style Refresh membership?",
    a: "Every Monday morning you receive an email with three complete looks — a professional outfit, a casual weekend outfit, and an elevated evening look. Each look includes every piece styled together: brand name and exact price. The VIP Room dashboard shows every week's brief so you can browse back at any time.",
  },
  {
    q: "How is this different from a fashion subscription box?",
    a: "A box sends you physical items to try on and return. The Style Refresh is a curation service — you receive the complete styling and buy exactly what you want, when you want it. No shipping, no returns, no boxes on your doorstep.",
  },
  {
    q: "Is the content personalized to me?",
    a: "The brief is curated for women who value quality, versatility, and polish — the editorial point of view is consistent. If you're looking for highly personalized 1:1 styling, that's a different (much more expensive) service. The Style Refresh is positioned as the most curated option at a fair membership price.",
  },
  {
    q: "When do I get my first brief?",
    a: "Your first Monday brief arrives within days of subscribing. Join mid-week and you'll receive the current week's brief the following Monday morning.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Month-to-month through Stripe. Cancel from your member dashboard in under 30 seconds — your access continues until the end of your billing period.",
  },
  {
    q: "Is there an annual option?",
    a: "Yes — $180/year (saves you $48 vs. monthly). Same full access, billed once.",
  },
];

export default function FashionSubscriptionPage() {
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
          Private Membership — $19/month
        </p>
        <h1 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "38px", fontWeight: 400, lineHeight: 1.25 }}>
          A Fashion Subscription<br />That Actually Works
        </h1>
        <p style={{
          margin: "0 auto 24px", maxWidth: "560px", color: "#4A4A4A",
          fontSize: "17px", lineHeight: 1.8, fontStyle: "italic",
        }}>
          Three complete looks. Every item by brand and price. Personal curation.
          Every Monday — for less than a single cocktail per week.
        </p>
        <div style={{
          width: "48px", height: "1px", margin: "0 auto 24px",
          background: "linear-gradient(90deg, transparent, #C4956A, transparent)",
        }} />
        <Link href="/#join" style={{
          display: "inline-block", background: "#C4956A", color: "#FDFAF5",
          padding: "14px 42px", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
        }}>
          Start My Refresh — $19/mo
        </Link>
        <p style={{
          margin: "12px 0 0", color: "#8A8580", fontSize: "12px",
          fontFamily: "Arial, sans-serif",
        }}>
          Cancel anytime · No commitment
        </p>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "56px 24px" }}>

        {/* What makes it different */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ margin: "0 0 8px", color: "#2C2C2C", fontSize: "26px", fontWeight: 400 }}>
            What makes this different
          </h2>
          <p style={{
            margin: "0 0 28px", color: "#6B6560", fontSize: "14px",
            lineHeight: 1.75, fontFamily: "Arial, sans-serif",
          }}>
            Most fashion subscriptions send boxes of random items or aggregate social media trends.
            The Style Refresh is something different.
          </p>
          {differences.map((d, i) => (
            <div key={i} style={{
              background: "#FDFAF5", border: "1px solid #DDD4C5",
              padding: "20px 24px", marginBottom: "12px",
              borderLeft: "3px solid #C4956A",
            }}>
              <p style={{
                margin: "0 0 8px", color: "#2C2C2C", fontSize: "14px",
                fontWeight: 700, fontFamily: "Arial, sans-serif",
              }}>
                {d.label}
              </p>
              <p style={{ margin: 0, color: "#4A4A4A", fontSize: "14px", lineHeight: 1.75 }}>
                {d.detail}
              </p>
            </div>
          ))}
        </section>

        {/* Comparison table */}
        <section style={{ marginBottom: "48px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "22px", fontWeight: 400 }}>
            How it compares
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              background: "#FDFAF5", border: "1px solid #DDD4C5",
              fontFamily: "Arial, sans-serif", fontSize: "13px",
            }}>
              <thead>
                <tr style={{ background: "#2C2C2C" }}>
                  <th style={{ padding: "12px 16px", color: "#8A8580", textAlign: "left", fontWeight: 400, letterSpacing: "0.1em" }}>Feature</th>
                  <th style={{ padding: "12px 16px", color: "#C4956A", textAlign: "left", fontWeight: 600, letterSpacing: "0.1em" }}>The Style Refresh</th>
                  <th style={{ padding: "12px 16px", color: "#8A8580", textAlign: "left", fontWeight: 400, letterSpacing: "0.1em" }}>Others</th>
                </tr>
              </thead>
              <tbody>
                {compares.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #DDD4C5", background: i % 2 === 0 ? "#FDFAF5" : "#F5EFE4" }}>
                    <td style={{ padding: "12px 16px", color: "#6B6560", fontWeight: 600 }}>{row.feature}</td>
                    <td style={{ padding: "12px 16px", color: "#2C2C2C" }}>{row.us}</td>
                    <td style={{ padding: "12px 16px", color: "#9A9490" }}>{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quote */}
        <div style={{
          background: "#2C2C2C", padding: "32px 28px", marginBottom: "48px",
        }}>
          <p style={{
            margin: "0 0 12px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            The Brief
          </p>
          <p style={{ margin: 0, color: "#FDFAF5", fontSize: "17px", lineHeight: 1.8, fontStyle: "italic" }}>
            &ldquo;Monday used to be the hardest morning of the week.
            Now it&apos;s the one I actually look forward to — three complete looks
            in my inbox before I&apos;ve finished my coffee.&rdquo;
          </p>
          <p style={{
            margin: "14px 0 0", color: "#8A8580", fontSize: "11px",
            fontFamily: "Arial, sans-serif", letterSpacing: "0.1em",
          }}>
            — Lauren C., member since January 2026
          </p>
        </div>

        {/* FAQ */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#2C2C2C", fontSize: "22px", fontWeight: 400 }}>
            Everything you need to know
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
            Ready to refresh?
          </p>
          <h2 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "24px", fontWeight: 400 }}>
            Join for $19/month
          </h2>
          <p style={{
            margin: "0 auto 16px", maxWidth: "420px", color: "#4A4A4A",
            fontSize: "14px", lineHeight: 1.75,
          }}>
            Three complete looks every Monday. Every item named by brand and price. Cancel anytime.
          </p>
          <p style={{
            margin: "0 auto 28px", maxWidth: "340px", color: "#6B6560",
            fontSize: "13px", lineHeight: 1.6, fontStyle: "italic",
          }}>
            Or save $48 with the annual plan — $180/year
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
          <Link href="/how-to-dress" style={{ color: "#8A8580", textDecoration: "none" }}>How to Dress Better</Link>
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

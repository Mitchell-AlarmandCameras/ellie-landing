import type { Metadata } from "next";
import Link from "next/link";
import { staticBlogPosts } from "@/data/blog-posts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Style Guide & Fashion Advice | The Style Refresh by Ellie",
  description:
    "Expert women's fashion advice, capsule wardrobe guides, and style tips from a 20-year fashion consultant. " +
    "Three complete looks sourced every Monday. Every item by brand and price.",
  openGraph: {
    title: "Style Guide & Fashion Advice | The Style Refresh",
    description: "Expert capsule wardrobe guides and style tips. Three sourced looks every Monday.",
    type: "website",
  },
};

export default async function BlogIndexPage() {
  const posts = staticBlogPosts;

  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

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

      {/* ── Header ── */}
      <div style={{
        background: "#EDE5D8", padding: "56px 24px 40px", textAlign: "center",
        borderBottom: "1px solid #DDD4C5",
      }}>
        <p style={{
          margin: "0 0 10px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          Ellie · The Style Refresh
        </p>
        <h1 style={{ margin: "0 0 12px", color: "#2C2C2C", fontSize: "36px", fontWeight: 400 }}>
          The Style Guide
        </h1>
        <p style={{
          margin: "0 auto", maxWidth: "520px", color: "#6B6560",
          fontSize: "15px", lineHeight: 1.75,
        }}>
          Fashion advice, capsule wardrobe guides, and exactly what to buy — from a 20-year style consultant.
          Three complete sourced looks delivered every Monday.
        </p>
      </div>

      {/* ── Post grid ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "28px",
        }}>
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article style={{
                background: "#FDFAF5", border: "1px solid #DDD4C5",
                padding: "28px", cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}>
                <p style={{
                  margin: "0 0 10px", fontSize: "10px", letterSpacing: "0.28em",
                  textTransform: "uppercase", color: "#C4956A", fontFamily: "Arial, sans-serif",
                }}>
                  {post.category} · {post.readTime}
                </p>
                <h2 style={{
                  margin: "0 0 12px", fontSize: "17px", color: "#2C2C2C",
                  lineHeight: 1.45, fontWeight: 400,
                }}>
                  {post.title}
                </h2>
                <p style={{
                  margin: "0 0 16px", fontSize: "13px", color: "#6B6560",
                  lineHeight: 1.7, fontFamily: "Arial, sans-serif",
                }}>
                  {post.intro.substring(0, 110)}…
                </p>
                <p style={{
                  margin: 0, fontSize: "11px", color: "#C4956A",
                  fontFamily: "Arial, sans-serif", letterSpacing: "0.1em",
                }}>
                  Read the guide →
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>

      {/* ── CTA Banner ── */}
      <div style={{
        background: "#2C2C2C", padding: "48px 24px", textAlign: "center",
      }}>
        <p style={{
          margin: "0 0 6px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.32em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          Members get more
        </p>
        <h2 style={{
          margin: "0 0 14px", color: "#FDFAF5", fontSize: "24px", fontWeight: 400,
        }}>
          Brand and price for every item, every week.
        </h2>
        <p style={{
          margin: "0 auto 28px", maxWidth: "440px", color: "#B5A99A",
          fontSize: "14px", lineHeight: 1.7,
        }}>
          Everything you see here is the teaser. Members get the full look —
          every brand, every price, and Ellie's sourcing note for every single piece.
        </p>
        <Link href="/#join" style={{
          display: "inline-block", background: "#C4956A", color: "#FDFAF5",
          padding: "14px 40px", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
        }}>
          Join for $19/month
        </Link>
        <p style={{ margin: "12px 0 0", color: "#6B6560", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          Cancel anytime · Secure checkout via Stripe
        </p>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        background: "#1A1A1A", padding: "24px", textAlign: "center",
      }}>
        <p style={{ margin: 0, color: "#5A5550", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          © {new Date().getFullYear()} The Style Refresh &nbsp;·&nbsp;
          <Link href="/privacy" style={{ color: "#8A8580", textDecoration: "none" }}>Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" style={{ color: "#8A8580", textDecoration: "none" }}>Terms</Link>
        </p>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600; // Re-render at most once per hour

export const metadata: Metadata = {
  title: "The Edit — Weekly Women's Fashion Looks | The Style Refresh",
  description:
    "Browse every weekly curated look — sourced from the best retailers, " +
    "styled for real life. Three complete looks every Monday. " +
    "Subscribe for direct buy links to every item.",
  openGraph: {
    title: "The Edit — Weekly Women's Fashion Looks",
    description: "Three complete looks, every Monday. Subscribe for direct buy links.",
    type: "website",
  },
};

type IndexEntry = {
  slug: string;
  weekOf: string;
  publishedAt: string;
  editorialLead: string;
  lookLabels: string[];
};

async function getPosts(): Promise<IndexEntry[]> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return [];
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "blog/index" });
    if (!blobs[0]) return [];
    const res = await fetch(blobs[0].url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as IndexEntry[];
  } catch {
    return [];
  }
}

export default async function BlogIndexPage() {
  const posts = await getPosts();

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
          The Edit
        </h1>
        <p style={{
          margin: "0 auto", maxWidth: "520px", color: "#6B6560",
          fontSize: "15px", lineHeight: 1.75,
        }}>
          Every Monday I publish three complete looks — sourced, styled, and ready to shop.
          Members get direct buy links to every item. Here you can browse every edit, free.
        </p>
      </div>

      {/* ── Post grid ── */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8A8580" }}>
            <p style={{ fontSize: "15px", fontStyle: "italic", marginBottom: "24px" }}>
              The first edit drops this Monday. Check back then — or join now to receive it in your inbox.
            </p>
            <Link href="/#join" style={{
              display: "inline-block", background: "#2C2C2C", color: "#FDFAF5",
              padding: "13px 34px", fontFamily: "Arial, sans-serif", fontSize: "11px",
              letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
            }}>
              Join for $19/month
            </Link>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "24px",
          }}>
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article style={{
                  background: "#FDFAF5", border: "1px solid #DDD4C5",
                  padding: "24px", transition: "box-shadow 0.2s",
                  cursor: "pointer",
                }}>
                  <p style={{
                    margin: "0 0 8px", fontSize: "10px", letterSpacing: "0.28em",
                    textTransform: "uppercase", color: "#C4956A", fontFamily: "Arial, sans-serif",
                  }}>
                    Week of {post.weekOf}
                  </p>
                  <p style={{
                    margin: "0 0 12px", fontSize: "16px", color: "#2C2C2C",
                    fontStyle: "italic", lineHeight: 1.5,
                  }}>
                    &ldquo;{post.editorialLead.substring(0, 90)}{post.editorialLead.length > 90 ? "…" : ""}&rdquo;
                  </p>
                  <div style={{
                    borderTop: "1px solid #E8DDD0", paddingTop: "12px", marginTop: "12px",
                  }}>
                    {post.lookLabels.map((label, i) => (
                      <p key={i} style={{
                        margin: "3px 0", fontSize: "11px", color: "#6B6560",
                        fontFamily: "Arial, sans-serif",
                      }}>
                        · {label}
                      </p>
                    ))}
                  </div>
                  <p style={{
                    margin: "14px 0 0", fontSize: "11px", color: "#C4956A",
                    fontFamily: "Arial, sans-serif", letterSpacing: "0.1em",
                  }}>
                    View the edit →
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
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
          Direct buy links to every item, every week.
        </h2>
        <p style={{
          margin: "0 auto 28px", maxWidth: "440px", color: "#B5A99A",
          fontSize: "14px", lineHeight: 1.7,
        }}>
          Everything you see here is the teaser. Members get the full look — 
          brand, price, and a direct link to buy every single piece.
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

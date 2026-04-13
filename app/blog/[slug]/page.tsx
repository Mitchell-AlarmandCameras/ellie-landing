import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { staticBlogPosts, type StaticPost } from "@/data/blog-posts";

export const revalidate = 3600;

type PostLook = {
  index: string;
  label: string;
  tagline: string;
  description: string;
  editorsNote: string;
  teaser: string[];
};

type BlobPost = {
  slug: string;
  weekOf: string;
  publishedAt: string;
  editorialLead: string;
  looks: PostLook[];
};

async function getBlobPost(slug: string): Promise<BlobPost | null> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return null;
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `blog/posts/${slug}` });
    if (!blobs[0]) return null;
    const res = await fetch(blobs[0].url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as BlobPost;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  return staticBlogPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const staticPost = staticBlogPosts.find(p => p.slug === params.slug);
  if (staticPost) {
    return {
      title: staticPost.metaTitle,
      description: staticPost.metaDesc,
      openGraph: {
        title: staticPost.metaTitle,
        description: staticPost.metaDesc,
        type: "article",
        publishedTime: staticPost.publishedAt,
      },
    };
  }
  const post = await getBlobPost(params.slug);
  if (!post) return { title: "Not Found | The Style Refresh" };
  const lookNames = post.looks.map(l => l.label).join(", ");
  const title = `Week of ${post.weekOf} — ${lookNames} | The Style Refresh`;
  const description = post.editorialLead.substring(0, 155);
  return { title, description, openGraph: { title, description, type: "article", publishedTime: post.publishedAt } };
}

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com").replace(/\/$/, "");

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  /* ── Check static posts first ── */
  const staticPost = staticBlogPosts.find(p => p.slug === params.slug);
  if (staticPost) return <StaticPostPage post={staticPost} />;

  /* ── Fall back to Blob post ── */
  const post = await getBlobPost(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: `Week of ${post.weekOf} — ${post.looks.map(l => l.label).join(", ")}`,
    description: post.editorialLead,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: "Ellie" },
    publisher: {
      "@type": "Organization",
      name: "The Style Refresh",
      url: SITE_URL,
    },
    url: `${SITE_URL}/blog/${post.slug}`,
    keywords: [
      "women's fashion",
      `week of ${post.weekOf}`,
      ...post.looks.map(l => l.label.toLowerCase()),
      "curated looks",
      "fashion edit",
      "style refresh",
    ].join(", "),
  };

  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>

      {/* JSON-LD for Google */}
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
        <Link href="/blog" style={{
          color: "#FDFAF5", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none",
        }}>
          ← The Edit
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
      <header style={{
        background: "#EDE5D8", padding: "52px 24px 40px", textAlign: "center",
        borderBottom: "1px solid #DDD4C5",
      }}>
        <p style={{
          margin: "0 0 10px", color: "#C4956A", fontSize: "10px",
          letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
        }}>
          The Style Refresh · Weekly Edit
        </p>
        <h1 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "32px", fontWeight: 400 }}>
          Week of {post.weekOf}
        </h1>
        <p style={{
          margin: "0 auto", maxWidth: "560px", color: "#4A4A4A",
          fontSize: "16px", lineHeight: 1.75, fontStyle: "italic",
        }}>
          &ldquo;{post.editorialLead}&rdquo;
        </p>
        <p style={{
          margin: "18px 0 0", color: "#8A8580", fontSize: "11px",
          fontFamily: "Arial, sans-serif",
        }}>
          Curated by Ellie &nbsp;·&nbsp;{" "}
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </header>

      {/* ── Look cards ── */}
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
        {post.looks.map((look, i) => (
          <article key={i} style={{
            background: "#FDFAF5", border: "1px solid #DDD4C5",
            marginBottom: "28px", overflow: "hidden",
          }}>
            {/* Look header */}
            <div style={{ background: "#EDE5D8", padding: "18px 24px" }}>
              <p style={{
                margin: "0 0 4px", fontSize: "10px", letterSpacing: "0.3em",
                textTransform: "uppercase", color: "#C4956A", fontFamily: "Arial, sans-serif",
              }}>
                {look.index} — {look.label}
              </p>
              <p style={{
                margin: 0, fontSize: "20px", color: "#2C2C2C",
                fontStyle: "italic", lineHeight: 1.4,
              }}>
                &ldquo;{look.tagline}&rdquo;
              </p>
            </div>

            {/* Look body */}
            <div style={{ padding: "20px 24px" }}>
              {look.description && (
                <p style={{
                  margin: "0 0 14px", fontSize: "14px", color: "#4A4A4A",
                  lineHeight: 1.75,
                }}>
                  {look.description}
                </p>
              )}
              {look.editorsNote && (
                <p style={{
                  margin: "0 0 16px", fontSize: "12px", color: "#8A8580",
                  fontStyle: "italic", lineHeight: 1.6,
                  borderLeft: "2px solid #C4956A", paddingLeft: "10px",
                }}>
                  {look.editorsNote}
                </p>
              )}

              {/* Teaser items */}
              <div style={{ borderTop: "1px solid #E8DDD0", paddingTop: "14px" }}>
                <p style={{
                  margin: "0 0 8px", fontSize: "10px", letterSpacing: "0.24em",
                  textTransform: "uppercase", color: "#8A8580", fontFamily: "Arial, sans-serif",
                }}>
                  Pieces in this look
                </p>
                {look.teaser.map((piece, j) => (
                  <p key={j} style={{
                    margin: "4px 0", fontSize: "13px", color: "#2C2C2C",
                  }}>
                    · {piece}
                  </p>
                ))}
                {/* Members-only blur */}
                <div style={{
                  marginTop: "16px", padding: "12px 14px",
                  background: "#F0E8D8", borderLeft: "3px solid #C4956A",
                }}>
                  <p style={{
                    margin: 0, fontSize: "12px", color: "#6B6560",
                    fontFamily: "Arial, sans-serif", lineHeight: 1.6,
                  }}>
                    🔒 Brand, price &amp; Ellie's sourcing note for each piece are exclusive to members.{" "}
                    <Link href="/#join" style={{ color: "#C4956A", textDecoration: "none" }}>
                      Join for $19/month →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* ── Inline CTA ── */}
        <div style={{
          background: "#2C2C2C", padding: "36px 28px", textAlign: "center",
          marginTop: "16px",
        }}>
          <p style={{
            margin: "0 0 6px", color: "#C4956A", fontSize: "10px",
            letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          }}>
            Want the full brief?
          </p>
          <h2 style={{
            margin: "0 0 12px", color: "#FDFAF5", fontSize: "22px", fontWeight: 400,
          }}>
            Every item. Every brand. Every price.
          </h2>
          <p style={{
            margin: "0 auto 24px", maxWidth: "400px", color: "#B5A99A",
            fontSize: "13px", lineHeight: 1.7,
          }}>
            Members get the complete Monday brief — every piece named by brand, price, and Ellie's note.
            $19/month. Cancel anytime.
          </p>
          <Link href="/#join" style={{
            display: "inline-block", background: "#C4956A", color: "#FDFAF5",
            padding: "13px 36px", fontFamily: "Arial, sans-serif", fontSize: "11px",
            letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
          }}>
            Start My Refresh — $19/mo
          </Link>
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

/* ═══════════════════════════════════════════════════════════════
   Static SEO Blog Post Page
═══════════════════════════════════════════════════════════════ */
function StaticPostPage({ post }: { post: StaticPost }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDesc,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: "Ellie" },
    publisher: { "@type": "Organization", name: "The Style Refresh", url: SITE_URL },
    url: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div style={{ background: "#F5EFE4", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav style={{
        background: "#2C2C2C", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: "52px",
      }}>
        <Link href="/blog" style={{
          color: "#FDFAF5", fontFamily: "Arial, sans-serif", fontSize: "11px",
          letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none",
        }}>
          ← Style Guide
        </Link>
        <Link href="/#join" style={{
          background: "#C4956A", color: "#FDFAF5", padding: "8px 18px",
          fontFamily: "Arial, sans-serif", fontSize: "10px", letterSpacing: "0.2em",
          textTransform: "uppercase", textDecoration: "none",
        }}>
          Join $19/mo
        </Link>
      </nav>

      <header style={{ background: "#EDE5D8", padding: "52px 24px 40px", textAlign: "center", borderBottom: "1px solid #DDD4C5" }}>
        <p style={{ margin: "0 0 10px", color: "#C4956A", fontSize: "10px", letterSpacing: "0.34em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
          {post.category} · {post.readTime}
        </p>
        <h1 style={{ margin: "0 0 14px", color: "#2C2C2C", fontSize: "clamp(22px,4vw,34px)", fontWeight: 400, maxWidth: "720px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.3 }}>
          {post.title}
        </h1>
        <p style={{ margin: "16px auto 0", maxWidth: "560px", color: "#6B6560", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          By Ellie &nbsp;·&nbsp; {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </header>

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 64px" }}>
        <p style={{ fontSize: "17px", color: "#2C2C2C", lineHeight: 1.85, marginBottom: "36px", fontStyle: "italic" }}>
          {post.intro}
        </p>

        {post.sections.map((section, i) => (
          <section key={i} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 400, color: "#2C2C2C", marginBottom: "14px", lineHeight: 1.4 }}>
              {section.heading}
            </h2>
            <p style={{ fontSize: "15px", color: "#3A3A3A", lineHeight: 1.85, margin: 0 }}>
              {section.body}
            </p>
          </section>
        ))}

        <div style={{ background: "#2C2C2C", padding: "36px 28px", textAlign: "center", marginTop: "48px" }}>
          <p style={{ margin: "0 0 6px", color: "#C4956A", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
            The Style Refresh
          </p>
          <h2 style={{ margin: "0 0 12px", color: "#FDFAF5", fontSize: "20px", fontWeight: 400 }}>
            {post.closingCta.split(".")[0]}.
          </h2>
          <p style={{ margin: "0 auto 24px", maxWidth: "400px", color: "#B5A99A", fontSize: "13px", lineHeight: 1.7, fontFamily: "Arial, sans-serif" }}>
            First week free. Cancel anytime.
          </p>
          <Link href="/#join" style={{
            display: "inline-block", background: "#C4956A", color: "#FDFAF5",
            padding: "13px 36px", fontFamily: "Arial, sans-serif", fontSize: "11px",
            letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none",
          }}>
            Start Free →
          </Link>
        </div>
      </main>

      <footer style={{ background: "#1A1A1A", padding: "24px", textAlign: "center" }}>
        <p style={{ margin: 0, color: "#5A5550", fontSize: "11px", fontFamily: "Arial, sans-serif" }}>
          © {new Date().getFullYear()} The Style Refresh &nbsp;·&nbsp;
          <Link href="/blog" style={{ color: "#8A8580", textDecoration: "none" }}>Style Guide</Link>
          &nbsp;·&nbsp;
          <Link href="/privacy" style={{ color: "#8A8580", textDecoration: "none" }}>Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

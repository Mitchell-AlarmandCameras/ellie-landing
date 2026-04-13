import type { MetadataRoute } from "next";

/* ═══════════════════════════════════════════════════════════════════════════
   SITEMAP — stylebyellie.com
   Next.js 14 App Router auto-generates /sitemap.xml from this file.
   Submitted to Google Search Console to maximise indexing of all 52 blog
   posts/year. Static pages get high priority; blog posts get medium.
═══════════════════════════════════════════════════════════════════════════ */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

type BlogIndexEntry = {
  slug:          string;
  weekOf:        string;
  publishedAt:   string;
  editorialLead: string;
};

/** Fetch the blog index from Vercel Blob (published on each Sunday approval) */
async function getBlogSlugs(): Promise<BlogIndexEntry[]> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return [];
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "blog/index" });
    if (!blobs[0]) return [];
    const res = await fetch(blobs[0].url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as BlogIndexEntry[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now       = new Date().toISOString();
  const blogPosts = await getBlogSlugs();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              BASE_URL,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/blog`,
      lastModified:     now,
      changeFrequency:  "weekly",
      priority:         0.8,
    },
    {
      url:              `${BASE_URL}/contact`,
      lastModified:     now,
      changeFrequency:  "monthly",
      priority:         0.4,
    },
        {
          url:              `${BASE_URL}/review`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.3,
        },
        {
          url:              `${BASE_URL}/style-guide`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.8,
        },
        {
          url:              `${BASE_URL}/capsule-wardrobe`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.8,
        },
        {
          url:              `${BASE_URL}/how-to-dress`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.8,
        },
        {
          url:              `${BASE_URL}/fashion-subscription`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.9,
        },
        {
          url:              `${BASE_URL}/press`,
          lastModified:     now,
          changeFrequency:  "monthly",
          priority:         0.6,
        },
      ];

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map(post => ({
    url:             `${BASE_URL}/blog/${post.slug}`,
    lastModified:    post.publishedAt ?? now,
    changeFrequency: "yearly" as const,
    priority:        0.7,
  }));

  return [...staticPages, ...blogEntries];
}

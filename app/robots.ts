import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/contact", "/review", "/style-guide"],
        disallow: [
          /* Private member pages — no SEO value, require auth */
          "/dashboard",
          "/bag",
          "/login",
          "/membership",
          "/success",
          /* API routes — never index these */
          "/api/",
          /* Internal Next.js assets */
          "/opengraph-image",
          "/_next/",
          /* Approval / admin URLs */
          "/api/approve-weekly",
          "/api/run-curator",
          "/api/send-weekly",
          "/api/health-check",
          "/api/monitor",
          "/api/link-check",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  };
}

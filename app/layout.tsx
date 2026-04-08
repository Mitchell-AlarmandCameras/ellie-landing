import type { Metadata, Viewport } from "next";
import "./globals.css";

/* ─── Replace with your live domain before deploying ─────────── */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ellie.style";

/* ═══════════════════════════════════════════════════════════════
   METADATA
   metadataBase is required by Next.js 14 to resolve relative
   URLs in openGraph.images and twitter.images to absolute URLs.
═══════════════════════════════════════════════════════════════ */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "Ellie | The Elite Edit",
    template: "%s | Ellie",
  },

  description:
    "Ellie is a private style membership for discerning professionals. " +
    "A 20-year veteran consultant curates three complete looks each week — " +
    "sourced, considered, and delivered to your inbox every Monday. " +
    "No noise. No feeds. Just the edit that matters.",

  keywords: [
    "personal stylist",
    "private style membership",
    "men's fashion consultant",
    "curated menswear",
    "luxury style guide",
    "weekly style briefing",
    "executive style",
    "premium fashion subscription",
    "style intelligence",
    "the elite edit",
  ],

  /* ── Open Graph ── */
  openGraph: {
    type:        "website",
    url:         BASE_URL,
    siteName:    "Ellie",
    title:       "Ellie | The Elite Edit",
    description:
      "Three curated looks. One veteran consultant. Delivered every Monday. " +
      "Apply for private membership — spots are limited.",
    images: [
      {
        url:    "/opengraph-image",   // resolved by app/opengraph-image.tsx
        width:  1200,
        height: 630,
        alt:    "Ellie — The Elite Edit. Navy and gold style intelligence.",
      },
    ],
  },

  /* ── Twitter / X card ── */
  twitter: {
    card:        "summary_large_image",
    title:       "Ellie | The Elite Edit",
    description:
      "Three curated looks. One veteran consultant. Delivered every Monday. " +
      "Apply for private membership.",
    images: ["/opengraph-image"],
  },

  /* ── Search / indexing ── */
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },

  /* ── Favicons (add these files to /public) ── */
  icons: {
    icon:  "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

/* ═══════════════════════════════════════════════════════════════
   VIEWPORT
═══════════════════════════════════════════════════════════════ */
export const viewport: Viewport = {
  width:          "device-width",
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
  themeColor:     "#000080",
};

/* ═══════════════════════════════════════════════════════════════
   ROOT LAYOUT
═══════════════════════════════════════════════════════════════ */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

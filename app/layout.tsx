import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

/* ─── Replace with your live domain before deploying ─────────── */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";

/* ═══════════════════════════════════════════════════════════════
   METADATA
   metadataBase is required by Next.js 14 to resolve relative
   URLs in openGraph.images and twitter.images to absolute URLs.
═══════════════════════════════════════════════════════════════ */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "ELLIE | The Style Refresh",
    template: "%s | ELLIE",
  },

  description:
    "The Style Refresh is a private $19/month membership delivering three complete, " +
    "sourced looks to your inbox every Monday — with direct buy links to every item. " +
    "A 20-year veteran consultant. No algorithms. No feeds. Just the edit that matters.",

  keywords: [
    "personal stylist",
    "private style membership",
    "women's fashion subscription",
    "curated fashion buy links",
    "Hamptons style",
    "weekly lookbook",
    "executive style consultant",
    "the style refresh",
    "fashion subscription newsletter",
    "direct buy links clothing",
    "women's fashion curation",
    "Monday style brief",
  ],

  /* ── Open Graph ── */
  openGraph: {
    type:        "website",
    url:         BASE_URL,
    siteName:    "ELLIE",
    title:       "ELLIE | The Style Refresh",
    description:
      "Three complete looks. Direct buy links. Every Monday. " +
      "Private $19/month membership — cancel anytime.",
    images: [
      {
        url:    "/opengraph-image",
        width:  1200,
        height: 630,
        alt:    "Ellie — The Style Refresh. Curated looks with direct buy links.",
      },
    ],
  },

  /* ── Twitter / X card ── */
  twitter: {
    card:        "summary_large_image",
    title:       "ELLIE | The Style Refresh",
    description:
      "Three complete looks. Direct buy links. Every Monday. " +
      "Private $19/month membership.",
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
  themeColor:     "#EDE5D8",
};

/* ═══════════════════════════════════════════════════════════════
   ROOT LAYOUT
═══════════════════════════════════════════════════════════════ */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-ellie-build="style-refresh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <CookieBanner />
        {/* Skimlinks auto-monetises every outbound retail link on the site.
            Sign up at skimlinks.com → get your Publisher ID → add SKIMLINKS_PUBLISHER_ID to Vercel env vars.
            Zero configuration after that — it handles 50,000+ retailers automatically. */}
        {process.env.SKIMLINKS_PUBLISHER_ID && (
          <script
            async
            src={`https://s.skimresources.com/js/${process.env.SKIMLINKS_PUBLISHER_ID}X.skimlinks.js`}
          />
        )}
      </body>
    </html>
  );
}

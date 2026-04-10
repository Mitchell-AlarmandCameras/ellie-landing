import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import Script from "next/script";

const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stylebyellie.com";
const GA_ID     = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;   // e.g. G-XXXXXXXXXX
const GSC_TOKEN = process.env.GOOGLE_SITE_VERIFICATION;        // from Google Search Console

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

  /* ── Favicons ── */
  icons: {
    icon:  [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
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
/* ── Global JSON-LD: Organization + WebSite schema ───────────────────── */
const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type":       "Organization",
      "@id":         `${BASE_URL}/#organization`,
      name:          "The Style Refresh by Ellie",
      url:           BASE_URL,
      logo:          { "@type": "ImageObject", url: `${BASE_URL}/favicon.png` },
      description:
        "Private $19/month membership delivering three curated women's fashion looks " +
        "with direct buy links every Monday.",
      sameAs: [
        "https://www.instagram.com/stylebyellie",
        "https://www.pinterest.com/stylebyellie",
        "https://x.com/stylebyellie",
      ],
    },
    {
      "@type":       "WebSite",
      "@id":         `${BASE_URL}/#website`,
      url:           BASE_URL,
      name:          "ELLIE — The Style Refresh",
      description:
        "Three complete women's fashion looks with direct buy links, every Monday. " +
        "$19/month private membership.",
      publisher:     { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type":       "SearchAction",
        target:        { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/blog?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type":        "Product",
      "@id":          `${BASE_URL}/#membership`,
      name:           "The Style Refresh Membership",
      description:
        "Three complete, curated women's fashion looks with direct buy links to every item, " +
        "delivered every Monday. Includes brand, price, and link for each piece.",
      brand:          { "@id": `${BASE_URL}/#organization` },
      offers: {
        "@type":       "Offer",
        price:         "19.00",
        priceCurrency: "USD",
        priceSpecification: {
          "@type":            "UnitPriceSpecification",
          price:              "19.00",
          priceCurrency:      "USD",
          billingDuration:    1,
          billingIncrement:   1,
          unitCode:           "MON",
        },
        availability:  "https://schema.org/InStock",
        url:           `${BASE_URL}/#join`,
      },
    },
  ],
};

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

        {/* Google Search Console verification */}
        <meta name="google-site-verification" content="4gKd6v209O9t3fsyYGAmVd2-xiK99dBBUzdDonuVCUM" />

        {/* Global structured data — tells Google exactly what this site is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>

      <body>
        {children}
        <CookieBanner />

        {/* Skimlinks auto-monetises every outbound retail link.
            Add SKIMLINKS_PUBLISHER_ID to Vercel env vars to activate. */}
        {process.env.SKIMLINKS_PUBLISHER_ID && (
          <script
            async
            src={`https://s.skimresources.com/js/${process.env.SKIMLINKS_PUBLISHER_ID}X.skimlinks.js`}
          />
        )}

        {/* Google Analytics 4 — add NEXT_PUBLIC_GA_MEASUREMENT_ID to Vercel env vars to activate */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  anonymize_ip: true
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}

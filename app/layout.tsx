import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

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
    "sourced looks to your inbox every Monday — every item named by brand and price. " +
    "A 20-year veteran consultant. No algorithms. No feeds. Just the edit that matters.",

  keywords: [
    "personal stylist",
    "private style membership",
    "women's fashion subscription",
    "editorial fashion curation",
    "Hamptons style",
    "weekly lookbook",
    "executive style consultant",
    "the style refresh",
    "fashion subscription newsletter",
    "women's fashion editorial",
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
      "Three complete looks. Every item by brand and price. Every Monday. " +
      "Private $19/month membership — cancel anytime.",
    images: [
      {
        url:    "/opengraph-image",
        width:  1200,
        height: 630,
        alt:    "Ellie — The Style Refresh. Three curated looks every Monday.",
      },
    ],
  },

  /* ── Twitter / X card ── */
  twitter: {
    card:        "summary_large_image",
    title:       "ELLIE | The Style Refresh",
    description:
      "Three complete looks. Every item named by brand and price. Every Monday. " +
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
        "every Monday — every item named by brand and price.",
      sameAs: [
        "https://www.instagram.com/elliestylerefresh",
        "https://www.facebook.com/profile.php?id=61574230690395",
        "https://www.pinterest.com/elliestylerefresh",
      ],
    },
    {
      "@type":       "WebSite",
      "@id":         `${BASE_URL}/#website`,
      url:           BASE_URL,
      name:          "ELLIE — The Style Refresh",
      description:
        "Three complete women's fashion looks, every item by brand and price, every Monday. " +
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
        "Three complete, curated women's fashion looks delivered every Monday. " +
        "Includes brand, price, and Ellie's sourcing note for each piece.",
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
        <meta name="google-site-verification" content="ZEIuovs8zArOtaFG5_lmeW-cRdWe44REnVc6wKHvZRA" />

        {/* Pinterest domain verification */}
        <meta name="p:domain_verify" content="b4adb01e199c467ae5948cc76b868ca7" />

        {/* Google Analytics 4 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-RRE593QHX2" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-RRE593QHX2', { anonymize_ip: true });
            `,
          }}
        />

        {/* Global structured data — tells Google exactly what this site is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>

      <body>
        {/* ── Ellie Collection cross-site bar ──────────────────────────── */}
        <div
          style={{
            backgroundColor: "#F5EFE3",
            borderBottom: "1px solid rgba(80,50,20,0.10)",
            padding: "0 20px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            position: "sticky",
            top: 0,
            zIndex: 55,
          }}
        >
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              color: "#7A5C3A",
              opacity: 0.6,
              fontWeight: 500,
            }}
          >
            By Ellie
          </span>
          <span style={{ color: "#C8A87A", fontSize: "10px" }}>·</span>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#3D2B1F",
              fontWeight: 700,
            }}
          >
            The Style Refresh
          </span>
          <span style={{ color: "#C8A87A", fontSize: "10px" }}>·</span>
          <a
            href="https://skincarebyellie.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7A5C3A",
              fontWeight: 500,
              textDecoration: "none",
              borderBottom: "1px solid rgba(122,92,58,0.35)",
              paddingBottom: "1px",
            }}
          >
            Skincare by Ellie ↗
          </a>
        </div>

        {children}
        <CookieBanner />

        {/* Skimlinks auto-monetises every outbound retail link.
            Add SKIMLINKS_PUBLISHER_ID to Vercel env vars to activate. */}
        <script
          type="text/javascript"
          src="https://s.skimresources.com/js/301293X1789234.skimlinks.js"
          async
        />
      </body>
    </html>
  );
}
